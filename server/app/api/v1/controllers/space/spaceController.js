const { Space } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');
const fs = require('fs');
const path = require('path');

class SpaceController {
    getUserId = (req) => {
        return req.user?.id || req.user?._id || req.user?.sub;
    };

    index = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Session expired.');

            const spaces = await Space.find({ user_id: userId })
                .populate('district_id', 'name')
                .sort({ created_at: -1 });

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: spaces
            });
        } catch (error) {
            next(error);
        }
    };

    store = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Identity missing.');

            const {
                name, area, rate_hour, capacity, status,
                lat, lng, district_id, available_rooms
            } = req.body;

            const space = await Space.create({
                name,
                area,
                rate_hour: Number(rate_hour),
                capacity: Number(capacity),
                status,
                user_id: userId,
                lat: lat ? Number(lat) : null,
                lng: lng ? Number(lng) : null,
                district_id: district_id || null,
                available_rooms: available_rooms || null,
                occupied_seats: 0,
                image: req.file ? req.file.filename : null
            });

            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Space published!',
                data: space
            });
        } catch (error) {
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;
            const space = await Space.findOne({ _id: id, user_id: userId });

            if (!space) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized or not found.');

            const updates = { ...req.body };

            // Clean up numeric fields
            if (updates.rate_hour) updates.rate_hour = Number(updates.rate_hour);
            if (updates.capacity) updates.capacity = Number(updates.capacity);
            if (updates.lat) updates.lat = Number(updates.lat);
            if (updates.lng) updates.lng = Number(updates.lng);

            if (req.file) {
                if (space.image) {
                    const oldPath = path.join(__dirname, '../../../../public/uploads/spaces', space.image);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                updates.image = req.file.filename;
            }

            const updatedSpace = await Space.findByIdAndUpdate(id, updates, { new: true });
            return res.status(HTTP_STATUS.OK).json({ success: true, data: updatedSpace });
        } catch (error) {
            next(error);
        }
    };

    delete = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;
            const space = await Space.findOne({ _id: id, user_id: userId });

            if (!space) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized or not found.');

            if (space.image) {
                const imgPath = path.join(__dirname, '../../../../public/uploads/spaces', space.image);
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            }

            await Space.findByIdAndDelete(id);
            return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Removed.' });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new SpaceController();