const { Booking, Space, User, Settings, Voucher } = require('@/api/v1/models');
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

    index = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const isAdmin = req.user?.role === 'admin';

            const {
                period   = 'daily',
                dateFrom = null,
                dateTo   = null,
                page     = 1,
                limit    = 10,
                search   = ''
            } = req.query;

            // ── Date range resolution ─────────────────────────────────────
            let startDate, endDate;

            if (dateFrom && dateTo) {
                startDate = new Date(dateFrom);
                startDate.setHours(0, 0, 0, 0);
                endDate   = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
            } else {
                endDate   = new Date();
                startDate = new Date();
                if      (period === 'daily')   { startDate.setHours(0, 0, 0, 0); }
                else if (period === 'weekly')  { startDate.setDate(startDate.getDate() - 7); }
                else if (period === 'monthly') { startDate.setMonth(startDate.getMonth() - 1); }
                else if (period === 'yearly')  { startDate.setFullYear(startDate.getFullYear() - 1); }
            }

            // ── Space scope ───────────────────────────────────────────────
            let spaceIds = [];
            if (isAdmin) {
                const all = await Space.find({}).select('_id');
                spaceIds  = all.map(s => s._id);
            } else {
                const own = await Space.find({ user_id: ownerId }).select('_id');
                spaceIds  = own.map(s => s._id);
            }

            // ── Base query ────────────────────────────────────────────────
            let query = {
                space_id:   { $in: spaceIds },
                status:     'completed',
                updated_at: { $gte: startDate, $lte: endDate }
            };

            if (search) {
                query.$or = [
                    { ticket_number: { $regex: search, $options: 'i' } },
                    { guest_name:    { $regex: search, $options: 'i' } }
                ];
            }

            // ── Fetch fee from Settings ───────────────────────────────────
            const feeSetting = await Settings.findOne({ key: 'platform_fee_percent' });
            const feePercent = feeSetting?.value ?? 3; // fallback to 3

            // ── Aggregated stats ──────────────────────────────────────────
            const [agg, transactions, total, voucherStats] = await Promise.all([
                Booking.aggregate([
                    { $match: query },
                    { $group: {
                        _id:          null,
                        totalRevenue: { $sum: '$total_amount' },
                        count:        { $sum: 1 },
                        totalDiscount: { $sum: '$voucher_discount' }
                    }}
                ]),
                Booking.find(query)
                    .populate('space_id', 'name')
                    .populate('user_id',  'name')
                    .sort({ updated_at: -1 })
                    .limit(limit * 1)
                    .skip((page - 1) * limit),
                Booking.countDocuments(query),
                // Voucher discount stats for the period
                Booking.aggregate([
                    { $match: query },
                    { $group: {
                        _id: null,
                        totalVoucherDiscount: { $sum: '$voucher_discount' },
                        bookingsWithVouchers: { $sum: { $cond: [{ $gt: ['$voucher_discount', 0] }, 1, 0] } }
                    }}
                ])
            ]);

            const totalRevenue = agg[0]?.totalRevenue || 0;
            const totalDiscountGiven = agg[0]?.totalDiscount || 0;
            const platformFee = totalRevenue * (feePercent / 100);
            const netEarnings = totalRevenue - platformFee;
            const totalVoucherDiscount = voucherStats[0]?.totalVoucherDiscount || 0;
            const bookingsWithVouchers = voucherStats[0]?.bookingsWithVouchers || 0;

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    totalRevenue,
                    netEarnings,
                    platformFee,
                    feePercent,
                    transactionCount: agg[0]?.count || 0,
                    totalDiscountGiven,
                    totalVoucherDiscount,
                    bookingsWithVouchers,
                    total,
                    transactions: transactions.map(b => ({
                        id:        b._id,
                        reference: b.ticket_number,
                        guest:     b.guest_name || b.user_id?.name || 'Guest',
                        space:     b.space_id?.name,
                        amount:    b.total_amount,
                        originalAmount: b.total_amount + (b.voucher_discount || 0),
                        discount:  b.voucher_discount || 0,
                        type:      b.booking_type,
                        date:      b.updated_at,
                        hasVoucher: !!b.voucher_applied
                    }))
                }
            });
        } catch (error) {
            console.error('Earnings error:', error);
            next(error);
        }
    };
}

module.exports = new EarningsController();