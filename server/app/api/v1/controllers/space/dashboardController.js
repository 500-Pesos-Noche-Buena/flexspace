const { Space, Booking, User, Voucher } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

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

    // ============================================
    // 1. OCCUPANCY ANALYTICS (Live + Historical)
    // ============================================
    getOccupancyAnalytics = async (req, res, next) => {
        try {
            const { ownerId, isStaff } = await this.getOwnerId(req);
            const userSpaces = await Space.find({ user_id: ownerId }).distinct('_id');

            // Get all spaces with their capacity
            const spaces = await Space.find({ _id: { $in: userSpaces } }).select('name capacity');
            const totalCapacity = spaces.reduce((sum, space) => sum + (space.capacity || 0), 0);

            // Current active bookings
            const activeBookings = await Booking.countDocuments({
                space_id: { $in: userSpaces },
                status: 'active'
            });

            // Historical occupancy (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const historical = await Booking.aggregate([
                {
                    $match: {
                        space_id: { $in: userSpaces },
                        status: 'completed',
                        check_in_at: { $gte: sevenDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$check_in_at" } },
                        bookings: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);

            const occupancyRate = totalCapacity > 0
                ? Math.round((activeBookings / totalCapacity) * 100)
                : 0;

            let statusLabel = 'quiet';
            if (occupancyRate >= 80) statusLabel = 'busy';
            else if (occupancyRate >= 40) statusLabel = 'moderate';

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    current: {
                        occupancyRate,
                        occupiedSeats: activeBookings,
                        totalSeats: totalCapacity,
                        status: statusLabel
                    },
                    spaces: spaces.map(s => ({ name: s.name, capacity: s.capacity })),
                    historical
                }
            });
        } catch (error) {
            console.error('getOccupancyAnalytics error:', error);
            next(error);
        }
    };

    // ============================================
    // 2. PEAK HOURS INTELLIGENCE
    // ============================================
    getPeakHours = async (req, res, next) => {
        try {
            const { ownerId } = await this.getOwnerId(req);
            const userSpaces = await Space.find({ user_id: ownerId }).distinct('_id');

            const { period = 'weekly' } = req.query;

            let startDate = new Date();
            if (period === 'daily') startDate.setHours(0, 0, 0, 0);
            else if (period === 'weekly') startDate.setDate(startDate.getDate() - 7);
            else if (period === 'monthly') startDate.setMonth(startDate.getMonth() - 1);
            else if (period === 'yearly') startDate.setFullYear(startDate.getFullYear() - 1);

            const peakData = await Booking.aggregate([
                {
                    $match: {
                        space_id: { $in: userSpaces },
                        status: 'completed',
                        check_in_at: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: { hour: { $hour: "$check_in_at" } },
                        bookings: { $sum: 1 },
                        revenue: { $sum: "$total_amount" }
                    }
                },
                { $sort: { "_id.hour": 1 } }
            ]);

            const maxBookings = Math.max(...peakData.map(d => d.bookings), 1);

            const hours = Array(24).fill().map((_, hour) => {
                const data = peakData.find(d => d._id.hour === hour);
                return {
                    hour,
                    label: hour === 0 ? '12am' : hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`,
                    bookings: data?.bookings || 0,
                    revenue: data?.revenue || 0,
                    percentage: data ? Math.round((data.bookings / maxBookings) * 100) : 0
                };
            });

            const topHours = [...hours].sort((a, b) => b.bookings - a.bookings).slice(0, 3);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    hours,
                    topHours,
                    period,
                    totalBookings: peakData.reduce((sum, d) => sum + d.bookings, 0),
                    bestHour: topHours[0] || null
                }
            });
        } catch (error) {
            console.error('getPeakHours error:', error);
            next(error);
        }
    };

    // ============================================
    // 3. CUSTOMER LOYALTY METRICS
    // ============================================
    getCustomerLoyalty = async (req, res, next) => {
        try {
            const { ownerId } = await this.getOwnerId(req);
            const userSpaces = await Space.find({ user_id: ownerId }).distinct('_id');

            // Get all customers with booking counts
            const allCustomers = await Booking.aggregate([
                {
                    $match: {
                        space_id: { $in: userSpaces },
                        status: 'completed'
                    }
                },
                {
                    $group: {
                        _id: "$user_id",
                        bookingCount: { $sum: 1 },
                        totalSpent: { $sum: "$total_amount" },
                        lastVisit: { $max: "$check_in_at" }
                    }
                }
            ]);

            const totalUniqueCustomers = allCustomers.length;
            const returningCustomers = allCustomers.filter(c => c.bookingCount > 1).length;
            const returnRate = totalUniqueCustomers > 0
                ? Math.round((returningCustomers / totalUniqueCustomers) * 100)
                : 0;

            // New customers last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const newCustomersLast30Days = await Booking.aggregate([
                {
                    $match: {
                        space_id: { $in: userSpaces },
                        status: 'completed',
                        check_in_at: { $gte: thirtyDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: "$user_id",
                        firstSeen: { $min: "$check_in_at" }
                    }
                },
                {
                    $match: {
                        firstSeen: { $gte: thirtyDaysAgo }
                    }
                }
            ]);

            // Top 10 customers
            const topCustomers = await Booking.aggregate([
                {
                    $match: {
                        space_id: { $in: userSpaces },
                        status: 'completed',
                        user_id: { $ne: null }
                    }
                },
                {
                    $group: {
                        _id: "$user_id",
                        totalBookings: { $sum: 1 },
                        totalSpent: { $sum: "$total_amount" },
                        lastVisit: { $max: "$check_in_at" }
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
                { $sort: { totalSpent: -1 } },
                { $limit: 10 }
            ]);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    summary: {
                        totalCustomers: totalUniqueCustomers,
                        returningCustomers,
                        returnRate,
                        newCustomersLast30Days: newCustomersLast30Days.length,
                        averageSpentPerCustomer: totalUniqueCustomers > 0
                            ? Math.round(allCustomers.reduce((sum, c) => sum + c.totalSpent, 0) / totalUniqueCustomers)
                            : 0
                    },
                    topCustomers: topCustomers.map(c => ({
                        id: c._id,
                        name: c.user?.name || 'Guest User',
                        email: c.user?.email,
                        totalBookings: c.totalBookings,
                        totalSpent: c.totalSpent,
                        lastVisit: c.lastVisit
                    }))
                }
            });
        } catch (error) {
            console.error('getCustomerLoyalty error:', error);
            next(error);
        }
    };

    // ============================================
    // 4. REVENUE TREND (for chart)
    // ============================================
    getRevenueTrend = async (req, res, next) => {
        try {
            const { ownerId } = await this.getOwnerId(req);
            const userSpaces = await Space.find({ user_id: ownerId }).distinct('_id');

            const { period = 'weekly' } = req.query;

            let startDate = new Date();
            let groupFormat;
            let limit = 7;

            if (period === 'daily') {
                startDate.setDate(startDate.getDate() - 7);
                groupFormat = "%Y-%m-%d";
                limit = 7;
            } else if (period === 'weekly') {
                startDate.setDate(startDate.getDate() - 28);
                groupFormat = "%Y-%m-%d";
                limit = 28;
            } else if (period === 'monthly') {
                startDate.setMonth(startDate.getMonth() - 6);
                groupFormat = "%Y-%m";
                limit = 6;
            } else {
                startDate.setFullYear(startDate.getFullYear() - 1);
                groupFormat = "%Y-%m";
                limit = 12;
            }

            const trend = await Booking.aggregate([
                {
                    $match: {
                        space_id: { $in: userSpaces },
                        status: 'completed',
                        check_in_at: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: groupFormat, date: "$check_in_at" } },
                        revenue: { $sum: "$total_amount" },
                        bookings: { $sum: 1 },
                        walkins: { $sum: { $cond: [{ $eq: ["$booking_type", "walkin"] }, 1, 0] } }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);

            // Calculate week-over-week growth
            let growth = 0;
            if (trend.length >= 2) {
                const currentWeek = trend.slice(-1)[0]?.revenue || 0;
                const previousWeek = trend.slice(-2)[0]?.revenue || 0;
                growth = previousWeek > 0 ? Math.round(((currentWeek - previousWeek) / previousWeek) * 100) : 0;
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    period,
                    trend,
                    growth,
                    totalRevenue: trend.reduce((sum, t) => sum + t.revenue, 0),
                    totalBookings: trend.reduce((sum, t) => sum + t.bookings, 0)
                }
            });
        } catch (error) {
            console.error('getRevenueTrend error:', error);
            next(error);
        }
    };
}

module.exports = new DashboardController();