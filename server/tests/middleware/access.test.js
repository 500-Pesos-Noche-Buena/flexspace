require('../support/isolatedDependencies');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const jwt=require('jsonwebtoken');
const config=require('../../app/config/config');
const protection=require('../../app/api/v1/middleware/protectionMiddleware');
const queue=require('../../app/api/v1/middleware/queueMiddleware');
const {request,invoke}=require('../support/http');
test('application fingerprint accepts the configured key and rejects missing or incorrect keys',async()=>{
    for(const key of [undefined,'wrong',config.app.internalSecret]){
        const result=await invoke({handle:protection},'handle',request({headers:{'x-app-fingerprint':key}}));
        assert.equal(result.error?.statusCode,key===config.app.internalSecret?undefined:403);
    }
});
for(const role of ['admin','super_admin','space','staff','user']) test(`queue access for ${role}`,async()=>{
    const token=jwt.sign({sub:'test-user',role},config.jwt.secret,{expiresIn:'1m'});
    const req=request({headers:{authorization:`Bearer ${token}`}});
    const result=await invoke({handle:queue},'handle',req);
    if(['admin','super_admin'].includes(role)){assert.equal(result.sent,false);assert.equal(req.user.sub,'test-user');}
    else assert.equal(result.status,403);
});
test('queue rejects missing and invalid tokens',async()=>{
    for(const token of ['', 'invalid']){
        const result=await invoke({handle:queue},'handle',request({headers:{authorization:`Bearer ${token}`}}));
        assert.equal(result.status,401);
    }
});
