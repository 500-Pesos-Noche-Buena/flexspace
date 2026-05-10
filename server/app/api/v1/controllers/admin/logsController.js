const { ActivityLog } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class LogsController {
    /**
     * Get activity logs with filtering, search, and pagination
     */
    getActivityLogs = async (req, res, next) => {
        try {
            const {
                filter = 'all',
                search = '',
                page = 1,
                limit = 20,
                startDate,
                endDate
            } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const parsedLimit = parseInt(limit);

            const query = this.buildQuery(filter, search, startDate, endDate);

            const [logs, total, stats] = await Promise.all([
                this.fetchLogs(query, skip, parsedLimit),
                ActivityLog.countDocuments(query),
                this.getStatsData()  // ← Changed from this.getStats()
            ]);

            const totalPages = Math.ceil(total / parsedLimit);
            const hasMore = parseInt(page) < totalPages;

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    logs,
                    total,
                    stats,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        hasMore,
                        limit: parsedLimit,
                        total
                    }
                }
            });
        } catch (error) {
            console.error('Activity logs error:', error);
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to fetch activity logs'
            });
        }
    };

    /**
     * Get aggregated stats for dashboard (ROUTE HANDLER)
     */
    getStats = async (req, res, next) => {
        try {
            const statsData = await this.getStatsData();
            
            return res.status(200).json({
                success: true,
                data: statsData
            });
        } catch (error) {
            console.error('Stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    };

    /**
     * Get recent activity summary (last 24 hours)
     */
    getRecentActivity = async (req, res, next) => {
        try {
            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

            const recentLogs = await ActivityLog.find({
                createdAt: { $gte: twentyFourHoursAgo }
            })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();

            const byHour = {};
            for (let i = 0; i < 24; i++) {
                byHour[i] = 0;
            }

            recentLogs.forEach(log => {
                const hour = new Date(log.createdAt).getHours();
                byHour[hour] = (byHour[hour] || 0) + 1;
            });

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    logs: recentLogs,
                    hourlyBreakdown: Object.entries(byHour).map(([hour, count]) => ({
                        hour: parseInt(hour),
                        count
                    }))
                }
            });
        } catch (error) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    /**
     * Export logs to CSV
     */
    exportLogs = async (req, res, next) => {
        try {
            const { filter = 'all', search = '', startDate, endDate } = req.query;
            const query = this.buildQuery(filter, search, startDate, endDate);

            const logs = await ActivityLog.find(query)
                .sort({ createdAt: -1 })
                .limit(5000)
                .lean();

            const csvHeaders = ['ID', 'Type', 'Description', 'Status', 'User ID', 'User Name', 'User Email', 'IP Address', 'Created At'];
            const csvRows = logs.map(log => [
                log._id,
                log.type,
                log.description,
                log.status,
                log.userId || '',
                log.userName || '',
                log.userEmail || '',
                log.ipAddress || '',
                new Date(log.createdAt).toISOString()
            ]);

            const csvContent = [csvHeaders, ...csvRows].map(row => row.join(',')).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=activity-logs-${new Date().toISOString()}.csv`);
            return res.status(HTTP_STATUS.OK).send(csvContent);
        } catch (error) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    /**
     * Delete old logs (cleanup)
     */
    cleanupOldLogs = async (req, res, next) => {
        try {
            const { days = 30 } = req.query;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

            const result = await ActivityLog.deleteMany({
                createdAt: { $lt: cutoffDate }
            });

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `Deleted ${result.deletedCount} old logs`,
                deletedCount: result.deletedCount
            });
        } catch (error) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    };

    // ==================== PRIVATE METHODS ====================

    buildQuery = (filter, search, startDate, endDate) => {
        const query = {};

        if (filter !== 'all') {
            const typeMap = {
                user: '^user_',
                space: '^space_',
                booking: '^booking_',
                district: '^district_',
                review: '^review_',
                earnings: '^earnings_',
                login: 'user_login',
                logout: 'user_logout',
                register: 'user_register',
                update: '_update',
                delete: '_delete',
                create: '_create'
            };

            const pattern = typeMap[filter];
            if (pattern) {
                if (pattern === 'user_login' || pattern === 'user_logout' || pattern === 'user_register') {
                    query.type = pattern;
                } else {
                    query.type = { $regex: pattern, $options: 'i' };
                }
            } else {
                query.type = { $regex: filter, $options: 'i' };
            }
        }

        if (search && search.trim()) {
            const searchRegex = { $regex: search, $options: 'i' };
            query.$or = [
                { description: searchRegex },
                { userName: searchRegex },
                { userEmail: searchRegex },
                { type: searchRegex }
            ];
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        return query;
    };

    fetchLogs = (query, skip, limit) => {
        return ActivityLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
    };

    /**
     * Get all statistics data (PRIVATE METHOD - RENAMED from getStats)
     */
    getStatsData = async () => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            total,
            userCount,
            spaceCount,
            bookingCount,
            districtCount,
            reviewCount,
            earningsCount,
            loginCount,
            logoutCount,
            registerCount,
            recentActivity,
            monthlyActivity
        ] = await Promise.all([
            ActivityLog.countDocuments(),
            ActivityLog.countDocuments({ type: { $regex: '^user_', $options: 'i' } }),
            ActivityLog.countDocuments({ type: { $regex: '^space_', $options: 'i' } }),
            ActivityLog.countDocuments({ type: { $regex: '^booking_', $options: 'i' } }),
            ActivityLog.countDocuments({ type: { $regex: '^district_', $options: 'i' } }),
            ActivityLog.countDocuments({ type: { $regex: '^review_', $options: 'i' } }),
            ActivityLog.countDocuments({ type: { $regex: '^earnings_', $options: 'i' } }),
            ActivityLog.countDocuments({ type: 'user_login' }),
            ActivityLog.countDocuments({ type: 'user_logout' }),
            ActivityLog.countDocuments({ type: 'user_register' }),
            ActivityLog.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
            ActivityLog.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
        ]);

        const topUsers = await ActivityLog.aggregate([
            { $match: { userName: { $ne: null, $ne: '' } } },
            { $group: { _id: '$userEmail', name: { $first: '$userName' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        return {
            total,
            user: userCount,
            space: spaceCount,
            booking: bookingCount,
            district: districtCount,
            review: reviewCount,
            earnings: earningsCount,
            login: loginCount,
            logout: logoutCount,
            register: registerCount,
            recent: recentActivity,
            monthly: monthlyActivity,
            topUsers: topUsers.map(u => ({ name: u.name || u._id, count: u.count }))
        };
    };
}

module.exports = new LogsController();