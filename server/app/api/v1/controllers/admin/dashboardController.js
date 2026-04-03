// controllers/dashboardController.js
const User = require('@/api/v1/models/schema/User'); // Adjust path
const Space = require('@/api/v1/models/schema/Space'); 
const { HTTP_STATUS } = require('@/utils/constants');

class DashboardController {
    async index(req, res, next) {
        try {
            // 1. Count total users (exclude admins)
            const totalUsers = await User.countDocuments({ role: 'user' });

            // 2. Count active spaces
            const activeSpaces = await Space.countDocuments();

            // 3. Count pending space applications
            const pendingRequests = await User.countDocuments({ role: 'space', status: 'pending' });

            // 4. Calculate monthly revenue (sum of space rates as placeholder)
            const revenueData = await Space.aggregate([
                { $group: { _id: null, total: { $sum: "$rate_hour" } } }
            ]);
            const monthlyRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

            // 5. Get 5 most recent pending requests
            const recentRequests = await User.find({ role: 'space', status: 'pending' })
                .select('name location status createdAt')
                .sort({ createdAt: -1 })
                .limit(5);

            res.status(HTTP_STATUS.OK).json({
                status: 'success',
                data: {
                    totalUsers,
                    activeSpaces,
                    pendingRequests,
                    monthlyRevenue: monthlyRevenue.toLocaleString(),
                    recentRequests
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new DashboardController();