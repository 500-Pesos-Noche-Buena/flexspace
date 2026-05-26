// controllers/user/orderController.js
const { Order, Product, Space } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class UserOrderController {
    
    getUserId = (req) => {
        return req.user?.sub || req.user?._id || req.user?.id;
    };

    // Get user's own orders
    getMyOrders = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { status = '', page = 1, limit = 10 } = req.query;
            
            let query = { user_id: userId, order_type: 'online' };
            if (status) query.status = status;
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const orders = await Order.find(query)
                .populate('space_id', 'name address')
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(parseInt(limit));
            
            const total = await Order.countDocuments(query);
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    orders,
                    total,
                    page: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            next(error);
        }
    };

    // Get single order details
    getOrderDetails = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { orderId } = req.params;
            
            const order = await Order.findOne({ 
                _id: orderId, 
                user_id: userId,
                order_type: 'online'
            }).populate('space_id', 'name address');
            
            if (!order) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
            }
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: order
            });
        } catch (error) {
            next(error);
        }
    };

    // Get order by order number
    getOrderByNumber = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { orderNumber } = req.params;
            
            const order = await Order.findOne({ 
                order_number: orderNumber, 
                user_id: userId 
            }).populate('space_id', 'name address');
            
            if (!order) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
            }
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: order
            });
        } catch (error) {
            next(error);
        }
    };

    // Create order from user (chat order)
    createOrder = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { 
                items, 
                payment_method, 
                special_instructions,
                customer_name 
            } = req.body;
            
            if (!items || items.length === 0) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No items in order');
            }
            
            // Calculate totals
            let subtotal = 0;
            for (const item of items) {
                const product = await Product.findById(item.product_id);
                if (!product) {
                    throw new ApiError(HTTP_STATUS.NOT_FOUND, `Product ${item.name} not found`);
                }
                if (product.stock < item.quantity) {
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Insufficient stock for ${product.name}`);
                }
                subtotal += product.price * item.quantity;
                item.name = product.name;
                item.price = product.price;
            }
            
            const tax = subtotal * 0.12;
            const total = subtotal + tax;
            
            // Determine order status based on payment method
            let orderStatus = 'pending_payment';
            let paymentStatus = 'unpaid';
            
            if (payment_method === 'cash') {
                orderStatus = 'confirmed';
                paymentStatus = 'paid';
            }
            
            // Generate order number
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 10000);
            const orderNumber = `ORD-${timestamp}-${random}`;
            
            // Get user's default space (or first available space)
            const spaces = await Space.find({ status: 'Open Now' }).limit(1);
            const spaceId = spaces[0]?._id;
            
            if (!spaceId) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No active spaces available');
            }
            
            const orderData = {
                order_number: orderNumber,
                space_id: spaceId,
                user_id: userId,
                items: items,
                subtotal: subtotal,
                tax: tax,
                discount_type: null,
                discount_value: 0,
                discount_amount: 0,
                total: total,
                payment_method: payment_method,
                amount_received: total,
                customer_name: customer_name || 'Customer',
                order_type: 'online',
                status: orderStatus,
                payment_status: paymentStatus,
                special_instructions: special_instructions || null
            };
            
            const order = await Order.create(orderData);
            
            // Update product stock
            for (const item of items) {
                await Product.findByIdAndUpdate(item.product_id, { $inc: { stock: -item.quantity } });
            }
            
            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Order created successfully',
                data: order
            });
        } catch (error) {
            console.error('Create order error:', error);
            next(error);
        }
    };

    // Cancel order (only if pending or pending_payment)
    cancelOrder = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { orderId } = req.params;
            
            const order = await Order.findOne({ 
                _id: orderId, 
                user_id: userId 
            });
            
            if (!order) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
            }
            
            if (!['pending', 'pending_payment'].includes(order.status)) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Order cannot be cancelled at this stage');
            }
            
            // Restore stock
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.product_id, { $inc: { stock: item.quantity } });
            }
            
            order.status = 'cancelled';
            await order.save();
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Order cancelled successfully',
                data: order
            });
        } catch (error) {
            next(error);
        }
    };

    // Get order status
    getOrderStatus = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { orderId } = req.params;
            
            const order = await Order.findOne({ 
                _id: orderId, 
                user_id: userId 
            }).select('status payment_status total order_number');
            
            if (!order) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
            }
            
            const statusMessages = {
                pending: 'Order received, waiting for payment confirmation',
                pending_payment: 'Awaiting payment confirmation',
                confirmed: 'Payment confirmed, preparing your order',
                preparing: 'Your order is being prepared',
                ready: 'Your order is ready for pickup',
                completed: 'Order completed. Thank you!',
                cancelled: 'Order cancelled'
            };
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    status: order.status,
                    payment_status: order.payment_status,
                    message: statusMessages[order.status] || 'Processing',
                    total: order.total,
                    order_number: order.order_number
                }
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new UserOrderController();