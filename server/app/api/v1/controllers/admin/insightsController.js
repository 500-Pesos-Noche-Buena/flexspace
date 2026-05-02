const { HTTP_STATUS } = require('@/api/v1/utils/constants');
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

    // InsightsController.js
    // InsightsController.js
    updateStats = async (req, res, next) => {
        try {
            const { period = '7d', visitors, pageViews, ...otherData } = req.body;

            // Use $inc for counters and $set for objects/arrays
            const update = {
                $inc: {
                    visitors: visitors || 0,
                    pageViews: pageViews || 0
                },
                $set: {
                    ...otherData, // Be careful with spread here
                    updatedAt: new Date()
                }
            };

            const analytics = await Analytics.findOneAndUpdate(
                { period },
                update,
                { new: true, upsert: true }
            );

            return res.status(200).json({ success: true, data: analytics });
        } catch (error) {
            // If a VersionError still happens somehow, just catch it and retry 
            // or ignore it since it's just analytics.
            res.status(500).json({ success: false, message: error.message });
        }
    };
}

module.exports = new InsightsController();