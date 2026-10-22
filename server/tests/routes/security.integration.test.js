const realFetch = global.fetch;
require('../support/isolatedDependencies');
const { test, mock } = require('node:test');
mock.method(require('../../app/api/v1/services/errorLogService'), 'logBackendError', async () => null);
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { User, Space, Product, Booking, Order } = require('../../app/api/v1/models');
const config = require('../../app/config/config');
const { errorConverter, errorHandler } = require('../../app/api/v1/middleware/errorHandler');

test('Security Penetration Verification Test Suite', { timeout: 60000 }, async t => {
    await require('../support/database').connect(t);

    const admin = await User.create({ name: 'Admin', email: 'admin-sec@example.test', role: 'admin' });
    const ownerA = await User.create({ name: 'Owner A', email: 'owner-a@example.test', role: 'space' });
    const ownerB = await User.create({ name: 'Owner B', email: 'owner-b@example.test', role: 'space' });
    const customer = await User.create({ name: 'Customer', email: 'user-sec@example.test', role: 'user' });

    const spaceA = await Space.create({ user_id: ownerA._id, name: 'Space A', rate_hour: 100, capacity: 20 });
    const spaceB = await Space.create({ user_id: ownerB._id, name: 'Space B', rate_hour: 200, capacity: 10 });

    const productA = await Product.create({ space_id: spaceA._id, name: 'Coffee', category: 'beverage', price: 150, stock: 10, is_available: true });

    // Mount full express application with security headers and middleware
    const app = express();
    app.set('trust proxy', 1);
    app.disable('x-powered-by');

    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });

    app.use(express.json({
        limit: '2mb',
        verify: (req, res, buf) => {
            req.rawBody = buf;
        }
    }));

    const authRoutes = require('../../app/api/v1/routes/authRoutes');
    const spaceRoutes = require('../../app/api/v1/routes/spaceRoutes');
    const landingRoutes = require('../../app/api/v1/routes/landingRoutes');
    const userRoutes = require('../../app/api/v1/routes/userRoutes');
    const blogRoutes = require('../../app/api/v1/routes/blogRoutes');
    const apiRoutes = require('../../app/api/v1/routes/routes');

    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/space', spaceRoutes);
    app.use('/api/v1/landing', landingRoutes);
    app.use('/api/v1/user', userRoutes);
    app.use('/api/v1/blogs', blogRoutes);
    app.use('/api/v1', apiRoutes);

    app.use(errorConverter, errorHandler);

    const server = await new Promise(resolve => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    t.after(() => new Promise(resolve => {
        server.closeAllConnections();
        server.close(resolve);
    }));

    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    const tokens = {
        admin: jwt.sign({ sub: String(admin._id), id: String(admin._id), role: 'admin' }, config.jwt.secret),
        ownerA: jwt.sign({ sub: String(ownerA._id), id: String(ownerA._id), role: 'space' }, config.jwt.secret),
        ownerB: jwt.sign({ sub: String(ownerB._id), id: String(ownerB._id), role: 'space' }, config.jwt.secret),
        customer: jwt.sign({ sub: String(customer._id), id: String(customer._id), role: 'user' }, config.jwt.secret)
    };

    const request = async (path, tokenKey = null, method = 'GET', body = null, headers = {}) => {
        const reqHeaders = {
            'Content-Type': 'application/json',
            ...(tokenKey ? { Authorization: `Bearer ${tokens[tokenKey]}` } : {}),
            ...headers
        };
        const res = await realFetch(base + path, {
            method,
            headers: reqHeaders,
            body: body ? JSON.stringify(body) : undefined
        });
        let data = null;
        try {
            data = await res.json();
        } catch (e) {
            data = null;
        }
        return { status: res.status, headers: res.headers, body: data };
    };

    // 1. Security Headers Verification
    await t.test('Security headers (nosniff, DENY, Referrer-Policy) are present on HTTP responses', async () => {
        const res = await request('/landing/explorer');
        assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(res.headers.get('x-frame-options'), 'DENY');
        assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    });

    // 2. FLEX-01: NoSQL Operator Injection
    await t.test('FLEX-01: NoSQL operator injection in forgot-password is rejected with 400', async () => {
        const res1 = await request('/auth/forgot-password', null, 'POST', { email: { $ne: null } });
        assert.equal(res1.status, 400);

        const res2 = await request('/auth/forgot-password', null, 'POST', { email: { $regex: '^a' } });
        assert.equal(res2.status, 400);

        const res3 = await request('/auth/verify-otp', null, 'POST', { email: { $ne: null }, otp: '123456' });
        assert.equal(res3.status, 400);

        const res4 = await request('/auth/reset-password', null, 'POST', { resetToken: { $ne: null }, newPassword: 'Password123!' });
        assert.equal(res4.status, 400);
    });

    // 3. C2 & FLEX-42: Payment Webhook Signature and Space Router Role Gate
    await t.test('C2: Unsigned and unverified payment webhooks return 401', async () => {
        const res = await request('/space/payment-webhook', null, 'POST', { event: 'payment.paid' });
        assert.equal(res.status, 401);
    });

    await t.test('FLEX-42: /space routes enforce role gate (customer role rejected with 403)', async () => {
        const res = await request('/space/staff', 'customer', 'GET');
        assert.equal(res.status, 403);
    });

    // 4. FLEX-10: POS Pricing Recalculation
    await t.test('FLEX-10: Client-trusted amounts on POS order are ignored and calculated from DB products', async () => {
        const res = await request('/space/orders', 'ownerA', 'POST', {
            space_id: spaceA._id.toString(),
            items: [{ product_id: productA._id.toString(), quantity: 2, price: 1 }],
            subtotal: 2,
            total: 2,
            payment_method: 'cash',
            amount_received: 300
        });
        assert.equal(res.status, 201);
        assert.equal(res.body.data.subtotal, 300); // 2 * 150
        assert.equal(res.body.data.total, 300);
    });

    // 5. FLEX-11: Tenant Isolation on Fix Payment
    await t.test('FLEX-11: Owner B cannot fix or claim earnings for Owner A order', async () => {
        const orderA = await Order.create({
            space_id: spaceA._id,
            order_number: `ORD-SEC-TENANT-${Date.now()}`,
            items: [{ product_id: productA._id, name: 'Coffee', quantity: 1, price: 150 }],
            subtotal: 150,
            total: 150,
            payment_method: 'cash',
            amount_received: 150,
            customer_name: 'Walk-in',
            status: 'confirmed',
            payment_status: 'paid'
        });

        const res = await request(`/space/orders/${orderA._id}/fix-payment`, 'ownerB', 'POST', {});
        assert.equal(res.status, 403);
    });

    // 6. FLEX-17 & FLEX-43: Staff Isolation and Space Ownership
    await t.test('FLEX-17: Space owner cannot create staff assigned to another tenant space', async () => {
        const res = await request('/space/staff', 'ownerA', 'POST', {
            name: 'Malicious Staff',
            email: 'malicious-staff@example.test',
            space_id: spaceB._id.toString()
        });
        assert.equal(res.status, 403);
    });

    // 7. FLEX-13: Mass-assignment protection on space updates
    await t.test('FLEX-13: user_id is ignored when updating space', async () => {
        const res = await request(`/space/spaces/${spaceA._id}/update`, 'ownerA', 'POST', {
            name: 'Updated Space A',
            user_id: ownerB._id.toString()
        });
        assert.equal(res.status, 200);
        const refreshed = await Space.findById(spaceA._id);
        assert.equal(refreshed.user_id.toString(), ownerA._id.toString());
    });

    // 8. M5: Anonymous access to booking review returns 404 without token
    await t.test('M5: Anonymous review lookup without token returns 404', async () => {
        const booking = await Booking.create({
            user_id: customer._id,
            space_id: spaceA._id,
            total_amount: 500,
            status: 'completed',
            ticket_number: `SEC-TICKET-${Date.now()}`
        });

        const res = await request(`/space/booking/${booking._id}/review`, null, 'GET');
        assert.equal(res.status, 404);
    });

    // 9. C5: Blog generator secret key protection
    await t.test('C5: Blog generation endpoint rejects invalid and unauthorized requests', async () => {
        const res1 = await request('/blogs/generate', null, 'POST', {}, { 'x-api-key': 'invalid-attacker-key' });
        assert.equal(res1.status, 401);

        const res2 = await request('/blogs/generate', null, 'POST', {});
        assert.equal(res2.status, 401);
    });

    // 10. Public Open Email Relay Removed
    await t.test('FLEX-05: Public unauthenticated email routes are removed', async () => {
        const res = await request('/email/welcome', null, 'POST', { to: 'victim@example.test' });
        assert.equal(res.status, 404);
    });

    // 11. C4: Stored XSS prevention via HTML sanitization
    await t.test('C4: Dangerous script tags and event handlers are stripped during blog formatting', async () => {
        const aiBlogService = require('../../app/api/v1/services/aiBlogGeneratorService');
        const malicious = 'Insight <script>alert(1)</script><img src="x" onerror="evil()"><a href="javascript:steal()">link</a>';
        const cleaned = aiBlogService.formatBlogContent(malicious, 'weekly_insights');
        assert.ok(!cleaned.includes('<script>'));
        assert.ok(!cleaned.includes('onerror='));
        assert.ok(!cleaned.includes('javascript:'));
    });

    // 12. H3: Analytics endpoint sanitization
    await t.test('H3: Analytics tracking validates input boundaries safely', async () => {
        const res = await request('/analytics/track', null, 'POST', {
            path: '/safe-path',
            deviceType: 'desktop',
            browser: 'Chrome',
            os: 'Linux'
        });
        assert.equal(res.status, 200);
    });

    // 13. C2: HMAC-SHA256 Webhook Verification & Tamper Resistance
    await t.test('C2: Payment webhook verifies valid HMAC-SHA256 and rejects tampered signatures', async () => {
        const crypto = require('crypto');
        const testSecret = 'sec_pentest_webhook_secret_key_123';
        process.env.PAYMENT_WEBHOOK_SECRET = testSecret;

        const payload = JSON.stringify({
            event: 'payment.succeeded',
            data: { order_number: 'ORD-NONEXISTENT', id: 'pi_test_123' }
        });

        const validSignature = crypto.createHmac('sha256', testSecret).update(payload).digest('hex');

        // Request with valid signature (should pass auth check; returns 200 or 400 for unknown order, not 401)
        const validRes = await realFetch(base + '/space/payment-webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-paymongo-signature': validSignature
            },
            body: payload
        });
        assert.notEqual(validRes.status, 401, 'Valid signature must not return 401 Unauthorized');

        // Request with tampered payload / forged signature returns 401
        const tamperedRes = await realFetch(base + '/space/payment-webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-paymongo-signature': '0000000000000000000000000000000000000000000000000000000000000000'
            },
            body: payload
        });
        assert.equal(tamperedRes.status, 401, 'Forged signature must return 401 Unauthorized');
    });

    // 14. FLEX-35: Mass-assignment protection on product updates
    await t.test('FLEX-35: Product update strips space_id to prevent cross-tenant object reassignment', async () => {
        const res = await request(`/space/products/${productA._id}`, 'ownerA', 'PUT', {
            name: 'Renamed Coffee',
            space_id: spaceB._id.toString()
        });
        assert.equal(res.status, 200);

        const refreshedProduct = await Product.findById(productA._id);
        assert.equal(refreshedProduct.name, 'Renamed Coffee');
        assert.equal(refreshedProduct.space_id.toString(), spaceA._id.toString(), 'space_id must remain unchanged');
    });

    // 15. M4: File upload magic bytes validation
    await t.test('M4: Upload utility enforces genuine magic byte signatures and rejects forged files', async () => {
        const { isValidMagicBytes } = require('../../app/api/v1/utils/upload');

        const validJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
        const validPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        const validGif = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
        const validPdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35]);
        const validWebp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

        assert.equal(isValidMagicBytes(validJpeg), true, 'JPEG magic bytes must be accepted');
        assert.equal(isValidMagicBytes(validPng), true, 'PNG magic bytes must be accepted');
        assert.equal(isValidMagicBytes(validGif), true, 'GIF magic bytes must be accepted');
        assert.equal(isValidMagicBytes(validPdf), true, 'PDF magic bytes must be accepted');
        assert.equal(isValidMagicBytes(validWebp), true, 'WebP magic bytes must be accepted');

        const maliciousScript = Buffer.from('<?php phpinfo(); ?>');
        const maliciousHtml = Buffer.from('<html><script>alert(1)</script></html>');
        const peExecutable = Buffer.from([0x4D, 0x5A, 0x90, 0x00]);
        const tinyGarbage = Buffer.from([0x01, 0x02]);

        assert.equal(isValidMagicBytes(maliciousScript), false, 'PHP script must be rejected');
        assert.equal(isValidMagicBytes(maliciousHtml), false, 'HTML/Script must be rejected');
        assert.equal(isValidMagicBytes(peExecutable), false, 'PE executable must be rejected');
        assert.equal(isValidMagicBytes(tinyGarbage), false, 'Short buffer must be rejected');
    });

    // 16. FLEX-09: Defense against missing check_in_at epoch billing calculation
    await t.test('FLEX-09: Billing calculation requires check_in_at and prevents epoch time calculation', async () => {
        const billingService = require('../../app/api/v1/services/bookingBillingService');
        assert.throws(
            () => billingService.calculateRoomCharge({ booking_type: 'online', rate_per_hour: 100 }),
            /No check-in recorded/
        );
    });
});
