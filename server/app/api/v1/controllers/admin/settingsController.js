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
            const setting = await Settings.findOneAndUpdate(
                { key },
                { value },
                { new: true, upsert: true }
            );
            return res.status(HTTP_STATUS.OK).json({ success: true, data: setting });
        } catch (error) { next(error); }
    };
}

module.exports = new SettingsController();