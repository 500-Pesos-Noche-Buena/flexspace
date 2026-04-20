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
    
// InsightsController.js
updateStats = async (req, res, next) => {
    try {
        const { period = '7d', ...updateData } = req.body;
        const userId = req.user?.id;
        
        const parsedData = {};
        const arrayFields = ['topPages', 'trafficSources', 'countries', 'devices', 'browsers', 'os', 'dailyStats'];
        
        for (const [key, value] of Object.entries(updateData)) {
            // Only try to parse if it's actually a string that looks like an array/object
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
        
        // Use findOneAndUpdate with 'upsert' for a cleaner atomic operation
        const analytics = await Analytics.findOneAndUpdate(
            { period },
            { 
                ...parsedData, 
                updatedBy: userId,
                updatedAt: new Date() 
            },
            { new: true, upsert: true, runValidators: true }
        );
        
        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: 'Analytics updated successfully',
            data: analytics
        });
    } catch (error) {
        console.error('Update analytics error:', error);
        // This will send the actual database error to your frontend toast
        res.status(400).json({ success: false, message: error.message });
    }
};
}

module.exports = new InsightsController();