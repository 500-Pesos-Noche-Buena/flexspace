const realFetch=global.fetch;
require('../support/isolatedDependencies');
const {test,mock}=require('node:test');
mock.method(require('../../app/api/v1/services/errorLogService'),'logBackendError',async()=>null);
const assert=require('node:assert/strict');
const express=require('express');
const jwt=require('jsonwebtoken');
const {User,Space,District}=require('../../app/api/v1/models');
const config=require('../../app/config/config');
const {errorConverter,errorHandler}=require('../../app/api/v1/middleware/errorHandler');
test('HTTP routes with JWT, validation and real test database', {timeout:60000},async t=>{
    await require('../support/database').connect(t);
    const admin=await User.create({name:'Admin',email:'admin-http@example.test',role:'admin'});
    const owner=await User.create({name:'Owner',email:'owner-http@example.test',role:'space'});
    const user=await User.create({name:'Customer',email:'user-http@example.test',role:'user'});
    await Space.create({user_id:owner._id,name:'HTTP Test Hub',rate_hour:150});
    const app=express();app.use(express.json());
    const mounted={};
    for(const role of ['admin','space','user','auth','landing','blog']){
        const router=require(`../../app/api/v1/routes/${role}Routes`);mounted[role]=router;
        app.use(`/api/v1/${role}`,router);
    }
    app.use(errorConverter,errorHandler);
    const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
    const base=`http://127.0.0.1:${server.address().port}/api/v1`;
    const tokens=Object.fromEntries([admin,owner,user].map(u=>[u.role,jwt.sign({sub:String(u._id),role:u.role},config.jwt.secret)]));
    const request=async(path,role,method='GET',body)=>{
        const res=await realFetch(base+path,{method,headers:{'Content-Type':'application/json',...(role?{Authorization:`Bearer ${tokens[role]}`}:{})},body:body?JSON.stringify(body):undefined});
        return {status:res.status,body:await res.json()};
    };
    // Discover registered routes rather than maintaining a second route list.
    const authMiddleware=require('../../app/api/v1/middleware/authMiddleware');
    const fingerprint=require('../../app/api/v1/middleware/protectionMiddleware');
    const inventory=[];
    for(const [area,router] of Object.entries(mounted)) for(const layer of router.stack) {
        if(!layer.route) continue;
        for(const method of Object.keys(layer.route.methods)) {
            const declared=`/${area}${layer.route.path==='/'?'':layer.route.path}`;
            const endpoint=declared.replace(/:[A-Za-z0-9_]+/g,'507f1f77bcf86cd799439011');
            const requiresAuth=area==='admin'||layer.route.stack.some(handler=>handler.handle===authMiddleware);
            const requiresFingerprint=layer.route.stack.some(handler=>handler.handle===fingerprint);
            inventory.push({method:method.toUpperCase(),path:declared,authentication:requiresAuth,fingerprint:requiresFingerprint});
            if(requiresAuth) {
                await t.test(`${method.toUpperCase()} ${declared}: anonymous access denied`,async()=>{
                    const response=await request(endpoint,null,method.toUpperCase(),['post','put','patch'].includes(method)?{}:undefined);
                    assert.equal(response.status,401,JSON.stringify(response));
                });
                if(area==='admin') await t.test(`${method.toUpperCase()} ${declared}: customer access denied`,async()=>{
                    const response=await request(endpoint,'user',method.toUpperCase(),['post','put','patch'].includes(method)?{}:undefined);
                    assert.equal(response.status,403,JSON.stringify(response));
                });
            } else if(requiresFingerprint) {
                await t.test(`${method.toUpperCase()} ${declared}: application key required`,async()=>assert.equal((await request(endpoint,null,method.toUpperCase())).status,403));
            }
        }
    }
    const fs=require('node:fs'),path=require('node:path');
    fs.mkdirSync(path.resolve(__dirname,'../../coverage'),{recursive:true});
    fs.writeFileSync(path.resolve(__dirname,'../../coverage/routes.json'),JSON.stringify(inventory,null,2));
    for(const path of ['/admin/dashboard','/space/bookings','/user/profile','/user/orders'])await t.test(`${path} requires authentication`,async()=>assert.equal((await request(path)).status,401));
    for(const [path,role] of [['/admin/dashboard','admin'],['/space/bookings','space'],['/user/profile','user'],['/user/orders','user']])await t.test(`${role} can access ${path}`,async()=>assert.equal((await request(path,role)).status,200));
    await t.test('customer cannot access admin dashboard',async()=>assert.equal((await request('/admin/dashboard','user')).status,403));
    await t.test('malformed booking submission returns a client error',async()=>{const res=await request('/user/bookings','user','POST',{});assert.ok(res.status>=400 && res.status<500,JSON.stringify(res));});
    await t.test('unknown customer order is not exposed',async()=>assert.equal((await request('/user/orders/507f1f77bcf86cd799439011','user')).status,404));
});
