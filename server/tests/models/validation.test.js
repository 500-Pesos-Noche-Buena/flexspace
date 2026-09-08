const {test}=require('node:test');
const assert=require('node:assert/strict');
const models=require('../../app/api/v1/models');
const id='507f1f77bcf86cd799439011';
const cases={
    User:[{name:'Test',email:'test@example.test'},'email',null],
    Space:[{user_id:id,name:'Hub',rate_hour:150},'rating',6],
    SpaceRequest:[{name:'Owner',email:'owner@example.test',password:'hashed'},'status','invalid'],
    Booking:[{booking_type:'walkin',bookable_type:'space'},'status','invalid'],
    District:[{name:'District',slug:'district'},'name',null],
    Payment:[{method:'cash',amount_total:604.17,amount_received:700},'method','invalid'],
    Settings:[{key:'maintenance',value:false},'key',null],
    Earnings:[{owner_id:id,space_id:id,order_number:'TEST',total_amount:100,platform_fee:3,owner_earnings:97,booking_date:new Date(),month:'2026-09'},'fee_status','invalid'],
    Voucher:[{code:'TEST',discount_amount:100,expiry_date:new Date()},'code',null],
    Analytics:[{period:'7d'},'period','invalid'],
    Blocklist:[{ip:'192.0.2.1',reason:'Test'},'ip',null],
    Review:[{space_id:id,guest_name:'Guest',rating:5,comment:'Good',reviewer_type:'guest'},'rating',6],
    ActivityLog:[{type:'user_login',description:'Test'},'type','invalid'],
    Room:[{space_id:id,name:'Meeting'},'consumable_allowance',-1],
    Blog:[{title:'Test',slug:'test',excerpt:'Test',content:'Test'},'language','invalid'],
    Order:[{space_id:id,subtotal:100,total:100,payment_method:'cash',amount_received:100,customer_name:'Guest'},'payment_method','invalid'],
    Product:[{space_id:id,name:'Food',price:100,category:'food'},'category','invalid'],
    ErrorLog:[{error_message:'Test'},'error_type','invalid']
};
for(const [name,[valid,field,invalid]] of Object.entries(cases)){
    test(`${name}: valid model payload passes validation`,()=>assert.equal(new models[name](valid).validateSync(),undefined));
    test(`${name}: invalid ${field} is rejected`,()=>assert.ok(new models[name]({...valid,[field]:invalid}).validateSync()?.errors[field]));
}
test('order item quantity must be positive and requires product reference',()=>{
    const base=cases.Order[0];
    const error=new models.Order({...base,items:[{name:'Food',quantity:0,price:10}]}).validateSync();
    assert.ok(error.errors['items.0.quantity']);assert.ok(error.errors['items.0.product_id']);
});
test('review length and rating bounds reject invalid submissions',()=>{
    for(const [field,value] of [['rating',0],['comment','x'.repeat(1001)],['title','x'.repeat(101)]]) assert.ok(new models.Review({...cases.Review[0],[field]:value}).validateSync()?.errors[field]);
});
