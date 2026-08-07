const { Order, Product, Space, User, Payment, Earnings } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class POSController {
    getOwnerId = async (req) => {
        const userId = req.user?.sub || req.user?._id || req.user?.id;
        if (req.user?.role === 'staff') {
            const staffRecord = await User.findById(userId).select('parent_id space_id');
            return {
                ownerId: staffRecord?.parent_id || userId,
                staffSpaceId: staffRecord?.space_id || null
            };
        }
        return { ownerId: userId, staffSpaceId: null };
    };

    // ============ PRODUCTS ============
    getProducts = async (req, res, next) => {
        try {
            const { space_id } = req.query;
            const userId = req.user?.sub || req.user?._id || req.user?.id;
            const userRole = req.user?.role;

            let targetSpaceId = space_id;
            let query = { is_available: true };

            if (userRole === 'staff') {
                const staffRecord = await User.findById(userId).select('space_id parent_id');
                if (!staffRecord?.space_id) {
                    return res.status(HTTP_STATUS.OK).json({ success: true, data: [] });
                }
                targetSpaceId = staffRecord.space_id;
                query.space_id = targetSpaceId;
            } else {
                const { ownerId } = await this.getOwnerId(req);

                if (targetSpaceId) {
                    const space = await Space.findOne({ _id: targetSpaceId, user_id: ownerId });
                    if (!space) {
                        return res.status(HTTP_STATUS.OK).json({ success: true, data: [] });
                    }
                    query.space_id = targetSpaceId;
                } else {
                    const spaces = await Space.find({ user_id: ownerId }).select('_id');
                    const spaceIds = spaces.map(s => s._id);
                    if (spaceIds.length > 0) {
                        query.space_id = { $in: spaceIds };
                    } else {
                        return res.status(HTTP_STATUS.OK).json({ success: true, data: [] });
                    }
                }
            }

            const products = await Product.find(query).sort({ category: 1, name: 1 });
            return res.status(HTTP_STATUS.OK).json({ success: true, data: products });
        } catch (error) {
            console.error('Get products error:', error);
            next(error);
        }
    };

    createProduct = async (req, res, next) => {
        try {
            const userId = req.user?.sub || req.user?._id || req.user?.id;
            const userRole = req.user?.role;
            const { space_id, name, purchase_price, price, category, stock, description, is_available } = req.body;

            let targetSpaceId = space_id;

            if (userRole === 'staff') {
                const staffRecord = await User.findById(userId).select('space_id parent_id');
                if (!staffRecord?.space_id) {
                    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You are not assigned to any branch');
                }
                targetSpaceId = staffRecord.space_id;
            } else {
                if (!targetSpaceId) {
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Space ID is required');
                }
                const { ownerId } = await this.getOwnerId(req);
                const space = await Space.findOne({ _id: targetSpaceId, user_id: ownerId });
                if (!space) {
                    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Unauthorized: Space does not belong to you');
                }
            }

            const product = await Product.create({
                space_id: targetSpaceId,
                name,
                purchase_price: purchase_price || 0,
                price,
                category,
                stock: stock || 0,
                description: description || null,
                is_available: is_available !== false,
                created_by: userId
            });

            return res.status(HTTP_STATUS.CREATED).json({ success: true, data: product });
        } catch (error) {
            console.error('Create product error:', error);
            next(error);
        }
    };

    updateProduct = async (req, res, next) => {
        try {
            const { id } = req.params;
            const userId = req.user?.sub || req.user?._id || req.user?.id;
            const userRole = req.user?.role;

            const product = await Product.findById(id);
            if (!product) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found');
            }

            if (userRole === 'staff') {
                const staffRecord = await User.findById(userId).select('space_id');
                if (!staffRecord?.space_id || product.space_id.toString() !== staffRecord.space_id.toString()) {
                    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Unauthorized: You can only edit products in your assigned branch');
                }
            } else {
                const { ownerId } = await this.getOwnerId(req);
                const space = await Space.findOne({ _id: product.space_id, user_id: ownerId });
                if (!space) {
                    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Unauthorized');
                }
            }

            const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true });
            return res.status(HTTP_STATUS.OK).json({ success: true, data: updatedProduct });
        } catch (error) {
            console.error('Update product error:', error);
            next(error);
        }
    };

    deleteProduct = async (req, res, next) => {
        try {
            const { id } = req.params;
            const userId = req.user?.sub || req.user?._id || req.user?.id;
            const userRole = req.user?.role;

            const product = await Product.findById(id);
            if (!product) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found');
            }

            if (userRole === 'staff') {
                const staffRecord = await User.findById(userId).select('space_id');
                if (!staffRecord?.space_id || product.space_id.toString() !== staffRecord.space_id.toString()) {
                    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Unauthorized: You can only delete products in your assigned branch');
                }
            } else {
                const { ownerId } = await this.getOwnerId(req);
                const space = await Space.findOne({ _id: product.space_id, user_id: ownerId });
                if (!space) {
                    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Unauthorized');
                }
            }

            await Product.findByIdAndDelete(id);
            return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Product deleted' });
        } catch (error) {
            console.error('Delete product error:', error);
            next(error);
        }
    };

    // ============ ORDERS ============
    createOrder = async (req, res, next) => {
        try {
            const userId = req.user?.sub || req.user?._id || req.user?.id;
            const userRole = req.user?.role;
            const { space_id, items, payment_method, amount_received, total, subtotal, customer_name, order_type } = req.body;

            let targetSpaceId = space_id;

            if (userRole === 'staff') {
                const staffRecord = await User.findById(userId).select('space_id parent_id');
                if (!staffRecord?.space_id) {
                    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You are not assigned to any branch');
                }
                targetSpaceId = staffRecord.space_id;
            } else {
                if (!targetSpaceId) {
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Space ID is required');
                }
                const { ownerId } = await this.getOwnerId(req);
                const space = await Space.findOne({ _id: targetSpaceId, user_id: ownerId });
                if (!space) {
                    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Unauthorized: Space does not belong to you');
                }
            }

            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 10000);
            const orderNumber = `ORD-${timestamp}-${random}`;

            let change = 0;
            if (payment_method === 'cash' && amount_received) {
                change = Math.max(0, amount_received - total);
            }

            let initialStatus = 'pending';
            let paymentStatus = 'unpaid';
            let isPayLater = false;

            if (payment_method === 'cash' || payment_method === 'qr') {
                initialStatus = 'confirmed';
                paymentStatus = 'paid';
            } else if (payment_method === 'online') {
                initialStatus = 'pending_payment';
                paymentStatus = 'unpaid';
            } else if (payment_method === 'pay_later') {
                initialStatus = 'confirmed'; // Or 'pending' if you want
                paymentStatus = 'unpaid'; // NOT paid yet!
                isPayLater = true;
            }

            const orderData = {
                order_number: orderNumber,
                space_id: targetSpaceId,
                processed_by: userId,
                items: items,
                subtotal: subtotal,
                tax: req.body.tax || 0,
                discount_type: req.body.discount_type || null,
                discount_value: req.body.discount_value || 0,
                discount_amount: req.body.discount_amount || 0,
                total: total,
                payment_method: payment_method,
                is_pay_later: isPayLater, // ✅ FIX: Set is_pay_later flag
                pay_later_status: isPayLater ? 'pending' : 'pending',
                amount_received: amount_received || 0,
                change: change,
                customer_name: customer_name || 'Walk-in Customer',
                order_type: order_type || 'pos',
                status: initialStatus,
                payment_status: paymentStatus
            };

            const order = await Order.create(orderData);
            console.log(`✅ Order created: ${orderNumber} with status: ${initialStatus}, is_pay_later: ${isPayLater}`);

            // Update product stock
            for (const item of items) {
                await Product.findByIdAndUpdate(item.product_id, { $inc: { stock: -item.quantity } });
            }

            // 🆕 CREATE PAYMENT RECORD FOR CASH/QR ORDERS IMMEDIATELY
            if (payment_method === 'cash' || payment_method === 'qr') {
                try {
                    const paymentDoc = await Payment.create({
                        order_id: order._id,
                        payment_type: 'pos_order',
                        method: payment_method,
                        amount_total: total,
                        amount_original: subtotal,
                        discount_applied: req.body.discount_amount || 0,
                        amount_received: amount_received || total,
                        change: change,
                        reference_number: `POS-${orderNumber}`,
                        status: 'completed',
                        processed_by: userId
                    });
                    console.log(`✅ Payment record created for POS order ${orderNumber}: ${paymentDoc._id}`);
                } catch (payError) {
                    console.error('Failed to create payment record:', payError);
                }
            }

            return res.status(HTTP_STATUS.CREATED).json({ success: true, data: order });
        } catch (error) {
            console.error('Create order error:', error);
            next(error);
        }
    };

    getOrders = async (req, res, next) => {
        try {
            const userId = req.user?.sub || req.user?._id || req.user?.id;
            const userRole = req.user?.role;
            const { space_id } = req.query;

            let query = {};

            if (userRole === 'staff') {
                const staffRecord = await User.findById(userId).select('space_id');
                if (staffRecord?.space_id) {
                    query.space_id = staffRecord.space_id;
                } else {
                    return res.status(HTTP_STATUS.OK).json({ success: true, data: [] });
                }
            } else {
                const { ownerId } = await this.getOwnerId(req);
                if (space_id) {
                    const space = await Space.findOne({ _id: space_id, user_id: ownerId });
                    if (!space) {
                        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Unauthorized');
                    }
                    query.space_id = space_id;
                } else {
                    const spaces = await Space.find({ user_id: ownerId }).select('_id');
                    const spaceIds = spaces.map(s => s._id);
                    query.space_id = { $in: spaceIds };
                }
            }

            const orders = await Order.find(query).sort({ created_at: -1 });
            return res.status(HTTP_STATUS.OK).json({ success: true, data: orders });
        } catch (error) {
            next(error);
        }
    };

    getRecentOrders = async (req, res, next) => {
        try {
            const userId = req.user?.sub || req.user?._id || req.user?.id;
            const userRole = req.user?.role;
            const { space_id } = req.query;

            let query = {};

            if (userRole === 'staff') {
                const staffRecord = await User.findById(userId).select('space_id');
                if (staffRecord?.space_id) {
                    query.space_id = staffRecord.space_id;
                } else {
                    return res.status(HTTP_STATUS.OK).json({ success: true, data: [] });
                }
            } else {
                const { ownerId } = await this.getOwnerId(req);
                if (space_id) {
                    const space = await Space.findOne({ _id: space_id, user_id: ownerId });
                    if (!space) {
                        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Unauthorized');
                    }
                    query.space_id = space_id;
                } else {
                    const spaces = await Space.find({ user_id: ownerId }).select('_id');
                    const spaceIds = spaces.map(s => s._id);
                    query.space_id = { $in: spaceIds };
                }
            }

            const orders = await Order.find(query).sort({ created_at: -1 }).limit(10);
            return res.status(HTTP_STATUS.OK).json({ success: true, data: orders });
        } catch (error) {
            next(error);
        }
    };

    // ============ SETTLE PAY LATER ============
    settlePayLater = async (req, res, next) => {
        try {
            const { orderId } = req.params;
            const { amount_received, payment_method } = req.body;
            const userId = req.user?.sub || req.user?._id || req.user?.id;

            const order = await Order.findById(orderId);
            if (!order) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
            }

            if (!order.is_pay_later && order.payment_method !== 'pay_later') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'This is not a Pay Later order');
            }

            if (order.pay_later_status === 'settled') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'This order is already fully paid');
            }

            const amount = parseFloat(amount_received) || order.total;
            const remaining = order.total - (order.pay_later_total_accumulated || 0);

            if (amount > remaining) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Amount exceeds remaining balance of ₱${remaining.toFixed(2)}`);
            }

            // Track payment in pay_later_payments array
            order.pay_later_payments.push({
                amount: amount,
                payment_method: payment_method || 'cash',
                paid_at: new Date(),
                processed_by: userId
            });

            // Update accumulated total
            order.pay_later_total_accumulated = (order.pay_later_total_accumulated || 0) + amount;

            // Check if fully paid
            if (order.pay_later_total_accumulated >= order.total) {
                order.pay_later_status = 'settled';
                order.payment_status = 'paid';
                order.status = 'completed';

                // 🆕 NOW create Earnings since payment is settled
                try {
                    const Earnings = require('@/api/v1/models/schema/Earnings');
                    const Settings = require('@/api/v1/models/schema/Settings');
                    const Space = require('@/api/v1/models/schema/Space');

                    const existingEarnings = await Earnings.findOne({
                        order_number: order.order_number
                    });

                    if (!existingEarnings) {
                        const space = await Space.findById(order.space_id).select('user_id');
                        const feeSetting = await Settings.findOne({ key: 'platform_fee_percent' });
                        const platformFeePercent = feeSetting?.value ?? 3;

                        const totalAmount = order.total || 0;
                        const platformFee = (totalAmount * platformFeePercent) / 100;
                        const ownerEarnings = totalAmount - platformFee;
                        const month = new Date().toISOString().slice(0, 7);

                        // In settlePayLater - when creating Earnings
                        await Earnings.create({
                            owner_id: space.user_id,
                            space_id: order.space_id,
                            order_number: order.order_number,
                            booking_id: null,
                            total_amount: totalAmount,
                            platform_fee_percent: platformFeePercent,
                            platform_fee: parseFloat(platformFee.toFixed(4)),
                            owner_earnings: parseFloat(ownerEarnings.toFixed(4)),
                            payment_method: 'cash', // Use a valid enum value
                            payment_intent_id: null,
                            auto_collected: false,
                            fee_status: 'pending',
                            collected_at: null,
                            booking_date: order.created_at || new Date(),
                            month: month,
                            notes: `Pay Later order settled - Earnings created`
                        });

                        console.log(`✅ Earnings created for Pay Later order ${order.order_number}: ₱${totalAmount}`);
                    }
                } catch (error) {
                    console.error('Failed to create earnings for Pay Later order:', error);
                }
            } else {
                order.pay_later_status = 'partially_paid';
                order.payment_status = 'partial';
            }

            await order.save();

            // Create Payment record for the settlement
            try {
                await Payment.create({
                    order_id: order._id,
                    payment_type: 'pos_order',
                    method: payment_method || 'cash',
                    amount_total: amount,
                    amount_original: amount,
                    discount_applied: 0,
                    amount_received: amount,
                    change: 0,
                    reference_number: `PAY-${order.order_number}`,
                    status: 'completed',
                    processed_by: userId
                });
            } catch (e) {
                console.error('Failed to create payment record for settlement:', e);
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `Payment recorded. Remaining: ₱${(order.total - order.pay_later_total_accumulated).toFixed(2)}`,
                data: {
                    order: order,
                    remaining: order.total - order.pay_later_total_accumulated,
                    total_paid: order.pay_later_total_accumulated
                }
            });

        } catch (error) {
            console.error('Settle pay later error:', error);
            next(error);
        }
    };

    // ============ UPDATED: updateOrderStatus WITH PAYMENT & EARNINGS CREATION ============
    updateOrderStatus = async (req, res, next) => {
        try {
            const { orderId } = req.params;
            const { status } = req.body;
            const userId = req.user?.sub || req.user?._id || req.user?.id;
            const userRole = req.user?.role;

            const validStatuses = ['pending', 'pending_payment', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'];
            if (!validStatuses.includes(status)) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid status');
            }

            const order = await Order.findById(orderId);
            if (!order) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
            }

            console.log(`📝 Updating order ${order.order_number} from ${order.status} to ${status}`);

            // Verify permissions
            if (userRole === 'staff') {
                const staffRecord = await User.findById(userId).select('space_id');
                if (!staffRecord?.space_id || order.space_id.toString() !== staffRecord.space_id.toString()) {
                    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Unauthorized');
                }
            } else {
                const { ownerId } = await this.getOwnerId(req);
                const space = await Space.findOne({ _id: order.space_id, user_id: ownerId });
                if (!space) {
                    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Unauthorized');
                }
            }

            // Skip earnings creation for Pay Later orders - handled by settlePayLater
            const isPayLater = order.is_pay_later || order.payment_method === 'pay_later';

            // 🆕 CREATE PAYMENT & EARNINGS RECORD FOR COMPLETED OR CONFIRMED ORDERS
            if ((status === 'completed' || status === 'confirmed') && !isPayLater) {
                // 1. Create/check Payment record
                const existingPayment = await Payment.findOne({ order_id: order._id });

                let paymentDoc = existingPayment;
                if (!existingPayment) {
                    try {
                        paymentDoc = await Payment.create({
                            order_id: order._id,
                            payment_type: 'pos_order',
                            method: order.payment_method || 'cash',
                            amount_total: order.total || 0,
                            amount_original: order.subtotal || 0,
                            discount_applied: order.discount_amount || 0,
                            amount_received: order.amount_received || order.total || 0,
                            change: order.change || 0,
                            reference_number: `POS-${order.order_number}`,
                            status: 'completed',
                            processed_by: userId
                        });
                        console.log(`✅ Payment record created for POS order ${order.order_number}: ${paymentDoc._id}`);
                    } catch (payError) {
                        console.error('Failed to create payment record:', payError);
                    }
                } else {
                    console.log(`⚠️ Payment already exists for order ${order.order_number}`);
                }

                // 2. 🆕 CREATE EARNINGS RECORD FOR POS ORDER
                try {
                    const existingEarnings = await Earnings.findOne({
                        order_number: order.order_number
                    });

                    if (!existingEarnings) {
                        const Settings = require('@/api/v1/models/schema/Settings');
                        const feeSetting = await Settings.findOne({ key: 'platform_fee_percent' });
                        const platformFeePercent = feeSetting?.value ?? 3;

                        const totalAmount = order.total || 0;
                        const platformFee = (totalAmount * platformFeePercent) / 100;
                        const ownerEarnings = totalAmount - platformFee;
                        const month = new Date(order.created_at || new Date()).toISOString().slice(0, 7);

                        const earningsData = {
                            owner_id: userId,
                            space_id: order.space_id,
                            order_number: order.order_number,
                            total_amount: totalAmount,
                            platform_fee_percent: platformFeePercent,
                            platform_fee: parseFloat(platformFee.toFixed(4)),
                            owner_earnings: parseFloat(ownerEarnings.toFixed(4)),
                            payment_method: order.payment_method || 'cash',
                            payment_intent_id: null,
                            auto_collected: false,
                            fee_status: 'pending',
                            collected_at: null,
                            booking_date: order.created_at || new Date(),
                            month: month,
                            notes: `POS Order - Platform fee pending collection from space owner`
                        };

                        await Earnings.create(earningsData);
                        console.log(`✅ Earnings created for POS order ${order.order_number}: ₱${platformFee} platform fee`);
                    } else {
                        console.log(`⚠️ Earnings already exist for POS order ${order.order_number}`);
                    }
                } catch (earnError) {
                    console.error('Failed to create earnings for POS order:', earnError);
                    // Don't fail the order update if earnings creation fails
                }

                order.payment_status = 'paid';
            }

            order.status = status;
            await order.save();

            console.log(`✅ Order ${order.order_number} updated: status=${order.status}, payment_status=${order.payment_status}`);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `Order status updated to ${status}`,
                data: order
            });
        } catch (error) {
            console.error('Update order status error:', error);
            next(error);
        }
    };

    // ============ FIX: Manual Payment & Earnings Fix Endpoint ============
    fixOrderPayment = async (req, res, next) => {
        try {
            const { orderId } = req.params;
            const userId = req.user?.sub || req.user?._id || req.user?.id;

            const order = await Order.findById(orderId);
            if (!order) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
            }

            console.log(`🔧 Fixing order ${order.order_number}`);

            const results = { payment: null, earnings: null };

            // 1. Check/Create Payment
            const existingPayment = await Payment.findOne({ order_id: order._id });
            if (!existingPayment) {
                results.payment = await Payment.create({
                    order_id: order._id,
                    payment_type: 'pos_order',
                    method: order.payment_method || 'cash',
                    amount_total: order.total || 0,
                    amount_original: order.subtotal || 0,
                    discount_applied: order.discount_amount || 0,
                    amount_received: order.amount_received || order.total || 0,
                    change: order.change || 0,
                    reference_number: `POS-${order.order_number}`,
                    status: 'completed',
                    processed_by: userId
                });
                console.log(`✅ Payment created: ${results.payment._id}`);
            } else {
                results.payment = existingPayment;
                console.log(`⚠️ Payment already exists: ${existingPayment._id}`);
            }

            // 2. Check/Create Earnings
            const existingEarnings = await Earnings.findOne({ order_number: order.order_number });
            if (!existingEarnings) {
                const Settings = require('@/api/v1/models/schema/Settings');
                const feeSetting = await Settings.findOne({ key: 'platform_fee_percent' });
                const platformFeePercent = feeSetting?.value ?? 3;

                const totalAmount = order.total || 0;
                const platformFee = (totalAmount * platformFeePercent) / 100;
                const ownerEarnings = totalAmount - platformFee;
                const month = new Date(order.created_at || new Date()).toISOString().slice(0, 7);

                results.earnings = await Earnings.create({
                    owner_id: userId,
                    space_id: order.space_id,
                    order_number: order.order_number,
                    total_amount: totalAmount,
                    platform_fee_percent: platformFeePercent,
                    platform_fee: parseFloat(platformFee.toFixed(4)),
                    owner_earnings: parseFloat(ownerEarnings.toFixed(4)),
                    payment_method: order.payment_method || 'cash',
                    payment_intent_id: null,
                    auto_collected: false,
                    fee_status: 'pending',
                    collected_at: null,
                    booking_date: order.created_at || new Date(),
                    month: month,
                    notes: `POS Order - Fixed manually`
                });
                console.log(`✅ Earnings created: ${results.earnings._id}`);
            } else {
                results.earnings = existingEarnings;
                console.log(`⚠️ Earnings already exists: ${existingEarnings._id}`);
            }

            // Update order payment_status if needed
            if (order.payment_status !== 'paid') {
                order.payment_status = 'paid';
                await order.save();
                console.log(`✅ Order ${order.order_number} payment_status updated to paid`);
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `Order ${order.order_number} fixed successfully`,
                data: { order, ...results }
            });
        } catch (error) {
            console.error('Fix order error:', error);
            next(error);
        }
    };

    getIncomeStats = async (req, res, next) => {
        try {
            const userId = req.user?.sub || req.user?._id || req.user?.id;
            const userRole = req.user?.role;
            const { space_id } = req.query;

            let matchQuery = {};

            if (userRole === 'staff') {
                const staffRecord = await User.findById(userId).select('space_id');
                if (staffRecord?.space_id) {
                    matchQuery.space_id = staffRecord.space_id;
                } else {
                    return res.status(HTTP_STATUS.OK).json({ success: true, data: { daily: { total: 0, count: 0 }, weekly: { total: 0, count: 0 }, monthly: { total: 0, count: 0 }, total: { total: 0, count: 0 } } });
                }
            } else {
                const { ownerId } = await this.getOwnerId(req);
                if (space_id) {
                    const space = await Space.findOne({ _id: space_id, user_id: ownerId });
                    if (!space) {
                        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Unauthorized');
                    }
                    matchQuery.space_id = space_id;
                } else {
                    const spaces = await Space.find({ user_id: ownerId }).select('_id');
                    const spaceIds = spaces.map(s => s._id);
                    matchQuery.space_id = { $in: spaceIds };
                }
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);

            const [daily, weekly, monthly, total] = await Promise.all([
                Order.aggregate([
                    { $match: { ...matchQuery, created_at: { $gte: today } } },
                    { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
                ]),
                Order.aggregate([
                    { $match: { ...matchQuery, created_at: { $gte: weekAgo } } },
                    { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
                ]),
                Order.aggregate([
                    { $match: { ...matchQuery, created_at: { $gte: monthAgo } } },
                    { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
                ]),
                Order.aggregate([
                    { $match: matchQuery },
                    { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
                ])
            ]);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    daily: { total: daily[0]?.total || 0, count: daily[0]?.count || 0 },
                    weekly: { total: weekly[0]?.total || 0, count: weekly[0]?.count || 0 },
                    monthly: { total: monthly[0]?.total || 0, count: monthly[0]?.count || 0 },
                    total: { total: total[0]?.total || 0, count: total[0]?.count || 0 }
                }
            });
        } catch (error) {
            next(error);
        }
    };

    confirmOnlinePayment = async (req, res, next) => {
        try {
            const { orderId } = req.params;
            const { payment_intent_id } = req.body;

            const order = await Order.findOne({ order_number: orderId });
            if (!order) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
            }

            order.status = 'confirmed';
            order.payment_status = 'paid';
            order.payment_intent_id = payment_intent_id;
            await order.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Payment confirmed. Order is now being prepared.',
                data: order
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new POSController();