const { Settings } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class SettingsController {
    index = async (req, res, next) => {
        try {
            const settings = await Settings.find({});
            return res.status(HTTP_STATUS.OK).json({ success: true, data: settings });
        } catch (error) { next(error); }
    };

    update = async (req, res, next) => {
        try {
            const { key, value } = req.body;
            
            // Convert value properly for boolean settings
            let finalValue = value;
            
            // For maintenance_mode, ensure it's stored as boolean
            if (key === 'maintenance_mode') {
                // Convert string 'true'/'false' to actual boolean
                if (value === 'true') finalValue = true;
                if (value === 'false') finalValue = false;
                // Convert number 0/1 to boolean
                if (value === 0) finalValue = false;
                if (value === 1) finalValue = true;
                // Keep actual boolean as is
                if (typeof value === 'boolean') finalValue = value;
            }
            
            // For boolean values in other keys
            if (typeof value === 'boolean') {
                finalValue = value;
            }
            
            console.log(`Saving ${key}:`, finalValue, 'Type:', typeof finalValue);
            
            const setting = await Settings.findOneAndUpdate(
                { key },
                { value: finalValue },
                { new: true, upsert: true }
            );
            
            return res.status(HTTP_STATUS.OK).json({ success: true, data: setting });
        } catch (error) { 
            console.error('Settings update error:', error);
            next(error); 
        }
    };
}

module.exports = new SettingsController();