// Run against ONLY the isolated localhost replica set described in docs/room-consumable-flow.md.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('module-alias').addAlias('@', path.resolve(__dirname, '../../app'));
const mongoose = require('mongoose');
const flow = require('../../app/api/v1/services/bookingOrderService');
const billing = require('../../app/api/v1/services/bookingBillingService');
const { Booking, Order, Product, Space, User, Payment, Earnings } = require('../../app/api/v1/models');

test('booking / walk-in consumables and atomic settlement', { skip: process.env.RUN_BOOKING_DB_TESTS !== '1', timeout: 60000 }, async t => {
    const configured = process.env.FLEXSPACE_TEST_RUN === '1';
    const base = configured ? process.env.MONGODB_DB_NAME : 'flexspace_booking_test';
    if (!base || !/(^|_)test($|_)/i.test(base)) throw new Error('Tests require a test database name in .env.test.');
    const dbName = `${base}_run_${Date.now()}_${process.pid}`;
    const uri = (configured ? process.env.MONGODB_URI : 'mongodb://127.0.0.1:27931/?replicaSet=flexspaceBookingTest')?.replace('localhost', '127.0.0.1');
    if (!uri) throw new Error('Set MONGODB_URI in server/.env.test.');
    try {
        await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000, autoIndex: false });
    } catch (error) {
        await mongoose.disconnect();
        throw new Error(`Cannot connect to the .env.test MongoDB replica set (${error.name}). Start MongoDB before running npm test.`);
    }
    t.after(async () => {
        if (mongoose.connection.name === dbName && dbName.startsWith(`${base}_run_`)) await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    assert.ok(hello.setName || hello.msg === 'isdbgrid', 'MongoDB must run as a replica set for transaction tests.');
    await Promise.all(Object.values(mongoose.models).map(model => model.createCollection()));
    await Order.createIndexes();
    const owner = new mongoose.Types.ObjectId();
    const otherOwner = new mongoose.Types.ObjectId();
    const user = new mongoose.Types.ObjectId();
    const space = new mongoose.Types.ObjectId();
    const foreignSpace = new mongoose.Types.ObjectId();
    const staff = new mongoose.Types.ObjectId();
    await Space.collection.insertMany([{ _id: space, user_id: owner, name: 'Test branch', rate_hour: 300 }, { _id: foreignSpace, user_id: otherOwner, name: 'Foreign branch' }]);
    await User.collection.insertMany([{ _id: user, name: 'Guest', points: 0 }, { _id: staff, parent_id: owner, space_id: space }]);
    const food = await Product.create({ space_id: space, name: 'Food', category: 'food', price: 200, stock: 100 });
    const foreign = await Product.create({ space_id: foreignSpace, name: 'Foreign food', category: 'food', price: 1, stock: 100 });
    async function session(type = 'walkin', allowance = 700) {
        return Booking.create({ booking_type: type, bookable_type: 'space', space_id: space, user_id: user,
            guest_name: 'Guest', status: 'active', is_open_time: true, check_in_at: new Date(Date.now() - 7200000),
            rate_per_hour: 300, consumable_allowance: allowance, promo_snapshot: { promo_name: 'Two hours', promo_duration_hours: 2, promo_price: 1000 },
            ticket_number: `TEST-${new mongoose.Types.ObjectId()}` });
    }
    function req(booking, key, quantity = 1) {
        return { user: { sub: owner, role: 'space' }, params: { id: String(booking._id) }, query: {},
            body: { booking_id: String(booking._id), space_id: String(space), request_key: key,
                items: [{ product_id: String(food._id), quantity, price: 0 }], total: 0 } };
    }
    await t.test('₱600 is covered; another ₱200 produces ₱100 excess; retries do not duplicate stock or orders', async () => {
        const booking = await session();
        const firstReq = req(booking, 'first-order-123', 3);
        const first = await flow.addOrder(firstReq);
        const same = await flow.addOrder(firstReq);
        assert.equal(String(first._id), String(same._id));
        let bill = await billing.calculateConsumables(booking);
        assert.equal(bill.consumable_total, 600);
        assert.equal(bill.consumable_excess, 0);
        await flow.addOrder(req(booking, 'second-order-123'));
        bill = await billing.calculateConsumables(booking);
        assert.equal(bill.consumable_total, 800);
        assert.equal(bill.consumable_covered, 700);
        assert.equal(bill.consumable_excess, 100);
        assert.equal(await Payment.countDocuments({}), 0);
        assert.equal(await Earnings.countDocuments({}), 0);
        const frozen = await flow.freeze(req(booking));
        assert.equal(frozen.booking.consumable_excess, 100);
        assert.equal(frozen.booking.billing_orders.length, 2);
        assert.equal(frozen.booking.status, 'pending_payment');
        await assert.rejects(flow.addOrder(req(booking, 'after-freeze-123')));
        await assert.rejects(flow.updateOrder(first._id, 'cancelled'));
        const short = req(booking); short.body = { payment_method: 'cash', amount_received: 1 };
        await assert.rejects(flow.settle(short));
        assert.equal(await Payment.countDocuments({}), 0);
        const checkout = req(booking); checkout.body = { payment_method: 'cash', amount_received: 2000 };
        const results = await Promise.all([flow.settle(checkout), flow.settle(checkout)]);
        assert.equal(results[0].status, 'completed');
        assert.equal(String(results[0].settlement_payment_id), String(results[1].settlement_payment_id));
        assert.equal(await Payment.countDocuments({ booking_id: booking._id }), 1);
        assert.equal(await Earnings.countDocuments({ booking_id: booking._id }), 1);
        assert.equal(await Order.countDocuments({ booking_id: booking._id, payment_status: 'paid' }), 2);
        assert.equal((await Product.findById(food._id)).stock, 96);
    });
    await t.test('reports include linked consumables once, preserve customer names, and paginate the combined ledger', async () => {
        const reports = require('../../app/api/v1/controllers/space/earningController');
        const totals = require('../../app/api/v1/controllers/space/totalOrdersController');
        const request = { user: { sub: owner, role: 'space' }, query: { period: 'daily' } };
        let report = await reports.report(request);
        assert.equal(report.transactions.length, 1);
        assert.equal(report.transactions[0].guest, 'Guest');
        assert.equal(report.breakdown.consumables.count, 2);
        assert.equal(report.breakdown.consumables.total, 800);
        assert.equal(report.breakdown.consumables.covered, 700);
        assert.equal(report.breakdown.consumables.excess, 100);
        const bookingRevenue = report.totalRevenue;
        let response;
        const res = { status() { return this; }, json(value) { response = value; }, setHeader() {}, send(value) { response = value; } };
        const next = error => { throw error; };
        await totals.getTotalOrders(request, res, next);
        assert.equal(response.data.stats.pos_orders, 2);
        assert.equal(response.data.orders[0].grouped_orders[0].linked_orders.length, 2);
        assert.equal(response.data.orders[0].total, bookingRevenue);
        await totals.getTotalOrders({ ...request, query: { type: 'pos' } }, res, next);
        assert.equal(response.data.stats.pos_orders, 2);
        assert.equal(response.data.orders[0].grouped_orders[0].linked_orders.length, 2);
        const pos = require('../../app/api/v1/controllers/space/posController');
        await pos.getOrders(request, res, next);
        assert.ok(response.data[0].booking_id.ticket_number.startsWith('TEST-'));
        assert.equal(response.data[0].customer_name, 'Guest');
        const standalone = await Order.create({ space_id: space, customer_name: 'Standalone guest', order_type: 'pos',
            payment_method: 'cash', amount_received: 200, status: 'completed', payment_status: 'paid', items: [{ product_id: food._id, name: 'Food', quantity: 1, price: 200 }], subtotal: 200, total: 200 });
        report = await reports.report(request);
        assert.equal(report.totalRevenue, bookingRevenue + 200);
        assert.equal(report.breakdown.pos_orders.count, 1);
        assert.equal(report.total, 2);
        await reports.index({ ...request, query: { page: 2, limit: 1 } }, res, next);
        assert.equal(response.data.total, 2);
        assert.equal(response.data.transactions.length, 1);
        await reports.index({ ...request, query: { page: 2, limit: 1, export_all: 'true' } }, res, next);
        assert.equal(response.data.transactions.length, 2);
        await reports.exportCSV(request, res, next);
        assert.equal(response.split('\r\n').length, 3);
        assert.ok(response.includes('Booking + consumables'));
        const searched = await reports.report({ ...request, query: { search: 'Standalone guest' } });
        assert.equal(searched.total, 1);
        assert.equal(searched.totalRevenue, 200);
    });
    await t.test('₱900 allowance and ₱1050 products charge only ₱150 extra', async () => {
        const booking = await session('walkin', 900);
        const request = req(booking, 'allowance-900', 6);
        request.body.discount_type = 'fixed'; request.body.discount_value = 150;
        await flow.addOrder(request);
        const bill = await billing.calculateConsumables(booking);
        assert.equal(bill.consumable_total, 1050);
        assert.equal(bill.consumable_covered, 900);
        assert.equal(bill.consumable_excess, 150);
    });
    await t.test('online sessions, simultaneous orders, cancellation and no promo', async () => {
        const booking = await session('online', 0);
        const orders = await Promise.all([flow.addOrder(req(booking, 'concurrent-a')), flow.addOrder(req(booking, 'concurrent-b'))]);
        assert.equal((await Booking.findById(booking._id)).consumable_excess, 400);
        await flow.updateOrder(orders[0]._id, 'cancelled');
        assert.equal((await billing.calculateConsumables(booking)).consumable_total, 200);
        await assert.rejects(flow.updateOrder(orders[0]._id, 'confirmed'));
        await flow.updateOrder(orders[1]._id, 'completed');
        assert.equal((await Order.findById(orders[1]._id)).payment_status, 'unpaid');
    });
    await t.test('exact allowance, deposits, vouchers, and frozen bill retries', async () => {
        const booking = await session('online');
        const request = req(booking, 'exact-allowance', 4);
        request.body.discount_type = 'fixed';
        request.body.discount_value = 100;
        await flow.addOrder(request);
        assert.equal((await billing.calculateConsumables(booking)).consumable_excess, 0);
        await Payment.create({ booking_id: booking._id, method: 'cash', amount_total: 100,
            amount_received: 100, status: 'completed' });
        const frozen = await flow.freeze(req(booking));
        const Voucher = require('../../app/api/v1/models/schema/Voucher');
        await Voucher.create({ code: 'TEST-DISCOUNT', discount_amount: 50, expiry_date: new Date(Date.now() + 86400000) });
        const voucherReq = req(booking); voucherReq.body = { voucherCode: 'TEST-DISCOUNT' };
        const discounted = await flow.applyVoucher(voucherReq);
        assert.equal(discounted.booking.total_amount, frozen.booking.total_amount - 50);
        assert.equal(discounted.booking.amount_due, frozen.booking.total_amount - 150);
        const again = await flow.freeze(req(booking));
        assert.equal(again.booking.total_amount, discounted.booking.total_amount);
        assert.equal(String(again.booking.check_out_at), String(frozen.booking.check_out_at));
        const checkout = req(booking); checkout.body = { payment_method: 'cash', amount_received: discounted.booking.amount_due };
        const result = await flow.settle(checkout);
        assert.equal(result.payment.amount_total, discounted.booking.amount_due);
        assert.equal(result.payment.change, 0);
        await assert.rejects(flow.applyVoucher(voucherReq));
    });
    await t.test('zero balance settles and duplicate simultaneous requests create one order', async () => {
        const booking = await session();
        const request = req(booking, 'simultaneous-retry');
        const results = await Promise.all([flow.addOrder(request), flow.addOrder(request)]);
        assert.equal(String(results[0]._id), String(results[1]._id));
        await Booking.updateOne({ _id: booking._id }, { 'promo_snapshot.promo_price': 0, 'promo_snapshot.promo_duration_hours': 24 });
        const bill = await flow.freeze(req(booking));
        assert.equal(bill.booking.total_amount, 0);
        const checkout = req(booking); checkout.body = { payment_method: 'cash', amount_received: 0 };
        assert.equal((await flow.settle(checkout)).amount_due, 0);
    });
    await t.test('order racing checkout is either included or rejected, never lost', async () => {
        const booking = await session();
        const results = await Promise.allSettled([flow.addOrder(req(booking, 'racing-checkout')), flow.freeze(req(booking))]);
        assert.equal(results[1].status, 'fulfilled');
        const stored = await Booking.findById(booking._id);
        const orderCount = await Order.countDocuments({ booking_id: booking._id });
        assert.equal(stored.billing_orders.length, orderCount);
        assert.equal(stored.consumable_total, results[0].status === 'fulfilled' ? 200 : 0);
    });
    await t.test('new walk-ins save the selected room promo or regular pricing', async () => {
        const Room = require('../../app/api/v1/models/schema/Room');
        const room = await Room.create({ space_id: space, name: 'Promo room', rate_hour: 300, capacity: 4,
            has_consumable_promo: true, consumable_allowance: 700, promo_name: 'Two hours', promo_duration_hours: 2, promo_price: 1000 });
        const walkins = require('../../app/api/v1/controllers/space/walkinController');
        const request = { user: { sub: owner, role: 'space' }, body: { space_id: String(space), room_id: String(room._id),
            name: 'Promo choice guest', is_open_time: true, use_consumable_promo: false } };
        const res = { status() { return this; }, json() {} };
        const next = error => { throw error; };
        await walkins.store(request, res, next);
        let saved = await Booking.findOne({ guest_name: 'Promo choice guest' }).lean();
        assert.equal(saved.consumable_allowance, 0);
        assert.equal(saved.promo_snapshot, null);
        request.body.name = 'Promo enabled guest'; request.body.use_consumable_promo = true;
        await walkins.store(request, res, next);
        saved = await Booking.findOne({ guest_name: 'Promo enabled guest' }).lean();
        assert.equal(saved.consumable_allowance, 700);
        assert.equal(saved.promo_snapshot.promo_price, 1000);
    });
    await t.test('pax rate is saved on a walk-in and remains fixed after room edits', async () => {
        const Room = require('../../app/api/v1/models/schema/Room');
        const room = await Room.create({ space_id: space, name: 'Pax room', capacity: 10, rate_hour: 100,
            hourly_rates: [{ min_pax: 1, max_pax: 5, rate_hour: 150 }, { min_pax: 6, max_pax: 10, rate_hour: 180 }] });
        const walkins = require('../../app/api/v1/controllers/space/walkinController');
        const request = { user: { sub: owner, role: 'space' }, body: { space_id: String(space), room_id: String(room._id),
            name: 'Six guests', guest_count: 6, is_open_time: true, use_consumable_promo: false, rate_per_hour: 1 } };
        const res = { status() { return this; }, json() {} };
        const next = error => { throw error; };
        await walkins.store(request, res, next);
        let saved = await Booking.findOne({ guest_name: 'Six guests' }).lean();
        assert.equal(saved.guest_count, 6);
        assert.equal(saved.rate_per_hour, 180);
        await Room.updateOne({ _id: room._id }, { $set: { 'hourly_rates.1.rate_hour': 999 } });
        saved = await Booking.findById(saved._id).lean();
        assert.equal(saved.rate_per_hour, 180);
        request.body.guest_count = 11;
        await assert.rejects(walkins.store(request, res, next), /capacity/);
    });
    await t.test('900 package minus 150 room leaves 750 credit; 1000 food settles once for 1150', async () => {
        const promo = require('../../app/api/v1/services/roomPromoService').snapshot({ has_consumable_promo: true,
            promo_name: 'Two hours', promo_price: 900, promo_duration_hours: 2, rate_hour: 150 });
        const booking = await Booking.create({ booking_type: 'walkin', bookable_type: 'space', space_id: space,
            guest_name: 'Deduction example', status: 'active', is_open_time: true,
            check_in_at: new Date(Date.now() - 3600000), rate_per_hour: 150, ...promo,
            ticket_number: `DEDUCTION-${new mongoose.Types.ObjectId()}` });
        await flow.addOrder(req(booking, 'deduction-example', 5));
        const frozen = await flow.freeze(req(booking));
        assert.equal(frozen.booking.room_charge, 900);
        assert.equal(frozen.booking.consumable_total, 1000);
        assert.equal(frozen.booking.consumable_covered, 750);
        assert.equal(frozen.booking.consumable_excess, 250);
        assert.equal(frozen.booking.total_amount, 1150);
        const payment = req(booking); payment.body = { payment_method: 'cash', amount_received: 1200 };
        await flow.settle(payment);
        await flow.settle(payment);
        assert.equal(await Payment.countDocuments({ booking_id: booking._id }), 1);
        const earning = await Earnings.findOne({ booking_id: booking._id });
        assert.equal(earning.total_amount, 1150);
        const order = await Order.findOne({ booking_id: booking._id });
        assert.equal(order.payment_status, 'paid');
    });
    await t.test('reports count linked orders and reconcile collected money without double counting', async () => {
        const { invoke, expectStatus } = require('../support/http');
        const request = { user: { sub: owner, role: 'space' }, query: { period: 'daily', limit: '1000' } };
        const report = await require('../../app/api/v1/controllers/space/earningController').report(request);
        assert.equal(report.orderCount, report.transactionCount + report.breakdown.consumables.count);
        assert.equal(report.totalRevenue, Math.round((report.breakdown.bookings.revenue + report.breakdown.pos_orders.revenue) * 100) / 100);
        const example = report.transactions.find(row => row.guest === 'Deduction example');
        assert.equal(example.amount, 1150);
        assert.equal(example.consumableTotal, 1000);
        assert.equal(example.consumableCovered, 750);
        const dashboard = await invoke(require('../../app/api/v1/controllers/space/dashboardController'), 'index', request);
        expectStatus(dashboard, 200);
        assert.equal(dashboard.body.stats.grossRevenue, report.totalRevenue);
        assert.equal(dashboard.body.stats.platformFees, report.totalPlatformFee);
        const orders = await invoke(require('../../app/api/v1/controllers/space/totalOrdersController'), 'getTotalOrders', request);
        expectStatus(orders, 200);
        const group = orders.body.data.orders.find(row => row.customer_name === 'Deduction example');
        assert.equal(group.total, 1150);
        assert.equal(group.amount_paid, 1150);
        assert.equal(group.amount_received, 1200);
        assert.equal(group.change, 50);
        assert.equal(group.order_count + group.linked_order_count, 2);
    });
    await t.test('branch ownership, active status, invalid quantities and stock are enforced', async () => {
        const booking = await session();
        const foreignReq = req(booking, 'foreign-owner'); foreignReq.user.sub = otherOwner;
        await assert.rejects(flow.addOrder(foreignReq));
        const productReq = req(booking, 'foreign-product'); productReq.body.items[0].product_id = String(foreign._id);
        await assert.rejects(flow.addOrder(productReq));
        await assert.rejects(flow.addOrder(req(booking, 'invalid-quantity', -1)));
        await assert.rejects(flow.addOrder(req(booking, 'insufficient-stock', 999)));
        await Booking.updateOne({ _id: booking._id }, { status: 'confirmed' });
        await assert.rejects(flow.addOrder(req(booking, 'not-checked-in')));
        const staffReq = req(booking); staffReq.user = { sub: staff, role: 'staff' };
        const sessions = await flow.activeSessions(staffReq);
        assert.ok(sessions.every(b => String(b.space_id._id) === String(space)));
    });
});
