const { Settings } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const ApiError = require('@/api/v1/utils/ApiError');

const DEFAULT_SETTINGS = [
    { key: 'platform_fee_percent', value: 10, label: 'Platform Fee' },
    { key: 'max_booking_hours', value: 24, label: 'Max Booking Hours' },
    { key: 'cancellation_window_hours', value: 2, label: 'Cancellation Window' },
    { key: 'allow_walkin_guest', value: true, label: 'Allow Anonymous Walk-ins' },
    { key: 'maintenance_mode', value: false, label: 'Maintenance Mode' },
    { key: 'maintenance_message', value: 'System is currently undergoing scheduled maintenance. Please check back shortly.', label: 'Maintenance Message' }
];

class SettingsController {
    index = async (req, res, next) => {
        try {
            const settings = await Settings.find({});
            const existingKeys = new Set(settings.map(s => s.key));

            // Return existing or defaults if any default is missing
            const allSettings = [...settings];
            for (const def of DEFAULT_SETTINGS) {
                if (!existingKeys.has(def.key)) {
                    allSettings.push({ key: def.key, value: def.value, label: def.label });
                }
            }

            return res.status(HTTP_STATUS.OK).json({ success: true, data: allSettings });
        } catch (error) { next(error); }
    };

    update = async (req, res, next) => {
        try {
            const { key, value } = req.body;
            if (!key || typeof key !== 'string') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Setting key is required.');
            }

            let finalValue = value;

            // Validation & parsing based on key
            switch (key) {
                case 'max_booking_hours': {
                    const parsed = Number(value);
                    if (isNaN(parsed) || !Number.isInteger(parsed) || parsed < 1 || parsed > 72) {
                        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Max booking hours must be a whole number between 1 and 72.');
                    }
                    finalValue = parsed;
                    break;
                }
                case 'cancellation_window_hours': {
                    const parsed = Number(value);
                    if (isNaN(parsed) || parsed < 0 || parsed > 72) {
                        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cancellation window must be a number between 0 and 72 hours.');
                    }
                    finalValue = parsed;
                    break;
                }
                case 'platform_fee_percent': {
                    const parsed = Number(value);
                    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
                        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Platform fee must be a percentage between 0 and 100.');
                    }
                    finalValue = parsed;
                    break;
                }
                case 'allow_walkin_guest':
                case 'maintenance_mode': {
                    if (value === 'true' || value === 1 || value === true) finalValue = true;
                    else if (value === 'false' || value === 0 || value === false) finalValue = false;
                    else {
                        throw new ApiError(HTTP_STATUS.BAD_REQUEST, `${key} must be a boolean value.`);
                    }
                    break;
                }
                case 'maintenance_message': {
                    if (typeof value !== 'string') {
                        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Maintenance message must be text.');
                    }
                    if (value.length > 500) {
                        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Maintenance message cannot exceed 500 characters.');
                    }
                    finalValue = value;
                    break;
                }
                default: {
                    if (typeof value === 'boolean' || value === 'true' || value === 'false') {
                        finalValue = value === true || value === 'true';
                    }
                    break;
                }
            }

            console.log(`[Settings] Saving ${key}:`, finalValue, 'Type:', typeof finalValue);

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