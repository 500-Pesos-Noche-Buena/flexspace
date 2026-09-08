const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, comparePassword } = require('../../app/api/v1/utils/hash');
const otp = require('../../app/api/v1/services/otpService');
const ApiError = require('../../app/api/v1/utils/ApiError');
test('password hashes verify correct passwords and reject incorrect ones', async () => {
    const hash = await hashPassword('sample-test-password');
    assert.notEqual(hash, 'sample-test-password');
    assert.equal(await comparePassword('sample-test-password', hash), true);
    assert.equal(await comparePassword('wrong-password', hash), false);
});
test('OTP and reset token formats and expiry boundaries', () => {
    assert.match(otp.generateOTP(), /^\d{6}$/);
    assert.match(otp.generateResetToken(), /^[a-f0-9]{64}$/);
    assert.equal(otp.isOTPExpired(null), true);
    assert.equal(otp.isOTPExpired(new Date(Date.now() - 1000)), true);
    assert.equal(otp.isOTPExpired(new Date(Date.now() + 60000)), false);
});
test('operational API errors preserve response status', () => {
    const error = new ApiError(403, 'Access denied');
    assert.equal(error.statusCode, 403);
    assert.equal(error.isOperational, true);
    assert.equal(error.message, 'Access denied');
});
