require('../support/isolatedDependencies');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const otp = require('../../app/api/v1/services/otpService');
const errors = require('../../app/api/v1/services/errorLogService');
const email = require('../../app/api/v1/services/emailService');

test('OTP and reset tokens have the expected format and expiry behavior', () => {
    for (let i=0;i<20;i++) assert.match(otp.generateOTP(), /^\d{6}$/);
    const first=otp.generateResetToken(); assert.match(first,/^[a-f0-9]{64}$/);
    assert.notEqual(otp.generateResetToken(),first);
    assert.equal(otp.isOTPExpired(null),true);
    assert.equal(otp.isOTPExpired(new Date(Date.now()-1000)),true);
    assert.equal(otp.isOTPExpired(new Date(Date.now()+60000)),false);
});
test('error logging normalizes forwarded IP addresses', () => {
    assert.equal(errors.extractClientIp(null),'127.0.0.1');
    assert.equal(errors.extractClientIp({headers:{'x-forwarded-for':'192.0.2.1, 192.0.2.2'}}),'192.0.2.1');
    assert.equal(errors.extractClientIp({ip:['192.0.2.3','192.0.2.4']}),'192.0.2.3');
    assert.equal(errors.extractClientIp({socket:{remoteAddress:'192.0.2.5'}}),'192.0.2.5');
});
const details={ticket_number:'TEST-TICKET',receipt_number:'TEST-RECEIPT',space_name:'Test hub',total_amount:900,total_hours:2,rate_per_hour:150,check_in_at:new Date(),check_out_at:new Date(),code:'TEST-VOUCHER',discount_value:10,discount_type:'percentage'};
for (const [method, args] of Object.entries({
    sendWelcomeEmail:['guest@example.test','Test Guest','guest@example.test','temporary','user'],
    sendBookingConfirmation:['guest@example.test','Test Guest',details],
    sendVoucherEmail:['guest@example.test','Test Guest',details],
    sendPasswordResetEmail:['guest@example.test','Test Guest','https://example.test/reset'],
    sendOTPEmail:['guest@example.test','Test Guest','123456'],
    sendPasswordResetConfirmation:['guest@example.test','Test Guest'],
    sendBookingCompletionEmail:['guest@example.test','Test Guest',details],
    sendSpaceApprovalEmail:['guest@example.test','Test Guest',details],
    sendSpaceRejectionEmail:['guest@example.test','Test Guest']
})) {
    test(`${method} renders its template and handles transport success`, async t => {
        let message;
        t.mock.method(email.transporter,'sendMail',async input=>{message=input;return {messageId:'test-id'};});
        const result=await email[method](...args);
        assert.equal(result.success,true, result.error);
        assert.equal(message.to,'guest@example.test');assert.ok(message.subject.length>0);
        assert.match(message.html,/Test Guest/);assert.match(message.html,/<html/i);
    });
    test(`${method} reports transport failure`, async t => {
        t.mock.method(email.transporter,'sendMail',async()=>{throw new Error('test-delivery-failed');});
        const result=await email[method](...args);
        assert.equal(result.success,false);assert.equal(result.error,'test-delivery-failed');
    });
}
