require('../support/isolatedDependencies');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {User,Voucher,ErrorLog}=require('../../app/api/v1/models');
const rewards=require('../../app/api/v1/services/rewardService');
const logs=require('../../app/api/v1/services/errorLogService');
test('reward and error-log services persist real test records',{timeout:60000},async t=>{
    await require('../support/database').connect(t);
    const user=await User.create({name:'Rewards guest',email:'rewards@example.test',points:100});
    await t.test('points floor fractional awards and ignore zero spending',async()=>{
        assert.equal(await rewards.awardPoints(user._id,0),null);
        assert.equal((await rewards.awardPoints(user._id,59)).earned,2);
        assert.equal(await rewards.getUserPoints(user._id),102);
    });
    const template=await Voucher.create({code:'REWARD-TEST',discount_amount:50,expiry_date:new Date(Date.now()+86400000),max_uses_per_user:1});
    await t.test('redemption enforces balance and minimum points',async()=>{
        await assert.rejects(rewards.exchangePointsForVoucher(user._id,1000,template._id),/Insufficient/);
        await assert.rejects(rewards.exchangePointsForVoucher(user._id,1,template._id),/Minimum/);
    });
    await t.test('redemption creates an owned voucher and prevents reuse',async()=>{
        const redeemed=await rewards.exchangePointsForVoucher(user._id,50,template._id);
        assert.equal(redeemed.remainingPoints,52);
        assert.equal((await rewards.validateVoucher(redeemed.voucher.code,user._id)).discount_amount,50);
        await assert.rejects(rewards.validateVoucher(redeemed.voucher.code,'507f1f77bcf86cd799439011'),/belong/);
        assert.equal((await rewards.validateAndUseVoucher(redeemed.voucher.code,user._id)).remaining_uses,0);
        await assert.rejects(rewards.validateAndUseVoucher(redeemed.voucher.code,user._id),/usage limit/);
    });
    await t.test('expired and missing vouchers are rejected',async()=>{
        await Voucher.updateOne({_id:template._id},{expiry_date:new Date(0)});
        await assert.rejects(rewards.validateVoucher(template.code,user._id),/expired/);
        await assert.rejects(rewards.validateVoucher('NOT-FOUND',user._id),/not found/);
    });
    await t.test('error logs redact credentials while preserving diagnostic context',async()=>{
        const log=await logs.logBackendError(Object.assign(new Error('Test failure'),{statusCode:400}),{body:{password:'sensitive',name:'Guest'},headers:{},method:'POST',originalUrl:'/test'});
        const saved=await ErrorLog.findById(log._id);assert.equal(saved.request_data.password,'***REDACTED***');assert.equal(saved.request_data.name,'Guest');assert.equal(saved.severity,'high');
    });
});
