const { Space, Booking, User, Voucher } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/utils/constants');

class DashboardController {

    getOwnerId = async (req) => {
        const userId = req.user?.sub || req.user?._id || req.user?.id;

        if (req.user?.role === 'staff') {
            const staffRecord = await User.findById(userId).select('parent_id');
            if (staffRecord?.parent_id) {
                return { ownerId: staffRecord.parent_id.toString(), isStaff: true };
            }
        }

        return { ownerId: userId?.toString(), isStaff: false };
    };

    index = async (req, res, next) => {
        try {
            const { ownerId, isStaff } = await this.getOwnerId(req);
            const { period = 'daily' } = req.query;

            const userSpaces = await Space.find({ user_id: ownerId }).distinct('_id');

            const now = new Date();
            let startDate = new Date();
            startDate.setHours(0, 0, 0, 0);

            if (period === 'weekly') startDate.setDate(now.getDate() - 7);
            else if (period === 'monthly') startDate.setMonth(now.getMonth() - 1);
            else if (period === 'yearly') startDate.setFullYear(now.getFullYear() - 1);

            const [stats, activeSessions, revenueData, voucherStats] = await Promise.all([
                Promise.all([
                    isStaff ? null : Space.countDocuments({ user_id: ownerId }),
                    Booking.countDocuments({ space_id: { $in: userSpaces } }),
                    Booking.countDocuments({
                        booking_type: 'walkin',
                        space_id: { $in: userSpaces },
                        created_at: { $gte: startDate }
                    })
                ]),
                Booking.find({ status: 'active', space_id: { $in: userSpaces } })
                    .select('guest_name user_id check_in_at _id')
                    .populate('user_id', 'name')
                    .sort({ check_in_at: -1 })
                    .limit(5),
                Booking.aggregate([
                    {
                        $match: {
                            space_id: { $in: userSpaces },
                            status: 'completed',
                            updated_at: { $gte: startDate }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$total_amount' }
                        }
                    }
                ]),
                // Voucher Stats
                Promise.all([
                    // Total vouchers created
                    Voucher.countDocuments({ space_id: { $in: userSpaces }, type: 'global' }),
                    // Total redemptions (users who redeemed points for vouchers)
                    Voucher.aggregate([
                        {
                            $match: {
                                space_id: { $in: userSpaces },
                                type: 'global'
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalRedemptions: { $sum: "$redemption_count" }
                            }
                        }
                    ]),
                    // Total discount amount given out
                    Voucher.aggregate([
                        {
                            $match: {
                                space_id: { $in: userSpaces },
                                type: 'global'
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalDiscount: { $sum: { $multiply: ["$discount_amount", "$redemption_count"] } }
                            }
                        }
                    ]),
                    // Vouchers used (applied at checkout)
                    Booking.aggregate([
                        {
                            $match: {
                                space_id: { $in: userSpaces },
                                voucher_applied: { $ne: null },
                                status: 'completed'
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalUsed: { $sum: 1 },
                                totalSaved: { $sum: "$voucher_discount" }
                            }
                        }
                    ])
                ])
            ]);

            const totalRedemptions = voucherStats[1][0]?.totalRedemptions || 0;
            const totalDiscountGiven = voucherStats[2][0]?.totalDiscount || 0;
            const vouchersUsed = voucherStats[3][0]?.totalUsed || 0;
            const totalSavedByCustomers = voucherStats[3][0]?.totalSaved || 0;

            const formattedSessions = activeSessions.map(session => ({
                _id: session._id,
                userName: session.guest_name || session.user_id?.name || 'Guest',
                startTime: session.check_in_at
                    ? new Date(session.check_in_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
                    : 'N/A'
            }));

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                isStaff,
                stats: {
                    spaces: isStaff ? null : stats[0],
                    bookings: stats[1],
                    walkins: stats[2],
                    revenue: revenueData[0]?.total || 0
                },
                activeSessions: formattedSessions,
                voucherStats: {
                    totalVouchers: voucherStats[0] || 0,
                    totalRedemptions: totalRedemptions,
                    totalDiscountGiven: totalDiscountGiven,
                    vouchersUsed: vouchersUsed,
                    totalSavedByCustomers: totalSavedByCustomers
                }
            });

        } catch (error) {
            console.error('Dashboard error:', error);
            next(error);
        }
    };
}

module.exports = new DashboardController();