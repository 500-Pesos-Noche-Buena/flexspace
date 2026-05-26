const { Order, Product, Space, User } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class POSController {
    getOwnerId = async (req) => {
        const userId = req.user?.sub || req.user?._id || req.user?.id;
        if (req.user?.role === 'staff') {
            const staffRecord = await User.findById(userId).select('parent_id');
            return staffRecord?.parent_id || userId;
        }
        return userId;
    };

    getProducts = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const spaces = await Space.find({ user_id: ownerId }).select('_id');
            const spaceIds = spaces.map(s => s._id);

            const products = await Product.find({ space_id: { $in: spaceIds }, is_available: true })
                .sort({ category: 1, name: 1 });

            return res.status(HTTP_STATUS.OK).json({ success: true, data: products });
        } catch (error) {
            next(error);
        }
    };

    createProduct = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const spaces = await Space.find({ user_id: ownerId }).select('_id');

            if (spaces.length === 0) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No spaces found');
            }

            const product = await Product.create({
                ...req.body,
                space_id: spaces[0]._id,
                created_by: ownerId
            });

            return res.status(HTTP_STATUS.CREATED).json({ success: true, data: product });
        } catch (error) {
            next(error);
        }
    };

    updateProduct = async (req, res, next) => {
        try {
            const { id } = req.params;
            const product = await Product.findByIdAndUpdate(id, req.body, { new: true });
            if (!product) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found');
            }
            return res.status(HTTP_STATUS.OK).json({ success: true, data: product });
        } catch (error) {
            next(error);
        }
    };

    deleteProduct = async (req, res, next) => {
        try {
            const { id } = req.params;
            const product = await Product.findByIdAndUpdate(id, { is_available: false });
            if (!product) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found');
            }
            return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Product deleted' });
        } catch (error) {
            next(error);
        }
    };

    // Create order with proper status flow
    createOrder = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const spaces = await Space.find({ user_id: ownerId }).select('_id');

            if (spaces.length === 0) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No spaces found');
            }

            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 10000);
            const orderNumber = `ORD-${timestamp}-${random}`;

            let change = 0;
            if (req.body.payment_method === 'cash' && req.body.amount_received) {
                change = Math.max(0, req.body.amount_received - req.body.total);
            }

            // Determine initial status based on payment method
            let initialStatus = 'pending';
            if (req.body.payment_method === 'cash' || req.body.payment_method === 'qr') {
                initialStatus = 'confirmed'; // Payment confirmed immediately
            } else if (req.body.payment_method === 'online') {
                initialStatus = 'pending_payment'; // Awaiting online payment
            }

            const orderData = {
                order_number: orderNumber,
                space_id: spaces[0]._id,
                processed_by: ownerId,
                items: req.body.items,
                subtotal: req.body.subtotal,
                tax: req.body.tax || 0,
                discount_type: req.body.discount_type || null,
                discount_value: req.body.discount_value || 0,
                discount_amount: req.body.discount_amount || 0,
                total: req.body.total,
                payment_method: req.body.payment_method,
                amount_received: req.body.amount_received,
                change: change,
                customer_name: req.body.customer_name || 'Walk-in Customer',
                order_type: req.body.order_type || 'pos',
                status: initialStatus,
                payment_status: initialStatus === 'confirmed' ? 'paid' : 'unpaid'
            };

            const order = await Order.create(orderData);

            // Update product stock
            for (const item of req.body.items) {
                await Product.findByIdAndUpdate(item.product_id, { $inc: { stock: -item.quantity } });
            }

            return res.status(HTTP_STATUS.CREATED).json({ success: true, data: order });
        } catch (error) {
            console.error('Create order error:', error);
            next(error);
        }
    };

    // Update order status
    updateOrderStatus = async (req, res, next) => {
        try {
            const { orderId } = req.params;
            const { status } = req.body;

            const validStatuses = ['pending', 'pending_payment', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'];
            if (!validStatuses.includes(status)) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid status');
            }

            const order = await Order.findById(orderId);
            if (!order) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
            }

            order.status = status;
            if (status === 'completed' || status === 'confirmed') {
                order.payment_status = 'paid';
            }
            await order.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `Order status updated to ${status}`,
                data: order
            });
        } catch (error) {
            next(error);
        }
    };

    getOrders = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const spaces = await Space.find({ user_id: ownerId }).select('_id');
            const spaceIds = spaces.map(s => s._id);

            const orders = await Order.find({ space_id: { $in: spaceIds } })
                .sort({ created_at: -1 });

            return res.status(HTTP_STATUS.OK).json({ success: true, data: orders });
        } catch (error) {
            next(error);
        }
    };

    getRecentOrders = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const spaces = await Space.find({ user_id: ownerId }).select('_id');
            const spaceIds = spaces.map(s => s._id);

            const orders = await Order.find({ space_id: { $in: spaceIds } })
                .sort({ created_at: -1 })
                .limit(10);

            return res.status(HTTP_STATUS.OK).json({ success: true, data: orders });
        } catch (error) {
            next(error);
        }
    };

    getIncomeStats = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const spaces = await Space.find({ user_id: ownerId }).select('_id');
            const spaceIds = spaces.map(s => s._id);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);

            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);

            const [daily, weekly, monthly, total] = await Promise.all([
                Order.aggregate([
                    { $match: { space_id: { $in: spaceIds }, created_at: { $gte: today } } },
                    { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
                ]),
                Order.aggregate([
                    { $match: { space_id: { $in: spaceIds }, created_at: { $gte: weekAgo } } },
                    { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
                ]),
                Order.aggregate([
                    { $match: { space_id: { $in: spaceIds }, created_at: { $gte: monthAgo } } },
                    { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
                ]),
                Order.aggregate([
                    { $match: { space_id: { $in: spaceIds } } },
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


    // Add this method to POSController
    confirmOnlinePayment = async (req, res, next) => {
        try {
            const { orderId } = req.params;
            const { payment_intent_id } = req.body;

            const order = await Order.findOne({ order_number: orderId });

            if (!order) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
            }

            // Update to confirmed (not completed)
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