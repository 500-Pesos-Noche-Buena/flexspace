const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const auth = require('../../app/api/v1/middleware/authMiddleware');
const { generateAuthTokens } = require('../../app/api/v1/utils/jwt');

test('authentication rejects missing, malformed, forged and expired credentials', async () => {
    for (const authorization of [undefined, 'Basic abc', 'Bearer malformed',
        `Bearer ${jwt.sign({ sub: 'guest' }, 'wrong-key')}`,
        `Bearer ${jwt.sign({ sub: 'guest' }, process.env.JWT_SECRET, { expiresIn: -1 })}`]) {
        let error;
        await auth({ headers: { authorization } }, {}, value => { error = value; });
        assert.equal(error?.statusCode, 401);
    }
});
test('valid access tokens identify the authenticated user and role', async () => {
    const { access } = generateAuthTokens({ id: 'test-user', role: 'staff', name: 'Test staff' });
    const req = { headers: { authorization: `Bearer ${access.token}` } };
    await auth(req, {}, error => assert.equal(error, undefined));
    assert.equal(req.user.sub, 'test-user');
    assert.equal(req.user.role, 'staff');
});
