const { Booking, Space, User, Settings, Order, Earnings } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class EarningsController {

    getOwnerId = async (req) => {
        const userId = req.user?.sub || req.user?._id || req.user?.id;
        if (req.user?.role === 'staff') {
            const staffRecord = await User.findById(userId).select('parent_id');
            if (staffRecord?.parent_id) return staffRecord.parent_id.toString();
        }
        return userId?.toString();
    };

    getAccessibleSpaceIds = async (req) => {
        const userId = req.user?.sub || req.user?._id || req.user?.id;
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

    index = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const isAdmin = req.user?.role === 'admin';

            const {
                period = 'daily',
                dateFrom = null,
                dateTo = null,
                page = 1,
                limit = 10,
                search = ''
            } = req.query;

            // ── Get date range ─────────────────────────────────────────────
            let startDate, endDate;
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            if (dateFrom && dateTo) {
                const fromParts = dateFrom.split('-');
                const toParts = dateTo.split('-');
                startDate = new Date(parseInt(fromParts[0]), parseInt(fromParts[1]) - 1, parseInt(fromParts[2]));
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(parseInt(toParts[0]), parseInt(toParts[1]) - 1, parseInt(toParts[2]));
                endDate.setHours(23, 59, 59, 999);
            } else {
                if (period === 'daily') {
                    startDate = new Date(today);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(today);
                    endDate.setHours(23, 59, 59, 999);
                } else if (period === 'weekly') {
                    startDate = new Date(today);
                    startDate.setDate(startDate.getDate() - 7);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(today);
                    endDate.setHours(23, 59, 59, 999);
                } else if (period === 'monthly') {
                    startDate = new Date(today);
                    startDate.setMonth(startDate.getMonth() - 1);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(today);
                    endDate.setHours(23, 59, 59, 999);
                } else if (period === 'yearly') {
                    startDate = new Date(today);
                    startDate.setFullYear(startDate.getFullYear() - 1);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(today);
                    endDate.setHours(23, 59, 59, 999);
                }
            }

            console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

            // ── Space scope ───────────────────────────────────────────────
            let spaceIds = [];
            if (isAdmin) {
                const all = await Space.find({}).select('_id');
                spaceIds = all.map(s => s._id);
            } else {
                const own = await Space.find({ user_id: ownerId }).select('_id');
                spaceIds = own.map(s => s._id);
            }

            // ── Get ALL Earnings (Bookings + POS) ──────────────────────────
            let bookingEarningsQuery = {
                space_id: { $in: spaceIds },
                booking_id: { $ne: null },
                booking_date: { $gte: startDate, $lte: endDate }
            };

            let posEarningsQuery = {
                space_id: { $in: spaceIds },
                booking_id: null,
                booking_date: { $gte: startDate, $lte: endDate }
            };

            if (search) {
                bookingEarningsQuery.$or = [
                    { order_number: { $regex: search, $options: 'i' } }
                ];
                posEarningsQuery.$or = [
                    { order_number: { $regex: search, $options: 'i' } }
                ];
            }

            // ── Aggregated stats ──────────────────────────────────────────
            const [bookingEarningsAgg, bookingEarningsCount, posEarningsAgg, posEarningsCount] = await Promise.all([
                Earnings.aggregate([
                    { $match: bookingEarningsQuery },
                    { $group: { _id: null, totalRevenue: { $sum: '$total_amount' }, count: { $sum: 1 }, totalDiscount: { $sum: 0 } } }
                ]),
                Earnings.countDocuments(bookingEarningsQuery),
                Earnings.aggregate([
                    { $match: posEarningsQuery },
                    { $group: { _id: null, totalRevenue: { $sum: '$total_amount' }, count: { $sum: 1 }, totalDiscount: { $sum: 0 } } }
                ]),
                Earnings.countDocuments(posEarningsQuery)
            ]);

            console.log(`📊 Booking Earnings Count: ${bookingEarningsCount}`);
            console.log(`📊 POS Earnings Count: ${posEarningsCount}`);

            // ── Combine totals ──────────────────────────────────────────
            const bookingRevenue = bookingEarningsAgg[0]?.totalRevenue || 0;
            const posRevenue = posEarningsAgg[0]?.totalRevenue || 0;
            const totalRevenue = bookingRevenue + posRevenue;

            const bookingCountTotal = bookingEarningsCount || 0;
            const posCountTotal = posEarningsCount || 0;
            const totalTransactions = bookingCountTotal + posCountTotal;

            const feePercent = 10; // 10% platform fee
            const totalPlatformFee = totalRevenue * (feePercent / 100);
            const totalNetEarnings = totalRevenue - totalPlatformFee;

            const bookingPlatformFee = bookingRevenue * (feePercent / 100);
            const bookingNetEarnings = bookingRevenue - bookingPlatformFee;

            // ── Fetch combined transactions ──────────────────────────────
            const bookingEarnings = await Earnings.find(bookingEarningsQuery)
                .populate('space_id', 'name')
                .sort({ booking_date: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const posEarnings = await Earnings.find(posEarningsQuery)
                .populate('space_id', 'name')
                .sort({ booking_date: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            console.log(`📊 Found ${bookingEarnings.length} booking earnings and ${posEarnings.length} POS earnings`);

            // Combine and sort transactions by date
            let combinedTransactions = [
                ...bookingEarnings.map(e => ({
                    id: e._id,
                    reference: e.order_number || e._id.toString().slice(-8),
                    guest: 'Booking Customer',
                    space: e.space_id?.name || 'N/A',
                    amount: e.total_amount || 0,
                    originalAmount: e.total_amount || 0,
                    discount: 0,
                    type: 'Booking',
                    date: e.booking_date || e.created_at,
                    hasVoucher: false,
                    source: 'booking'
                })),
                ...posEarnings.map(e => ({
                    id: e._id,
                    reference: e.order_number || e._id.toString().slice(-8),
                    guest: 'POS Customer',
                    space: e.space_id?.name || 'N/A',
                    amount: e.total_amount || 0,
                    originalAmount: e.total_amount || 0,
                    discount: 0,
                    type: 'POS',
                    date: e.booking_date || e.created_at,
                    hasVoucher: false,
                    source: 'pos'
                }))
            ];

            // Sort by date descending
            combinedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Paginate
            const total = combinedTransactions.length;
            const paginatedTransactions = combinedTransactions.slice(
                (page - 1) * limit,
                page * limit
            );

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    // Overall totals
                    totalRevenue,
                    totalNetEarnings,
                    totalPlatformFee,
                    feePercent,
                    transactionCount: totalTransactions,
                    totalDiscountGiven: 0,
                    totalVoucherDiscount: 0,
                    bookingsWithVouchers: 0,
                    total,
                    // Booking breakdown
                    breakdown: {
                        bookings: {
                            revenue: bookingRevenue,
                            netEarnings: bookingNetEarnings,
                            platformFee: bookingPlatformFee,
                            count: bookingCountTotal,
                            discount: 0
                        },
                        pos_orders: {
                            revenue: posRevenue,
                            count: posCountTotal,
                            discount: 0
                        }
                    },
                    transactions: paginatedTransactions
                }
            });
        } catch (error) {
            console.error('Earnings error:', error);
            next(error);
        }
    };

    // ============================================
    // EXPORT TO CSV
    // ============================================
    exportCSV = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const isAdmin = req.user?.role === 'admin';

            const {
                period = 'daily',
                dateFrom = null,
                dateTo = null,
                search = ''
            } = req.query;

            let startDate, endDate;
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            if (dateFrom && dateTo) {
                const fromParts = dateFrom.split('-');
                const toParts = dateTo.split('-');
                startDate = new Date(parseInt(fromParts[0]), parseInt(fromParts[1]) - 1, parseInt(fromParts[2]));
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(parseInt(toParts[0]), parseInt(toParts[1]) - 1, parseInt(toParts[2]));
                endDate.setHours(23, 59, 59, 999);
            } else {
                if (period === 'daily') {
                    startDate = new Date(today);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(today);
                    endDate.setHours(23, 59, 59, 999);
                } else if (period === 'weekly') {
                    startDate = new Date(today);
                    startDate.setDate(startDate.getDate() - 7);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(today);
                    endDate.setHours(23, 59, 59, 999);
                } else if (period === 'monthly') {
                    startDate = new Date(today);
                    startDate.setMonth(startDate.getMonth() - 1);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(today);
                    endDate.setHours(23, 59, 59, 999);
                } else if (period === 'yearly') {
                    startDate = new Date(today);
                    startDate.setFullYear(startDate.getFullYear() - 1);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(today);
                    endDate.setHours(23, 59, 59, 999);
                }
            }

            let spaceIds = [];
            if (isAdmin) {
                const all = await Space.find({}).select('_id');
                spaceIds = all.map(s => s._id);
            } else {
                const own = await Space.find({ user_id: ownerId }).select('_id');
                spaceIds = own.map(s => s._id);
            }

            const bookingQuery = {
                space_id: { $in: spaceIds },
                status: 'completed',
                created_at: { $gte: startDate, $lte: endDate }
            };

            const posOrderQuery = {
                space_id: { $in: spaceIds },
                order_type: 'pos',
                status: 'completed',
                payment_status: 'paid',
                created_at: { $gte: startDate, $lte: endDate }
            };

            const onlineOrderQuery = {
                space_id: { $in: spaceIds },
                order_type: 'online',
                status: { $in: ['completed', 'confirmed', 'ready'] },
                payment_status: 'paid',
                created_at: { $gte: startDate, $lte: endDate }
            };

            if (search) {
                bookingQuery.$or = [
                    { ticket_number: { $regex: search, $options: 'i' } },
                    { guest_name: { $regex: search, $options: 'i' } }
                ];
                posOrderQuery.$or = [
                    { order_number: { $regex: search, $options: 'i' } },
                    { customer_name: { $regex: search, $options: 'i' } }
                ];
                onlineOrderQuery.$or = [
                    { order_number: { $regex: search, $options: 'i' } },
                    { customer_name: { $regex: search, $options: 'i' } }
                ];
            }

            const bookings = await Booking.find(bookingQuery)
                .populate('space_id', 'name')
                .sort({ created_at: -1 });

            const posOrders = await Order.find(posOrderQuery)
                .populate('space_id', 'name')
                .sort({ created_at: -1 });

            const onlineOrders = await Order.find(onlineOrderQuery)
                .populate('space_id', 'name')
                .sort({ created_at: -1 });

            let csv = 'Reference,Guest,Space,Original Amount,Discount,Net Amount,Type,Source,Date\n';

            for (const t of bookings) {
                const originalAmount = (t.total_amount || 0) + (t.voucher_discount || 0);
                const spaceName = t.space_id?.name || 'N/A';
                const guestName = t.guest_name || 'Guest';
                csv += `"${t.ticket_number || 'N/A'}","${guestName}","${spaceName}","${originalAmount}","${t.voucher_discount || 0}","${t.total_amount || 0}","${t.booking_type || 'booking'}","booking","${new Date(t.created_at).toLocaleString()}"\n`;
            }

            for (const t of posOrders) {
                const originalAmount = (t.total || 0) + (t.discount_amount || 0);
                const spaceName = t.space_id?.name || 'N/A';
                const guestName = t.customer_name || 'Guest';
                csv += `"${t.order_number || 'N/A'}","${guestName}","${spaceName}","${originalAmount}","${t.discount_amount || 0}","${t.total || 0}","POS","pos","${new Date(t.created_at).toLocaleString()}"\n`;
            }

            for (const t of onlineOrders) {
                const originalAmount = (t.total || 0) + (t.discount_amount || 0);
                const spaceName = t.space_id?.name || 'N/A';
                const guestName = t.customer_name || 'Guest';
                csv += `"${t.order_number || 'N/A'}","${guestName}","${spaceName}","${originalAmount}","${t.discount_amount || 0}","${t.total || 0}","Online","online","${new Date(t.created_at).toLocaleString()}"\n`;
            }

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=earnings_${Date.now()}.csv`);
            return res.status(HTTP_STATUS.OK).send(csv);

        } catch (error) {
            console.error('Export CSV error:', error);
            next(error);
        }
    };
}

module.exports = new EarningsController();