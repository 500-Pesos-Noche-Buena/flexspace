const {test}=require('node:test');
const assert=require('node:assert/strict');
const receipt=()=>import('../../../client/src/utils/orderReceipt.js');
test('checkout receipt uses saved booking and linked products, retaining cents',async()=>{
    const {settledBookingOrder,settledOrderGroup}=await receipt();
    const saved={_id:'booking-1',ticket_number:'WK-TEST',guest_name:'Test guest',status:'completed',payment_status:'paid',payment_method:'cash',total_amount:1056.67,room_charge:6.67,consumable_total:1050,consumable_covered:0,consumable_excess:1050,amount_paid:1056.67,billing_orders:[{_id:'order-1',order_number:'ORD-TEST',total:1050,items:[{name:'Food',price:150,quantity:7}]}]};
    const group=settledOrderGroup([settledBookingOrder(saved)]);
    assert.equal(group.total,1056.67);assert.equal(group.amount_paid,1056.67);
    assert.equal(group.order_count+group.linked_order_count,2);
    assert.equal(group.payment_method,'cash');assert.equal(group.grouped_orders[0].status,'completed');
    assert.equal(group.grouped_orders[0].linked_orders[0].total,1050);
    const small=settledOrderGroup([settledBookingOrder({...saved,total_amount:0.5,amount_paid:0.5})]);
    assert.equal(small.total,0.5);
});
test('promo products are shown without charging their full value a second time',async()=>{
    const {settledBookingOrder,settledOrderGroup}=await receipt();
    const order=settledBookingOrder({_id:'promo',ticket_number:'WK-PROMO',payment_status:'paid',total_amount:1150,room_charge:900,consumable_total:1000,consumable_covered:750,consumable_excess:250,billing_orders:[{_id:'food',total:1000}]});
    const group=settledOrderGroup([order,{_id:'pos',order_number:'POS-1',order_type:'pos_order',payment_status:'paid',subtotal:200,total:200}]);
    assert.equal(group.total,1350);assert.equal(group.linked_order_count,1);assert.equal(group.order_count,2);
});
test('an unpaid checkout response cannot become a paid receipt',async()=>{
    const {settledBookingOrder,settledOrderGroup}=await receipt();
    assert.throws(()=>settledBookingOrder({_id:'active',status:'active',total_amount:0}),/paid booking/);
    assert.throws(()=>settledOrderGroup([]),/No saved orders/);
});

test('700 tendered for 604.17 prints 95.83 change from the saved payment',async()=>{
    const {settledBookingOrder,settledOrderGroup}=await receipt();
    const group=settledOrderGroup([settledBookingOrder({_id:'cash',ticket_number:'WK-CASH',payment_status:'paid',payment_method:'cash',total_amount:604.17,amount_paid:604.17,payment:{amount_received:700,change:95.83}})]);
    assert.equal(group.total,604.17);assert.equal(group.amount_received,700);assert.equal(group.change,95.83);
});
