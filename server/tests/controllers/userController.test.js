const { test } = require('node:test');
const assert = require('node:assert/strict');
const { User } = require('../../app/api/v1/models');
const controller = require('../../app/api/v1/controllers/admin/userController');
test('account status returns 404 for a missing account', async t => {
    t.mock.method(User, 'findById', async () => null);
    let error;
    await controller.toggleStatus({ params: { id: 'missing' } }, {}, value => { error = value; });
    assert.equal(error.statusCode, 404);
});
test('account status is persisted and returned to the caller', async t => {
    let saved = false;
    const user = { isActive: true, async save() { saved = true; } };
    t.mock.method(User, 'findById', async () => user);
    let response;
    const res = { status(code) { assert.equal(code, 200); return this; }, json(data) { response = data; } };
    await controller.toggleStatus({ params: { id: 'test' } }, res, error => { throw error; });
    assert.equal(saved, true);
    assert.equal(response.isActive, false);
});
