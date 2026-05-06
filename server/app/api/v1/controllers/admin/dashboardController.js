const { User, Space, SpaceRequest, Booking } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class DashboardController {
    index = async (req, res, next) => {
        try {
            const [
                totalUsers,
                totalSpaceHubs,
                activeSpaces,
                pendingRequestsCount
            ] = await Promise.all([
                User.countDocuments({ role: 'user' }),
                User.countDocuments({ role: 'space' }),
                Space.countDocuments(),
                SpaceRequest.countDocuments({ status: 'pending' })
            ]);

            const revenueData = await Space.aggregate([
                { $group: { _id: null, total: { $sum: "$rate_hour" } } }
            ]);
            const monthlyRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

            const recentRequests = await SpaceRequest.find({ status: 'pending' })
                .select('name status created_at')
                .sort({ created_at: -1 })
                .limit(5);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                status: 'success',
                data: {
                    totalUsers,
                    totalSpaceHubs,
                    activeSpaces,
                    pendingRequests: pendingRequestsCount,
                    monthlyRevenue: monthlyRevenue.toLocaleString(),
                    recentRequests: recentRequests.map(req => ({
                        name: req.name,
                        location: "Iloilo City",
                        status: req.status,
                        createdAt: req.created_at
                    }))
                }
            });
        } catch (error) {
            console.error("Admin Dashboard Sync Error:", error.message);
            next(error);
        }
    };

    // Add these methods to your Admin DashboardController

    // ============================================
    // 1. PLATFORM OCCUPANCY ANALYTICS
    // ============================================
    getPlatformOccupancy = async (req, res, next) => {
        try {
            // Get all spaces with capacity
            const spaces = await Space.find().select('name capacity user_id');
            const totalCapacity = spaces.reduce((sum, s) => sum + (s.capacity || 0), 0);

            // Current active bookings across ALL spaces
            const activeBookings = await Booking.countDocuments({ status: 'active' });

            // Get occupancy per space
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

            // Find struggling spaces (<30% occupancy)
            const strugglingSpaces = spacesWithOccupancy.filter(s => s.occupancyRate < 30 && s.occupancyRate > 0);

            // Find thriving spaces (>70% occupancy)
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
    // 2. PLATFORM REVENUE TREND (with actual booking data)
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

            // Calculate month-over-month growth
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
    // 3. TOP PERFORMING SPACES (Leaderboard)
    // ============================================
    getTopSpaces = async (req, res, next) => {
        try {
            const { limit = 10 } = req.query;

            const topSpaces = await Booking.aggregate([
                {
                    $match: { status: 'completed' }
                },
                {
                    $group: {
                        _id: "$space_id",
                        totalRevenue: { $sum: "$total_amount" },
                        totalBookings: { $sum: 1 },
                        totalWalkins: { $sum: { $cond: [{ $eq: ["$booking_type", "walkin"] }, 1, 0] } }
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
                        from: "users",
                        localField: "space.user_id",
                        foreignField: "_id",
                        as: "owner"
                    }
                },
                { $unwind: "$owner" },
                {
                    $project: {
                        spaceName: "$space.name",
                        ownerName: "$owner.name",
                        ownerEmail: "$owner.email",
                        totalRevenue: 1,
                        totalBookings: 1,
                        totalWalkins: 1,
                        capacity: "$space.capacity"
                    }
                },
                { $sort: { totalRevenue: -1 } },
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

    // ============================================
    // 5. FIXED: Main Dashboard with REAL revenue
    // ============================================
    index = async (req, res, next) => {
        try {
            const [
                totalUsers,
                totalSpaceHubs,
                activeSpaces,
                pendingRequestsCount,
                revenueData
            ] = await Promise.all([
                User.countDocuments({ role: 'user' }),
                User.countDocuments({ role: 'space' }),
                Space.countDocuments(),
                SpaceRequest.countDocuments({ status: 'pending' }),
                Booking.aggregate([
                    {
                        $match: {
                            status: 'completed',
                            check_in_at: {
                                $gte: new Date(new Date().setDate(1)) // First day of current month
                            }
                        }
                    },
                    { $group: { _id: null, total: { $sum: "$total_amount" } } }
                ])
            ]);

            const monthlyRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

            // Get recent requests with more details
            const recentRequests = await SpaceRequest.find({ status: 'pending' })
                .select('name business_name status created_at user_id')
                .populate('user_id', 'name email')
                .sort({ created_at: -1 })
                .limit(5);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    totalUsers,
                    totalSpaceHubs,
                    activeSpaces,
                    pendingRequests: pendingRequestsCount,
                    monthlyRevenue: monthlyRevenue.toLocaleString(),
                    recentRequests: recentRequests.map(req => ({
                        name: req.business_name || req.name,
                        ownerName: req.user_id?.name || 'N/A',
                        location: "Iloilo City",
                        status: req.status,
                        createdAt: req.created_at
                    }))
                }
            });
        } catch (error) {
            console.error("Admin Dashboard Sync Error:", error.message);
            next(error);
        }
    };
}

module.exports = new DashboardController();