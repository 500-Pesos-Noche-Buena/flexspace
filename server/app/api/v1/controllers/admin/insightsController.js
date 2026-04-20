// api/v1/controllers/admin/insightsController.js
const { HTTP_STATUS } = require('@/utils/constants');
const { Analytics } = require('@/api/v1/models');

class InsightsController {
    getStats = async (req, res, next) => {
        try {
            const { period = '7d' } = req.query;
            
            let analytics = await Analytics.findOne({ period }).sort({ updatedAt: -1 });
            
            if (!analytics) {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    data: {
                        period,
                        visitors: 0,
                        pageViews: 0,
                        bounceRate: 0,
                        avgSessionDuration: 0,
                        topPages: [],
                        trafficSources: [],
                        countries: [],
                        devices: [],
                        browsers: [],
                        os: [],
                        dailyStats: []
                    },
                    source: 'database'
                });
            }
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: analytics,
                source: 'database'
            });
        } catch (error) {
            console.error('Get analytics error:', error);
            next(error);
        }
    };
    
    updateStats = async (req, res, next) => {
        try {
            const { period = '7d', ...updateData } = req.body;
            const userId = req.user?.id;
            
            // Parse string arrays back to actual arrays
            const parsedData = {};
            const arrayFields = ['topPages', 'trafficSources', 'countries', 'devices', 'browsers', 'os', 'dailyStats'];
            
            for (const [key, value] of Object.entries(updateData)) {
                if (arrayFields.includes(key) && typeof value === 'string') {
                    try {
                        parsedData[key] = JSON.parse(value);
                    } catch (e) {
                        parsedData[key] = value;
                    }
                } else {
                    parsedData[key] = value;
                }
            }
            
            let analytics = await Analytics.findOne({ period });
            
            if (analytics) {
                Object.assign(analytics, parsedData);
                analytics.updatedAt = new Date();
                analytics.updatedBy = userId;
                await analytics.save();
            } else {
                analytics = await Analytics.create({
                    period,
                    ...parsedData,
                    updatedBy: userId
                });
            }
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Analytics updated successfully',
                data: analytics
            });
        } catch (error) {
            console.error('Update analytics error:', error);
            next(error);
        }
    };
}

module.exports = new InsightsController();