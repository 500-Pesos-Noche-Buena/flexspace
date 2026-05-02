const { Space, User } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const fs = require('fs');
const path = require('path');

class SpaceController {
    getUploadPath = (userId, filename) => {
        return path.join(process.cwd(), 'server/public/uploads/spaces', userId, filename);
    };

    getUserId = (req) => {
        return req.user?.id || req.user?._id || req.user?.sub;
    };

    getOwnerId = async (req) => {
        const userId = this.getUserId(req);

        if (req.user?.role === 'staff') {
            const staffRecord = await User.findById(userId).select('parent_id');
            if (staffRecord?.parent_id) {
                return staffRecord.parent_id.toString();
            }
        }

        return userId?.toString();
    };

    index = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            if (!ownerId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Session expired.');

            const spaces = await Space.find({ user_id: ownerId })
                .populate('district_id', 'name')
                .sort({ created_at: -1 });

            return res.status(HTTP_STATUS.OK).json({ success: true, data: spaces });
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
                lat, lng, district_id, available_rooms, amenities
            } = req.body;

            // Handle multiple images - files are already in user-specific folder
            let imageFilenames = [];
            if (req.files && req.files.length > 0) {
                imageFilenames = req.files.slice(0, 10).map(file => file.filename);
            } else if (req.file) {
                imageFilenames = [req.file.filename];
            }

            const spaceData = {
                name,
                area,
                rate_hour: Number(rate_hour),
                capacity: Number(capacity),
                status: status || 'available',
                user_id: userId,
                lat: lat ? Number(lat) : null,
                lng: lng ? Number(lng) : null,
                district_id: district_id || null,
                available_rooms: available_rooms || null,
                occupied_seats: 0,
                images: imageFilenames,
                image: imageFilenames[0] || null,
                amenities: amenities ? (typeof amenities === 'string' ? JSON.parse(amenities) : amenities) : []
            };

            const space = await Space.create(spaceData);

            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Space published successfully!',
                data: space
            });
        } catch (error) {
            // Clean up uploaded files if creation fails
            const userId = this.getUserId(req);
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const filePath = this.getUploadPath(userId, file.filename);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
            } else if (req.file) {
                const filePath = this.getUploadPath(userId, req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;

            const space = await Space.findOne({ _id: id, user_id: userId });
            if (!space) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Space not found or unauthorized.');

            const updates = { ...req.body };

            // Handle amenities
            if (updates.amenities && typeof updates.amenities === 'string') {
                updates.amenities = JSON.parse(updates.amenities);
            }

            // Handle district_id
            if (updates.district_id) {
                if (typeof updates.district_id === 'object' && updates.district_id._id) {
                    updates.district_id = updates.district_id._id;
                } else if (updates.district_id === '[object Object]') {
                    delete updates.district_id;
                }
            }

            // Convert numbers
            if (updates.rate_hour) updates.rate_hour = Number(updates.rate_hour);
            if (updates.capacity) updates.capacity = Number(updates.capacity);
            if (updates.lat) updates.lat = Number(updates.lat);
            if (updates.lng) updates.lng = Number(updates.lng);

            // Handle multiple image uploads
            if (req.files && req.files.length > 0) {
                // Delete old images from user folder
                if (space.images && space.images.length > 0) {
                    for (const oldImage of space.images) {
                        const oldPath = this.getUploadPath(userId, oldImage);
                        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                    }
                }
                const newImages = req.files.slice(0, 10).map(file => file.filename);
                updates.images = newImages;
                updates.image = newImages[0];
            }

            const updatedSpace = await Space.findByIdAndUpdate(id, updates, { new: true });

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Space updated!',
                data: updatedSpace
            });
        } catch (error) {
            // Clean up uploaded files if update fails
            const userId = this.getUserId(req);
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const filePath = this.getUploadPath(userId, file.filename);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
            }
            next(error);
        }
    };

    delete = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;

            const space = await Space.findOne({ _id: id, user_id: userId });
            if (!space) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Space not found.');

            // Delete all images from user folder
            const allImages = [...(space.images || []), space.image].filter(Boolean);
            for (const image of allImages) {
                const imgPath = this.getUploadPath(userId, image);
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            }

            await Space.findByIdAndDelete(id);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Space and images removed.'
            });
        } catch (error) {
            next(error);
        }
    };


    addImages = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;

            const space = await Space.findOne({ _id: id, user_id: userId });
            if (!space) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Space not found');

            const newImages = req.files.map(file => file.filename);
            const updatedImages = [...(space.images || []), ...newImages].slice(0, 10);

            space.images = updatedImages;
            if (!space.image && updatedImages.length > 0) {
                space.image = updatedImages[0];
            }
            await space.save();

            return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Images added', images: space.images });
        } catch (error) {
            next(error);
        }
    };

    removeImage = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;
            const { image } = req.body;

            const space = await Space.findOne({ _id: id, user_id: userId });
            if (!space) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Space not found');

            // Remove from array
            space.images = space.images.filter(img => img !== image);

            // If removed image was primary, set new primary
            if (space.image === image) {
                space.image = space.images[0] || null;
            }

            await space.save();

            // Delete file from disk
            const filePath = this.getUploadPath(userId, image);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

            return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Image removed' });
        } catch (error) {
            next(error);
        }
    };

    setPrimaryImage = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;
            const { image } = req.body;

            const space = await Space.findOne({ _id: id, user_id: userId });
            if (!space) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Space not found');

            if (!space.images.includes(image)) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Image not found in space gallery');
            }

            space.image = image;
            await space.save();

            return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Primary image updated' });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new SpaceController();