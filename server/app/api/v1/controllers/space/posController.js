const { Order, Product, Space, User } = require('@/api/v1/models');
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

            // If user is staff, they can only access their assigned space
            if (userRole === 'staff') {
                const staffRecord = await User.findById(userId).select('space_id parent_id');
                if (!staffRecord?.space_id) {
                    return res.status(HTTP_STATUS.OK).json({ success: true, data: [] });
                }
                targetSpaceId = staffRecord.space_id;
                query.space_id = targetSpaceId;
            }
            // If user is space owner or admin
            else {
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

            // Check permissions
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

            // Check permissions
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

            // Staff can only create orders for their assigned space
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
            if (payment_method === 'cash' || payment_method === 'qr') {
                initialStatus = 'confirmed';
            } else if (payment_method === 'online') {
                initialStatus = 'pending_payment';
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
                amount_received: amount_received,
                change: change,
                customer_name: customer_name || 'Walk-in Customer',
                order_type: order_type || 'pos',
                status: initialStatus,
                payment_status: initialStatus === 'confirmed' ? 'paid' : 'unpaid'
            };

            const order = await Order.create(orderData);

            // Update product stock
            for (const item of items) {
                await Product.findByIdAndUpdate(item.product_id, { $inc: { stock: -item.quantity } });
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
                // Staff can only see orders from their assigned space
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