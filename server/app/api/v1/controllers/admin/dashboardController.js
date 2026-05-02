const { User, Space, SpaceRequest } = require('@/api/v1/models');
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
}

module.exports = new DashboardController();