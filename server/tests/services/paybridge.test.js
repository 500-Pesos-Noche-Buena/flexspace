const { test } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const service = require('../../app/api/v1/services/paybridgeService');
test('payment checkout passes the amount and method to a stubbed gateway', async t => {
    t.mock.method(axios, 'post', async (url, body) => {
        assert.equal(body.amount, 150);
        assert.equal(body.payment_method, 'gcash');
        return { data: { checkout_url: 'https://example.test/checkout' } };
    });
    const result = await service.createPayMongoCheckout('test-key', '150.00', 'https://example.test/success');
    assert.equal(result.checkout_url, 'https://example.test/checkout');
});
test('gateway failures propagate as payment errors', async t => {
    t.mock.method(axios, 'post', async () => { throw new Error('Test gateway down'); });
    await assert.rejects(service.createPayMongoCheckout('test-key', 150, 'https://example.test/success'), /Failed to create payment link/);
});
