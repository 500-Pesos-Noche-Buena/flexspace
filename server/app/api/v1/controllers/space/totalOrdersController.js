const { Booking, Order, Space, User } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class TotalOrdersController {
    /**
     * Get user ID from request
     */
    getUserId = (req) => req.user?.sub || req.user?._id || req.user?.id;

    /**
     * Get accessible space IDs based on user role
     */
    getAccessibleSpaceIds = async (req) => {
        const userId = this.getUserId(req);
        const user = req.user;

        if (user?.role === 'staff') {
            const staffUser = await User.findById(userId).select('space_id parent_id');
            if (staffUser?.space_id) return [staffUser.space_id];
            if (staffUser?.parent_id) {
                const userSpaces = await Space.find({ user_id: staffUser.parent_id }).select('_id');
                return userSpaces.map(s => s._id);
            }
            return [];
        }

        const userSpaces = await Space.find({ user_id: userId }).select('_id');
        return userSpaces.map(s => s._id);
    };

    /**
     * Safe date formatter helper
     */
    safeDate = (dateValue) => {
        if (!dateValue) return new Date();
        const d = new Date(dateValue);
        return isNaN(d.getTime()) ? new Date() : d;
    };

    /**
     * Get all orders grouped by customer per day
     * GET /api/v1/space/total-orders
     */
    getTotalOrders = async (req, res, next) => {
        try {
            const { 
                search = '', 
                status = '', 
                type = 'all',
                page = 1, 
                limit = 20,
                sort = 'newest'
            } = req.query;

            const spaceIds = await this.getAccessibleSpaceIds(req);

            if (spaceIds.length === 0) {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    data: {
                        orders: [],
                        total: 0,
                        stats: { total: 0, bookings: 0, pos_orders: 0, pay_later: 0, revenue: 0 }
                    }
                });
            }

            // Build queries
            let bookingQuery = { space_id: { $in: spaceIds } };
            let orderQuery = { space_id: { $in: spaceIds } };

            if (status) {
                const statusArray = status.split(',').map(s => s.trim());
                if (statusArray.length === 1) {
                    bookingQuery.status = statusArray[0];
                    orderQuery.status = statusArray[0];
                } else {
                    bookingQuery.status = { $in: statusArray };
                    orderQuery.status = { $in: statusArray };
                }
            }

            if (search) {
                bookingQuery.$or = [
                    { ticket_number: { $regex: search, $options: 'i' } },
                    { guest_name: { $regex: search, $options: 'i' } }
                ];
                orderQuery.$or = [
                    { order_number: { $regex: search, $options: 'i' } },
                    { customer_name: { $regex: search, $options: 'i' } }
                ];
            }

            if (type === 'booking') {
                orderQuery = { _id: null };
            } else if (type === 'pos') {
                bookingQuery = { _id: null };
            } else if (type === 'pay_later') {
                orderQuery.is_pay_later = true;
                bookingQuery = { _id: null };
            }

            // Fetch data
            let bookings = [];
            let posOrders = [];

            if (type !== 'pos' && type !== 'pay_later') {
                bookings = await Booking.find(bookingQuery)
                    .populate('space_id', 'name')
                    .populate('user_id', 'name email')
                    .sort({ created_at: -1 })
                    .lean();
            }

            if (type !== 'booking') {
                posOrders = await Order.find(orderQuery)
                    .populate('space_id', 'name')
                    .populate('user_id', 'name email')
                    .sort({ created_at: -1 })
                    .lean();
            }

            // Format all items with safe date handling
            const formattedBookings = bookings.map(booking => ({
                _id: booking._id,
                order_number: booking.ticket_number || booking._id.toString().slice(-8),
                order_type: 'booking',
                source_type: booking.booking_type || 'online',
                customer_name: booking.user_id?.name || booking.guest_name || 'Guest',
                customer_email: booking.user_id?.email || null,
                items: [],
                subtotal: booking.total_amount || 0,
                tax: 0,
                discount_amount: booking.voucher_discount || 0,
                total: booking.total_amount || 0,
                payment_method: booking.payment_method || 'online',
                status: booking.status,
                payment_status: booking.payment_status || 'unpaid',
                created_at: booking.created_at || new Date(),
                updated_at: booking.updated_at || new Date(),
                space_id: booking.space_id,
                user_id: booking.user_id,
                is_pay_later: false,
                check_in_at: booking.check_in_at,
                check_out_at: booking.check_out_at,
                start_time: booking.start_time,
                end_time: booking.end_time,
                is_open_time: booking.is_open_time,
                booking_id: booking._id,
                room_id: booking.room_id,
                voucher_applied: booking.voucher_applied,
                original_data: booking
            }));

            const formattedOrders = posOrders.map(order => ({
                _id: order._id,
                order_number: order.order_number,
                order_type: 'pos_order',
                source_type: 'pos',
                customer_name: order.customer_name || 'Guest',
                customer_email: null,
                items: order.items || [],
                subtotal: order.subtotal || 0,
                tax: order.tax || 0,
                discount_amount: order.discount_amount || 0,
                total: order.total || 0,
                payment_method: order.payment_method || 'cash',
                status: order.status,
                payment_status: order.payment_status || 'unpaid',
                created_at: order.created_at || new Date(),
                updated_at: order.updated_at || new Date(),
                space_id: order.space_id,
                user_id: order.user_id,
                is_pay_later: order.is_pay_later || false,
                pay_later_status: order.pay_later_status,
                pay_later_payments: order.pay_later_payments,
                order_id: order._id,
                items_count: order.items?.length || 0,
                amount_received: order.amount_received,
                change: order.change,
                voucher_code: order.voucher_code,
                original_data: order
            }));

            // Combine all orders
            let allOrders = [...formattedBookings, ...formattedOrders];

            // GROUP BY CUSTOMER + DAY
            const groupedOrders = {};
            
            allOrders.forEach(order => {
                // Safe date handling
                let dateKey = 'unknown-date';
                try {
                    const dateObj = new Date(order.created_at);
                    if (!isNaN(dateObj.getTime())) {
                        dateKey = dateObj.toISOString().split('T')[0];
                    }
                } catch (e) {
                    dateKey = 'unknown-date';
                }
                
                const customerKey = (order.customer_name || 'Guest').toLowerCase().trim();
                const groupKey = `${customerKey}_${dateKey}`;
                
                if (!groupedOrders[groupKey]) {
                    groupedOrders[groupKey] = {
                        _id: groupKey,
                        customer_name: order.customer_name || 'Guest',
                        date: dateKey,
                        orders: [],
                        total: 0,
                        order_count: 0,
                        payment_methods: new Set(),
                        statuses: new Set(),
                        payment_statuses: new Set(),
                        first_order: order,
                        latest_order: order
                    };
                }
                
                groupedOrders[groupKey].orders.push(order);
                groupedOrders[groupKey].total += (order.total || 0);
                groupedOrders[groupKey].order_count += 1;
                groupedOrders[groupKey].payment_methods.add(order.payment_method || 'unknown');
                groupedOrders[groupKey].statuses.add(order.status || 'pending');
                groupedOrders[groupKey].payment_statuses.add(order.payment_status || 'unpaid');
                
                // Keep track of latest order
                try {
                    const latestDate = new Date(groupedOrders[groupKey].latest_order.created_at);
                    const currentDate = new Date(order.created_at);
                    if (!isNaN(currentDate.getTime()) && currentDate > latestDate) {
                        groupedOrders[groupKey].latest_order = order;
                    }
                } catch (e) {
                    // If date comparison fails, keep existing
                }
            });

// Convert grouped orders to array - FINAL FIXED
let groupedArray = Object.values(groupedOrders).map(group => {
    const latestOrder = group.latest_order || group.orders[0] || {};
    
    // ✅ FIX: Determine status based on ALL orders in the group
    let groupStatus = 'pending';
    const statuses = Array.from(group.statuses);
    
    if (statuses.includes('pending_payment')) {
        groupStatus = 'pending_payment';
    } else if (statuses.includes('active')) {
        groupStatus = 'active';
    } else if (statuses.includes('pending')) {
        groupStatus = 'pending';
    } else if (statuses.every(s => s === 'completed')) {
        groupStatus = 'completed';
    } else if (statuses.every(s => s === 'confirmed')) {
        groupStatus = 'confirmed';
    } else if (statuses.every(s => s === 'ready')) {
        groupStatus = 'ready';
    } else if (statuses.every(s => s === 'cancelled')) {
        groupStatus = 'cancelled';
    } else if (statuses.includes('rejected')) {
        groupStatus = 'rejected';
    } else {
        groupStatus = statuses[0] || 'pending';
    }
    
    // ✅ FIX: Determine payment_status
    const paymentStatuses = Array.from(group.payment_statuses);
    let groupPaymentStatus = 'unpaid';
    if (paymentStatuses.every(s => s === 'paid' || s === 'completed')) {
        groupPaymentStatus = 'paid';
    } else if (paymentStatuses.some(s => s === 'paid' || s === 'completed')) {
        groupPaymentStatus = 'partial';
    } else {
        groupPaymentStatus = 'unpaid';
    }
    
    // ✅ FIX: Calculate pay later totals from ALL orders
    const payLaterOrders = group.orders.filter(o => o.is_pay_later || o.payment_method === 'pay_later');
    const totalPayLaterAmount = payLaterOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    // ✅ CRITICAL FIX: Get the accumulated total from each order's pay_later_total_accumulated
    const totalPayLaterPaid = payLaterOrders.reduce((sum, o) => sum + (o.pay_later_total_accumulated || 0), 0);
    const remainingPayLater = Math.max(0, totalPayLaterAmount - totalPayLaterPaid);
    
    // ✅ FIX: Determine pay_later_status based on ALL orders
    let groupPayLaterStatus = null;
    if (payLaterOrders.length > 0) {
        const payLaterStatuses = payLaterOrders.map(o => o.pay_later_status || 'pending');
        if (payLaterStatuses.every(s => s === 'settled')) {
            groupPayLaterStatus = 'settled';
        } else if (payLaterStatuses.some(s => s === 'pending')) {
            groupPayLaterStatus = 'pending';
        } else if (payLaterStatuses.some(s => s === 'partially_paid')) {
            groupPayLaterStatus = 'partially_paid';
        } else {
            groupPayLaterStatus = payLaterStatuses[0] || 'pending';
        }
    }
    
    // Determine if this is a Pay Later group
    const isPayLaterGroup = payLaterOrders.length > 0;
    
    // ✅ Log for debugging
    console.log(`Group ${group.customer_name}: payLaterOrders=${payLaterOrders.length}, totalPaid=${totalPayLaterPaid}, totalAmount=${totalPayLaterAmount}, remaining=${remainingPayLater}`);
    
    return {
        _id: group._id,
        customer_name: group.customer_name,
        date: group.date,
        order_count: group.order_count,
        total: group.total,
        payment_methods: Array.from(group.payment_methods).join(', '),
        statuses: Array.from(group.statuses),
        orders: group.orders,
        latest_order: latestOrder,
        created_at: latestOrder.created_at || new Date(),
        order_number: latestOrder.order_number || 'N/A',
        order_type: group.orders.some(o => o.order_type === 'booking') ? 'booking' : 'pos_order',
        items: group.orders.reduce((acc, o) => [...acc, ...(o.items || [])], []),
        subtotal: group.total,
        tax: 0,
        discount_amount: 0,
        payment_method: Array.from(group.payment_methods).join(', '),
        status: groupStatus,
        payment_status: groupPaymentStatus,
        grouped_orders: group.orders,
        is_grouped: true,
        is_pay_later: isPayLaterGroup,
        pay_later_status: groupPayLaterStatus,
        // ✅ CRITICAL FIX: Pass the actual accumulated amount
        pay_later_total_accumulated: totalPayLaterPaid,
        pay_later_remaining: remainingPayLater
    };
});

            // Sort grouped orders with safe date handling
            groupedArray.sort((a, b) => {
                try {
                    const dateA = new Date(a.created_at);
                    const dateB = new Date(b.created_at);
                    if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
                    if (isNaN(dateA.getTime())) return 1;
                    if (isNaN(dateB.getTime())) return -1;
                    
                    switch(sort) {
                        case 'newest':
                            return dateB - dateA;
                        case 'oldest':
                            return dateA - dateB;
                        case 'highest':
                            return (b.total || 0) - (a.total || 0);
                        case 'lowest':
                            return (a.total || 0) - (b.total || 0);
                        default:
                            return dateB - dateA;
                    }
                } catch (e) {
                    return 0;
                }
            });

            const total = groupedArray.length;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const paginatedOrders = groupedArray.slice(skip, skip + parseInt(limit));

            // Calculate stats
            const totalRevenue = groupedArray.reduce((sum, g) => sum + (g.total || 0), 0);
            const bookingCount = allOrders.filter(o => o.order_type === 'booking').length;
            const posCount = allOrders.filter(o => o.order_type === 'pos_order').length;
            const payLaterCount = allOrders.filter(o => o.is_pay_later).length;

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    orders: paginatedOrders,
                    total: total,
                    stats: {
                        total: total,
                        bookings: bookingCount,
                        pos_orders: posCount,
                        pay_later: payLaterCount,
                        revenue: totalRevenue,
                        booking_revenue: allOrders.filter(o => o.order_type === 'booking').reduce((s, o) => s + (o.total || 0), 0),
                        pos_revenue: allOrders.filter(o => o.order_type === 'pos_order').reduce((s, o) => s + (o.total || 0), 0),
                        status_counts: {}
                    },
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: total,
                        pages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            console.error('Get total orders error:', error);
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    orders: [],
                    total: 0,
                    stats: { total: 0, bookings: 0, pos_orders: 0, pay_later: 0, revenue: 0 },
                    pagination: { page: 1, limit: 20, total: 0, pages: 0 }
                }
            });
        }
    };

    /**
     * Get a single order by ID
     * GET /api/v1/space/total-orders/:id
     */
    getOrderById = async (req, res, next) => {
        try {
            const { id } = req.params;
            const spaceIds = await this.getAccessibleSpaceIds(req);

            if (spaceIds.length === 0) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
            }

            let order = await Booking.findOne({
                _id: id,
                space_id: { $in: spaceIds }
            })
            .populate('space_id', 'name')
            .populate('user_id', 'name email')
            .lean();

            let orderType = 'booking';
            let isGrouped = false;

            if (!order) {
                order = await Order.findOne({
                    $or: [{ _id: id }, { order_number: id }],
                    space_id: { $in: spaceIds }
                })
                .populate('space_id', 'name')
                .populate('user_id', 'name email')
                .lean();
                orderType = 'pos_order';
            }

            if (!order) {
                const parts = id.split('_');
                if (parts.length === 2) {
                    isGrouped = true;
                    const customerName = parts[0];
                    const date = parts[1];
                    
                    const bookings = await Booking.find({
                        space_id: { $in: spaceIds },
                        guest_name: { $regex: customerName, $options: 'i' }
                    }).lean();
                    
                    const posOrders = await Order.find({
                        space_id: { $in: spaceIds },
                        customer_name: { $regex: customerName, $options: 'i' }
                    }).lean();
                    
                    const allOrders = [...bookings, ...posOrders];
                    
                    if (allOrders.length === 0) {
                        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
                    }
                    
                    return res.status(HTTP_STATUS.OK).json({
                        success: true,
                        data: {
                            is_grouped: true,
                            customer_name: customerName,
                            date: date,
                            orders: allOrders.map(o => ({
                                ...o,
                                order_type: o.ticket_number ? 'booking' : 'pos_order',
                                order_number: o.ticket_number || o.order_number,
                                total: o.total_amount || o.total || 0,
                                items: o.items || [],
                                status: o.status,
                                payment_method: o.payment_method || 'cash',
                                created_at: o.created_at || new Date()
                            })),
                            total: allOrders.reduce((sum, o) => sum + (o.total_amount || o.total || 0), 0)
                        }
                    });
                }
                
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
            }

            let formattedOrder;
            if (orderType === 'booking') {
                formattedOrder = {
                    ...order,
                    order_type: 'booking',
                    source_type: order.booking_type || 'online',
                    order_number: order.ticket_number || order._id.toString().slice(-8),
                    is_grouped: false
                };
            } else {
                formattedOrder = {
                    ...order,
                    order_type: 'pos_order',
                    source_type: 'pos',
                    items_count: order.items?.length || 0,
                    is_grouped: false
                };
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: formattedOrder
            });

        } catch (error) {
            console.error('Get order by ID error:', error);
            next(error);
        }
    };

    /**
     * Get order stats summary
     * GET /api/v1/space/total-orders/stats
     */
    getOrderStats = async (req, res, next) => {
        try {
            const spaceIds = await this.getAccessibleSpaceIds(req);

            if (spaceIds.length === 0) {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    data: {
                        total_orders: 0,
                        total_bookings: 0,
                        total_pos_orders: 0,
                        total_pay_later: 0,
                        total_revenue: 0,
                        pending_count: 0,
                        active_count: 0,
                        completed_count: 0,
                        today_orders: 0,
                        today_revenue: 0,
                        monthly_revenue: 0,
                        recent_orders: []
                    }
                });
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            const totalBookings = await Booking.countDocuments({ space_id: { $in: spaceIds } });
            const totalPosOrders = await Order.countDocuments({ space_id: { $in: spaceIds } });
            const totalPayLater = await Order.countDocuments({
                space_id: { $in: spaceIds },
                is_pay_later: true,
                pay_later_status: 'pending'
            });

            const bookingRevenue = await Booking.aggregate([
                { $match: { space_id: { $in: spaceIds }, status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$total_amount' } } }
            ]);

            const orderRevenue = await Order.aggregate([
                { $match: { space_id: { $in: spaceIds }, status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]);

            const todayBookings = await Booking.countDocuments({
                space_id: { $in: spaceIds },
                created_at: { $gte: today }
            });

            const todayOrders = await Order.countDocuments({
                space_id: { $in: spaceIds },
                created_at: { $gte: today }
            });

            const todayBookingRevenue = await Booking.aggregate([
                { $match: { space_id: { $in: spaceIds }, status: 'completed', created_at: { $gte: today } } },
                { $group: { _id: null, total: { $sum: '$total_amount' } } }
            ]);

            const todayOrderRevenue = await Order.aggregate([
                { $match: { space_id: { $in: spaceIds }, status: 'completed', created_at: { $gte: today } } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]);

            const monthlyBookingRevenue = await Booking.aggregate([
                { $match: { space_id: { $in: spaceIds }, status: 'completed', created_at: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$total_amount' } } }
            ]);

            const monthlyOrderRevenue = await Order.aggregate([
                { $match: { space_id: { $in: spaceIds }, status: 'completed', created_at: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    total_orders: totalBookings + totalPosOrders,
                    total_bookings: totalBookings,
                    total_pos_orders: totalPosOrders,
                    total_pay_later: totalPayLater,
                    total_revenue: (bookingRevenue[0]?.total || 0) + (orderRevenue[0]?.total || 0),
                    today_orders: todayBookings + todayOrders,
                    today_revenue: (todayBookingRevenue[0]?.total || 0) + (todayOrderRevenue[0]?.total || 0),
                    monthly_revenue: (monthlyBookingRevenue[0]?.total || 0) + (monthlyOrderRevenue[0]?.total || 0)
                }
            });

        } catch (error) {
            console.error('Get order stats error:', error);
            next(error);
        }
    };
}

module.exports = new TotalOrdersController();