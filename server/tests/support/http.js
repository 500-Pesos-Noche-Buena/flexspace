const assert = require('node:assert/strict');
const id = '507f1f77bcf86cd799439011';
function request(overrides = {}) {
    return { user: { sub: id, id, _id: id, role: 'admin', name: 'Test user', email: 'test@example.test' },
        params: { id, spaceId: id, roomId: id, bookingId: id, orderId: id, userId: id, reviewId: id, voucherId: id, slug: 'missing', orderNumber: 'TEST-MISSING', queueName: 'email', jobId: 'missing' },
        query: {}, body: {}, headers: {}, files: [], session: { destroy(cb) { cb(); } },
        connection: { remoteAddress: '127.0.0.1' }, socket: { remoteAddress: '127.0.0.1' }, get() { return 'test'; }, protocol: 'http', originalUrl: '/test', method: 'GET', ip: '127.0.0.1',
        ...overrides };
}
async function invoke(controller, method, req = request()) {
    const result = { status: 200, body: undefined, error: undefined, sent: false, headers: {} };
    const res = {
        status(code) { result.status = code; return this; },
        json(body) { result.body = body; result.sent = true; return this; },
        send(body) { result.body = body; result.sent = true; return this; },
        redirect(url) { result.status = 302; result.body = url; result.sent = true; return this; },
        setHeader(key, value) { result.headers[key] = value; return this; },
        set(key, value) { return this.setHeader(key, value); },
        clearCookie() { return this; }, cookie() { return this; },
        end() { result.sent = true; return this; }
    };
    try { result.returned = await controller[method](req, res, error => { result.error = error; }); }
    catch (error) { result.thrown = error; }
    return result;
}
function expectStatus(result, status) {
    assert.equal(result.thrown, undefined, result.thrown?.stack);
    if (status < 400) assert.equal(result.error, undefined, result.error?.stack);
    assert.equal(result.error?.statusCode || result.status, status, result.error?.stack || JSON.stringify(result.body));
    if (!result.error) assert.equal(result.sent, true, 'Controller must send a response');
}
module.exports = { request, invoke, expectStatus, id };
