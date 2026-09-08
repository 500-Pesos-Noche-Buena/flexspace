require('../support/isolatedDependencies');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const models = require('../../app/api/v1/models');
const { request, invoke, expectStatus } = require('../support/http');
const controller = file => require(`../../app/api/v1/controllers/${file}`);

test('controllers and services against real test records', { timeout: 60000 }, async t => {
    await require('../support/database').connect(t);
    const { User, Space, District, Settings, Product, Order, Voucher } = models;
    const owner = new mongoose.Types.ObjectId(), user = new mongoose.Types.ObjectId(), space = new mongoose.Types.ObjectId();
    await User.collection.insertMany([{ _id: owner, name: 'Test owner', email: 'owner@example.test', role: 'space', points: 0 }, { _id: user, name: 'Test customer', email: 'customer@example.test', role: 'user', points: 100 }]);
    await Space.collection.insertOne({ _id: space, user_id: owner, name: 'Test hub', status: 'Open Now', rate_hour: 150, capacity: 10, occupied_seats: 0, available_rooms: 0 });
    const makeReq = (role = 'space', extras = {}) => request({ user: { sub: String(role === 'user' ? user : owner), id: String(role === 'user' ? user : owner), role }, ...extras });
    const reads = {
        'admin/dashboardController': ['index','getPlatformOccupancy','getPlatformRevenueTrend','getTopSpaces','getUserGrowth'],
        'admin/earningController': ['index'],
        'admin/errorLogController': ['index','stats'],
        'admin/insightsController': ['getStats'],
        'admin/logsController': ['getActivityLogs','getStats','getRecentActivity','exportLogs'],
        'admin/settingsController': ['index'],
        'admin/spaceController': ['index','requests'],
        'admin/userController': ['index'],
        'admin/voucherController': ['index'],
        'admin/location/districtController': ['index'],
        'landingController': ['getExplorerData','getPublicStats','getCustomerReviews'],
        'space/dashboardController': ['index','getOccupancyAnalytics','getPeakHours','getCustomerLoyalty','getRevenueTrend'],
        'space/districtController': ['getActive'],
        'space/bookingController': ['index'],
        'space/earningController': ['index','exportCSV'],
        'space/posController': ['getProducts','getOrders','getRecentOrders','getIncomeStats','getActiveSessions'],
        'space/reviewController': ['getMySpaceReviews'],
        'space/roomController': ['getRooms','getPublicRoomsBySpace','getRoomsWithAvailability'],
        'space/spaceController': ['index'],
        'space/staffController': ['index'],
        'space/totalOrdersController': ['getTotalOrders','getOrderStats'],
        'space/voucherController': ['index'],
        'space/walkinController': ['index','getSpacesWithRooms','guests'],
        'user/bookingController': ['getActiveBookingFast','getMyBookings'],
        'user/dashboardController': ['getUserDashboard'],
        'user/orderController': ['getMyOrders'],
        'user/redeemController': ['index'],
        'user/reviewController': ['getMyReviews'],
        'user/spaceController': ['getAllSpaces','getDistricts'],
        'profileController': ['getProfile','getRecentActivity','getPaymentDetails']
    };
    for (const [file, methods] of Object.entries(reads)) for (const method of methods) {
        await t.test(`${file}.${method}: successful scoped read`, async () => {
            const req = makeReq(file.startsWith('admin') ? 'admin' : file.startsWith('user') ? 'user' : 'space');
            Object.assign(req.params, { id: String(space), spaceId: String(space), userId: String(user), ownerId: String(owner) });
            const result = await invoke(controller(file), method, req);
            expectStatus(result, 200);
            assert.ok(result.body != null);
        });
    }
    await t.test('admin district lifecycle writes, searches, updates and deletes a real model', async () => {
        const c = controller('admin/location/districtController');
        const req = makeReq('admin', { body: { name: 'Test District' } });
        const created = await invoke(c,'store',req); expectStatus(created,201);
        assert.equal(created.body.data.slug,'test-district');
        expectStatus(await invoke(c,'store',req),409);
        req.params.id = String(created.body.data._id); req.body = { name:'Renamed district', active:false };
        expectStatus(await invoke(c,'update',req),200);
        assert.equal((await District.findById(req.params.id)).active,false);
        expectStatus(await invoke(c,'destroy',req),200);
        assert.equal(await District.countDocuments({_id:req.params.id}),0);
    });
    await t.test('admin settings persist typed values', async () => {
        const c = controller('admin/settingsController');
        for (const [value, expected] of [['false',false],['true',true],[0,false],[1,true]]) {
            expectStatus(await invoke(c,'update',makeReq('admin',{body:{key:'maintenance_mode',value}})),200);
            assert.equal((await Settings.findOne({key:'maintenance_mode'})).value,expected);
        }
    });
    await t.test('user service handles local credentials, staff, payment preferences and Google users', async () => {
        const service = require('../../app/api/v1/services/userService');
        const created = await service.createUser({name:'Registered test',email:'registered@example.test',password:'test-password'});
        assert.equal((await service.verifyUserCredentials(created.email,'test-password')).type,'authorized');
        assert.equal(await service.verifyUserCredentials(created.email,'wrong'),null);
        assert.equal(await service.isEmailTaken(created.email),true);
        assert.equal(await service.hasPassword(created._id),true);
        await service.updatePaymentDetails(created._id,{payment_methods:['cash']});
        assert.deepEqual((await service.getPaymentDetails(created._id)).payment_methods,['cash']);
        const staff = await service.createStaff({name:'Staff',email:'staff@example.test',password:'test-password',parent_id:owner,space_id:space});
        assert.equal(staff.role,'staff');
        const google = await service.findOrCreateGoogleUser({id:'google-test',emails:[{value:'google@example.test'}],displayName:'Google test'});
        assert.equal((await service.verifyUserCredentials(google.email,'unused')).type,'google_only');
        assert.equal(await service.hasPassword(google._id),false);
        assert.equal(String((await service.findOrCreateGoogleUser({id:'google-test'}))._id),String(google._id));
    });
    await t.test('space products enforce ownership and write real stock records', async () => {
        const c = controller('space/posController');
        const req = makeReq('space',{body:{space_id:String(space),name:'Test snack',price:100,stock:5,category:'food'}});
        const created = await invoke(c,'createProduct',req); expectStatus(created,201);
        const product = await Product.findOne({name:'Test snack'}); assert.equal(product.stock,5);
        req.params.id = String(product._id); req.params.productId = String(product._id); req.body={price:120};
        expectStatus(await invoke(c,'updateProduct',req),200);
        assert.equal((await Product.findById(product._id)).price,120);
        const foreign = makeReq('user',{params:req.params,body:{price:1}});
        const denied = await invoke(c,'updateProduct',foreign); assert.ok((denied.error?.statusCode || denied.status) >= 400);
        expectStatus(await invoke(c,'deleteProduct',req),200);
        assert.equal(await Product.countDocuments({_id:product._id}),0);
    });
    await t.test('user order reads cannot expose another customer order', async () => {
        const order = await Order.create({space_id:space,user_id:user,order_type:'online',customer_name:'Test customer',items:[],subtotal:100,total:100,payment_method:'cash',amount_received:0});
        const c = controller('user/orderController');
        const req = makeReq('user');req.params.orderId=String(order._id);req.params.orderNumber=order.order_number;
        expectStatus(await invoke(c,'getOrderDetails',req),200);
        expectStatus(await invoke(c,'getOrderByNumber',req),200);
        req.user.sub=String(owner);
        expectStatus(await invoke(c,'getOrderDetails',req),404);
    });
});
