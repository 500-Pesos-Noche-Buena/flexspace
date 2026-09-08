const { test } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../../app/api/v1/services/emailService');
test('welcome email renders and uses the configured transport without sending real mail', async t => {
    let message;
    t.mock.method(service.transporter, 'sendMail', async value => { message = value; return { messageId: 'test-message' }; });
    const result = await service.sendWelcomeEmail('test@example.test', 'Test User', 'test@example.test', 'temporary', 'user');
    assert.equal(result.success, true);
    assert.equal(message.to, 'test@example.test');
    assert.ok(message.html.includes('Test User'));
});
test('mail delivery failure is returned instead of claiming success', async t => {
    t.mock.method(service.transporter, 'sendMail', async () => { throw new Error('Test transport unavailable'); });
    const result = await service.sendWelcomeEmail('test@example.test', 'Test User', 'test@example.test', 'temporary', 'user');
    assert.equal(result.success, false);
    assert.equal(result.error, 'Test transport unavailable');
});
