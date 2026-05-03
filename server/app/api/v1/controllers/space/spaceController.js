const { Space, User } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const { deleteFileByUrl, extractPublicId } = require('@/api/v1/utils/cloudinary');

class SpaceController {
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
                lat, lng, district_id, available_rooms, amenities, description, hours_json
            } = req.body;

            let imageUrls = [];
            if (req.cloudinaryUrls) {
                imageUrls = Array.isArray(req.cloudinaryUrls) 
                    ? req.cloudinaryUrls 
                    : req.cloudinaryUrls.images || [];
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
                description: description || null,
                hours_json: hours_json ? (typeof hours_json === 'string' ? JSON.parse(hours_json) : hours_json) : null,
                images: imageUrls,
                image: imageUrls[0] || null,
                amenities: amenities ? (typeof amenities === 'string' ? JSON.parse(amenities) : amenities) : []
            };

            const space = await Space.create(spaceData);

            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Space published successfully!',
                data: space
            });
        } catch (error) {
            console.error('Store error:', error);
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

            // Remove fields that shouldn't be updated directly
            delete updates._id;
            delete updates.__v;
            delete updates.created_at;
            delete updates.updated_at;

            // Handle amenities
            if (updates.amenities && typeof updates.amenities === 'string') {
                updates.amenities = JSON.parse(updates.amenities);
            }

            // Handle hours_json
            if (updates.hours_json && typeof updates.hours_json === 'string') {
                updates.hours_json = JSON.parse(updates.hours_json);
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

            // Handle new image uploads from Cloudinary - DELETE OLD IMAGES
            if (req.cloudinaryUrls) {
                const newImages = Array.isArray(req.cloudinaryUrls) 
                    ? req.cloudinaryUrls 
                    : req.cloudinaryUrls.images || [];
                
                if (newImages.length > 0) {
                    // 🔥 DELETE OLD IMAGES FROM CLOUDINARY
                    const oldImages = space.images || [];
                    for (const oldImage of oldImages) {
                        if (oldImage && oldImage.includes('cloudinary')) {
                            await deleteFileByUrl(oldImage);
                            console.log(`🗑️ Deleted old image: ${oldImage}`);
                        }
                    }
                    
                    // Set new images
                    updates.images = newImages;
                    updates.image = newImages[0];
                }
            }

            const updatedSpace = await Space.findByIdAndUpdate(id, updates, { 
                new: true,
                runValidators: true
            });

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Space updated!',
                data: updatedSpace
            });
        } catch (error) {
            console.error('Update error:', error);
            next(error);
        }
    };

    delete = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;

            const space = await Space.findOne({ _id: id, user_id: userId });
            if (!space) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Space not found.');

            // 🔥 DELETE ALL IMAGES FROM CLOUDINARY BEFORE DELETING SPACE
            const allImages = [...(space.images || []), space.image].filter(Boolean);
            for (const image of allImages) {
                if (image && image.includes('cloudinary')) {
                    await deleteFileByUrl(image);
                    console.log(`🗑️ Deleted image: ${image}`);
                }
            }

            await Space.findByIdAndDelete(id);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Space removed.'
            });
        } catch (error) {
            console.error('Delete error:', error);
            next(error);
        }
    };

    addImages = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;

            const space = await Space.findOne({ _id: id, user_id: userId });
            if (!space) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Space not found');

            let newImages = [];
            if (req.cloudinaryUrls) {
                newImages = Array.isArray(req.cloudinaryUrls) 
                    ? req.cloudinaryUrls 
                    : req.cloudinaryUrls.images || [];
            }

            if (newImages.length === 0) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No images to add');
            }

            const updatedImages = [...(space.images || []), ...newImages].slice(0, 10);
            
            const updatedSpace = await Space.findByIdAndUpdate(
                id,
                {
                    $set: {
                        images: updatedImages,
                        image: space.image || updatedImages[0]
                    }
                },
                { new: true, runValidators: false }
            );

            return res.status(HTTP_STATUS.OK).json({ 
                success: true, 
                message: `${newImages.length} image(s) added`, 
                images: updatedSpace.images 
            });
        } catch (error) {
            console.error('Add images error:', error);
            next(error);
        }
    };

    removeImage = async (req, res, next) => {
    try {
        const userId = this.getUserId(req);
        const { id } = req.params;
        const { image } = req.body;

        if (!image) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Image URL is required');
        }

        const space = await Space.findOne({ _id: id, user_id: userId });
        if (!space) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Space not found');

        // 🔥 DELETE FROM CLOUDINARY
        if (image && image.includes('cloudinary')) {
            const deleted = await deleteFileByUrl(image);
            if (deleted) {
                console.log(`✅ Deleted image from Cloudinary: ${image}`);
            } else {
                console.log(`⚠️ Failed to delete from Cloudinary: ${image}`);
            }
        }

        // Remove from database
        const updatedImages = space.images.filter(img => img !== image);
        
        let newPrimaryImage = space.image;
        if (space.image === image) {
            newPrimaryImage = updatedImages[0] || null;
        }

        const updatedSpace = await Space.findByIdAndUpdate(
            id,
            {
                $set: {
                    images: updatedImages,
                    image: newPrimaryImage
                }
            },
            { new: true, runValidators: false }
        );

        return res.status(HTTP_STATUS.OK).json({ 
            success: true, 
            message: 'Image removed successfully',
            images: updatedSpace.images
        });
    } catch (error) {
        console.error('Remove image error:', error);
        next(error);
    }
};

    setPrimaryImage = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;
            const { image } = req.body;

            if (!image) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Image URL is required');
            }

            const space = await Space.findOne({ _id: id, user_id: userId });
            if (!space) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Space not found');

            if (!space.images.includes(image)) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Image not found in space gallery');
            }

            const updatedSpace = await Space.findByIdAndUpdate(
                id,
                { $set: { image: image } },
                { new: true, runValidators: false }
            );

            return res.status(HTTP_STATUS.OK).json({ 
                success: true, 
                message: 'Primary image updated',
                image: updatedSpace.image
            });
        } catch (error) {
            console.error('Set primary image error:', error);
            next(error);
        }
    };
}

module.exports = new SpaceController();