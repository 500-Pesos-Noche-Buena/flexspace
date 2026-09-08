const { test } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../../app/api/v1/services/emailService');
const processEmail = require('../../app/api/v1/queues/emailProcessor');
const data = { email: 'guest@example.test', name: 'Guest', password: 'temporary', role: 'user', bookingDetails: { ticket: 'WK-TEST' }, resetToken: 'test-token' };
for (const [type, method, args] of [
    ['welcome', 'sendWelcomeEmail', [data.email, data.name, data.email, data.password, data.role]],
    ['booking_confirmation', 'sendBookingConfirmation', [data.email, data.name, data.bookingDetails]],
    ['booking_completion', 'sendBookingCompletionEmail', [data.email, data.name, data.bookingDetails]],
    ['password_reset', 'sendPasswordResetEmail', [data.email, data.name, data.resetToken]],
]) {
    test(`${type}: delivers the correct payload`, async t => {
        t.mock.method(service, method, async (...actual) => { assert.deepEqual(actual, args); return { success: true }; });
        assert.deepEqual(await processEmail({ data: { type, data } }), { success: true, type });
    });
    test(`${type}: reported delivery failure rejects the job for retry`, async t => {
        t.mock.method(service, method, async () => ({ success: false, error: 'SMTP unavailable' }));
        await assert.rejects(processEmail({ data: { type, data } }), /SMTP unavailable/);
    });
}
test('unknown email jobs reject instead of being marked delivered', async () => {
    await assert.rejects(processEmail({ data: { type: 'unknown', data } }), /Unknown email type/);
});
test('transport exceptions propagate to the queue', async t => {
    t.mock.method(service, 'sendWelcomeEmail', async () => { throw new Error('Connection refused'); });
    await assert.rejects(processEmail({ data: { type: 'welcome', data } }), /Connection refused/);
});
