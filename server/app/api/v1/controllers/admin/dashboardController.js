const { User, Space, SpaceRequest } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/utils/constants');

class DashboardController {
    async index(req, res, next) {
        try {
            const totalUsers = await User.countDocuments({ role: 'user' });

            const totalSpaceHubs = await User.countDocuments({ role: 'space' });

            const activeSpaces = await Space.countDocuments();

            const pendingRequestsCount = await SpaceRequest.countDocuments({ status: 'pending' });

            const revenueData = await Space.aggregate([
                { $group: { _id: null, total: { $sum: "$rate_hour" } } }
            ]);
            const monthlyRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

            const recentRequests = await SpaceRequest.find({ status: 'pending' })
                .select('name status created_at') 
                .sort({ created_at: -1 })
                .limit(5);

            res.status(HTTP_STATUS.OK).json({
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
            next(error);
        }
    }
}

module.exports = new DashboardController();