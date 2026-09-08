const { User, Space, SpaceRequest, Booking, Earnings, Order, Review, Voucher } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class DashboardController {
    index = async (req, res, next) => {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

            const [
                totalUsers,
                totalSpaceHubs,
                activeSpaces,
                pendingRequestsCount,
                platformRevenueData,
                totalBookings,
                activeBookings,
                completedBookings,
                totalOrders,
                totalVouchers,
                vouchersUsed,
                platformFeesCollected,
                pendingFeesData,
                newUsersThisMonth,
                usersLastMonth,
                totalReviews,
                avgRatingData,
                totalEarningsData
            ] = await Promise.all([
                User.countDocuments({ role: 'user' }),
                User.countDocuments({ role: 'space' }),
                Space.countDocuments(),
                SpaceRequest.countDocuments({ status: 'pending' }),
                Earnings.aggregate([
                    {
                        $match: {
                            fee_status: 'collected',
                            collected_at: { $gte: startOfMonth }
                        }
                    },
                    { $group: { _id: null, total: { $sum: "$platform_fee" } } }
                ]),
                Booking.countDocuments(),
                Booking.countDocuments({ status: 'active' }),
                Booking.countDocuments({ status: 'completed' }),
                Order.countDocuments({ status: 'completed', payment_status: 'paid' }),
                Voucher.countDocuments(),
                Voucher.aggregate([
                    { $match: { redemption_count: { $gt: 0 } } },
                    { $group: { _id: null, total: { $sum: "$redemption_count" } } }
                ]),
                Earnings.aggregate([
                    {
                        $match: {
                            fee_status: 'collected',
                            collected_at: { $gte: startOfMonth }
                        }
                    },
                    { $group: { _id: null, total: { $sum: "$platform_fee" } } }
                ]),
                Earnings.aggregate([
                    { $match: { fee_status: 'pending' } },
                    { $group: { _id: null, total: { $sum: "$platform_fee" } } }
                ]),
                User.countDocuments({ 
                    role: 'user',
                    created_at: { $gte: startOfMonth }
                }),
                User.countDocuments({ 
                    role: 'user',
                    created_at: { $gte: startOfLastMonth, $lt: startOfMonth }
                }),
                Review.countDocuments(),
                Review.aggregate([
                    { $group: { _id: null, avg: { $avg: "$rating" } } }
                ]),
                Earnings.aggregate([
                    { $match: { fee_status: 'collected' } },
                    { $group: { _id: null, total: { $sum: "$owner_earnings" } } }
                ])
            ]);

            const platformRevenue = platformRevenueData.length > 0 ? platformRevenueData[0].total : 0;
            const vouchersUsedTotal = vouchersUsed.length > 0 ? vouchersUsed[0].total : 0;
            const pendingFees = pendingFeesData.length > 0 ? pendingFeesData[0].total : 0;
            const platformFeesCollectedTotal = platformFeesCollected.length > 0 ? platformFeesCollected[0].total : 0;
            const avgRating = avgRatingData.length > 0 ? avgRatingData[0].avg : 0;
            const totalEarnings = totalEarningsData.length > 0 ? totalEarningsData[0].total : 0;

            // Calculate growth
            const userGrowth = usersLastMonth > 0 
                ? Math.round(((newUsersThisMonth - usersLastMonth) / usersLastMonth) * 100) 
                : 0;

            // Calculate booking growth (compare to last month)
            const bookingsLastMonth = await Booking.countDocuments({
                created_at: { $gte: startOfLastMonth, $lt: startOfMonth }
            });
            const bookingGrowth = bookingsLastMonth > 0 
                ? Math.round(((totalBookings - bookingsLastMonth) / bookingsLastMonth) * 100) 
                : 0;

            // Calculate revenue growth
            const revenueLastMonth = await Earnings.aggregate([
                {
                    $match: {
                        fee_status: 'collected',
                        collected_at: { $gte: startOfLastMonth, $lt: startOfMonth }
                    }
                },
                { $group: { _id: null, total: { $sum: "$platform_fee" } } }
            ]);
            const revenueLastMonthTotal = revenueLastMonth.length > 0 ? revenueLastMonth[0].total : 0;
            const revenueGrowth = revenueLastMonthTotal > 0 
                ? Math.round(((platformRevenue - revenueLastMonthTotal) / revenueLastMonthTotal) * 100) 
                : 0;

            const grossBookingData = await Booking.aggregate([
                {
                    $match: {
                        status: 'completed',
                        check_in_at: { $gte: startOfMonth }
                    }
                },
                { $group: { _id: null, total: { $sum: "$total_amount" } } }
            ]);
            const grossVolume = grossBookingData.length > 0 ? grossBookingData[0].total : 0;

            const recentRequests = await SpaceRequest.find({ status: 'pending' })
                .select('name business_name status created_at')
                .sort({ created_at: -1 })
                .limit(5);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    totalUsers,
                    totalSpaceHubs,
                    activeSpaces,
                    pendingRequests: pendingRequestsCount,
                    monthlyRevenue: platformRevenue.toLocaleString(),
                    grossVolume: grossVolume.toLocaleString(),
                    recentRequests: recentRequests.map(req => ({
                        name: req.business_name || req.name,
                        ownerName: 'Pending',
                        location: "Iloilo City",
                        status: req.status,
                        createdAt: req.created_at
                    })),
                    // New stats
                    totalBookings,
                    activeBookings,
                    completedBookings,
                    totalOrders,
                    totalVouchers,
                    vouchersUsed: vouchersUsedTotal,
                    platformFeesCollected: platformFeesCollectedTotal,
                    pendingFees,
                    newUsersThisMonth,
                    userGrowth,
                    revenueGrowth,
                    bookingGrowth,
                    totalReviews,
                    avgRating,
                    totalEarnings
                }
            });
        } catch (error) {
            console.error("Admin Dashboard Sync Error:", error.message);
            next(error);
        }
    };


    // ============================================
    // 1. PLATFORM OCCUPANCY ANALYTICS
    // ============================================
    getPlatformOccupancy = async (req, res, next) => {
        try {
            const spaces = await Space.find().select('name capacity user_id');
            const totalCapacity = spaces.reduce((sum, s) => sum + (s.capacity || 0), 0);
            const activeBookings = await Booking.countDocuments({ status: 'active' });

            const spacesWithOccupancy = await Promise.all(spaces.map(async (space) => {
                const occupied = await Booking.countDocuments({
                    space_id: space._id,
                    status: 'active'
                });
                return {
                    name: space.name,
                    capacity: space.capacity || 0,
                    occupied,
                    occupancyRate: space.capacity ? Math.round((occupied / space.capacity) * 100) : 0
                };
            }));

            const occupancyRate = totalCapacity > 0 ? Math.round((activeBookings / totalCapacity) * 100) : 0;
            const strugglingSpaces = spacesWithOccupancy.filter(s => s.occupancyRate < 30 && s.occupancyRate > 0);
            const thrivingSpaces = spacesWithOccupancy.filter(s => s.occupancyRate >= 70);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    platform: {
                        occupancyRate,
                        activeBookings,
                        totalCapacity,
                        totalSpaces: spaces.length
                    },
                    spaces: spacesWithOccupancy,
                    strugglingSpaces: strugglingSpaces.slice(0, 5),
                    thrivingSpaces: thrivingSpaces.slice(0, 5)
                }
            });
        } catch (error) {
            console.error('getPlatformOccupancy error:', error);
            next(error);
        }
    };

    // ============================================
    // 2. PLATFORM REVENUE TREND
    // ============================================
    getPlatformRevenueTrend = async (req, res, next) => {
        try {
            const { period = 'monthly' } = req.query;
            let startDate = new Date();
            let groupFormat;

            if (period === 'daily') {
                startDate.setDate(startDate.getDate() - 30);
                groupFormat = "%Y-%m-%d";
            } else if (period === 'weekly') {
                startDate.setDate(startDate.getDate() - 90);
                groupFormat = "%Y-%m-%d";
            } else if (period === 'monthly') {
                startDate.setMonth(startDate.getMonth() - 12);
                groupFormat = "%Y-%m";
            } else {
                startDate.setFullYear(startDate.getFullYear() - 2);
                groupFormat = "%Y-%m";
            }

            const revenueData = await Booking.aggregate([
                {
                    $match: {
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

            let growth = 0;
            if (revenueData.length >= 2) {
                const current = revenueData[revenueData.length - 1];
                const previous = revenueData[revenueData.length - 2];
                if (previous && previous.revenue > 0) {
                    growth = Math.round(((current.revenue - previous.revenue) / previous.revenue) * 100);
                }
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    period,
                    trend: revenueData,
                    growth,
                    totalRevenue: revenueData.reduce((sum, t) => sum + t.revenue, 0),
                    totalBookings: revenueData.reduce((sum, t) => sum + t.bookings, 0)
                }
            });
        } catch (error) {
            console.error('getPlatformRevenueTrend error:', error);
            next(error);
        }
    };

    // ============================================
    // 3. TOP PERFORMING SPACES (by Bookings with Ratings)
    // ============================================
    getTopSpaces = async (req, res, next) => {
        try {
            const { limit = 5, sort = 'bookings' } = req.query;

            const topSpaces = await Booking.aggregate([
                { $match: { status: 'completed' } },
                {
                    $group: {
                        _id: "$space_id",
                        totalRevenue: { $sum: "$total_amount" },
                        totalBookings: { $sum: 1 },
                        totalWalkins: { $sum: { $cond: [{ $eq: ["$booking_type", "walkin"] }, 1, 0] } },
                        totalOnline: { $sum: { $cond: [{ $eq: ["$booking_type", "online"] }, 1, 0] } }
                    }
                },
                {
                    $lookup: {
                        from: "spaces",
                        localField: "_id",
                        foreignField: "_id",
                        as: "space"
                    }
                },
                { $unwind: "$space" },
                {
                    $lookup: {
                        from: "reviews",
                        localField: "space._id",
                        foreignField: "space_id",
                        as: "reviews"
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "space.user_id",
                        foreignField: "_id",
                        as: "owner"
                    }
                },
                { $unwind: "$owner" },
                {
                    $addFields: {
                        averageRating: {
                            $cond: [
                                { $gt: [{ $size: "$reviews" }, 0] },
                                { $avg: "$reviews.rating" },
                                0
                            ]
                        },
                        reviewCount: { $size: "$reviews" }
                    }
                },
                {
                    $project: {
                        spaceName: "$space.name",
                        ownerName: "$owner.name",
                        ownerEmail: "$owner.email",
                        totalRevenue: 1,
                        totalBookings: 1,
                        totalWalkins: 1,
                        totalOnline: 1,
                        capacity: "$space.capacity",
                        rating: "$averageRating",
                        reviewCount: 1
                    }
                },
                { $sort: { totalBookings: -1 } },
                { $limit: parseInt(limit) }
            ]);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: topSpaces
            });
        } catch (error) {
            console.error('getTopSpaces error:', error);
            next(error);
        }
    };

    // ============================================
    // 4. USER GROWTH ANALYTICS
    // ============================================
    getUserGrowth = async (req, res, next) => {
        try {
            const { period = 'monthly' } = req.query;
            let startDate = new Date();
            let groupFormat;

            if (period === 'daily') {
                startDate.setDate(startDate.getDate() - 30);
                groupFormat = "%Y-%m-%d";
            } else if (period === 'weekly') {
                startDate.setDate(startDate.getDate() - 90);
                groupFormat = "%Y-%m-%d";
            } else {
                startDate.setMonth(startDate.getMonth() - 12);
                groupFormat = "%Y-%m";
            }

            const userGrowth = await User.aggregate([
                {
                    $match: {
                        created_at: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: groupFormat, date: "$created_at" } },
                        users: { $sum: 1 },
                        spaceOwners: { $sum: { $cond: [{ $eq: ["$role", "space"] }, 1, 0] } },
                        regularUsers: { $sum: { $cond: [{ $eq: ["$role", "user"] }, 1, 0] } }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);

            const totalUsers = await User.countDocuments();
            const totalSpaceOwners = await User.countDocuments({ role: 'space' });
            const totalRegularUsers = await User.countDocuments({ role: 'user' });

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    growth: userGrowth,
                    totals: {
                        all: totalUsers,
                        spaceOwners: totalSpaceOwners,
                        regularUsers: totalRegularUsers
                    }
                }
            });
        } catch (error) {
            console.error('getUserGrowth error:', error);
            next(error);
        }
    };
}

module.exports = new DashboardController();