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
            const userId = req.user?.sub || req.user?._id || req.user?.id;
            const userRole = req.user?.role;
            
            let query = {};
            
            if (userRole === 'staff') {
                const staffRecord = await User.findById(userId).select('space_id');
                if (staffRecord?.space_id) {
                    query._id = staffRecord.space_id;
                } else {
                    return res.status(HTTP_STATUS.OK).json({ success: true, data: [] });
                }
            } else {
                const ownerId = await this.getOwnerId(req);
                if (!ownerId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Session expired.');
                query.user_id = ownerId;
            }
            
            const spaces = await Space.find(query)
                .populate('district_id', 'name')
                .sort({ created_at: -1 });
            
            return res.status(HTTP_STATUS.OK).json({ success: true, data: spaces });
        } catch (error) {
            next(error);
        }
    };

    // OPTIMIZED: Store with faster image handling
    store = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Identity missing.');

            const {
                name, area, rate_hour, capacity, status,
                lat, lng, district_id, available_rooms, amenities, description, hours_json
            } = req.body;

            // Get image URLs from Cloudinary (already uploaded via middleware)
            let imageUrls = [];
            if (req.cloudinaryUrls) {
                imageUrls = Array.isArray(req.cloudinaryUrls)
                    ? req.cloudinaryUrls
                    : req.cloudinaryUrls.images || [];
            }

            // Parse JSON fields
            let parsedAmenities = [];
            let parsedHours = null;

            try {
                if (amenities) {
                    parsedAmenities = typeof amenities === 'string' ? JSON.parse(amenities) : amenities;
                }
            } catch (e) {
                console.warn('Failed to parse amenities:', e);
            }

            try {
                if (hours_json) {
                    parsedHours = typeof hours_json === 'string' ? JSON.parse(hours_json) : hours_json;
                }
            } catch (e) {
                console.warn('Failed to parse hours_json:', e);
            }

            const spaceData = {
                name,
                area,
                rate_hour: Number(rate_hour) || 0,
                capacity: Number(capacity) || 0,
                status: status || 'available',
                user_id: userId,
                lat: lat ? Number(lat) : null,
                lng: lng ? Number(lng) : null,
                district_id: district_id || null,
                available_rooms: available_rooms ? Number(available_rooms) : null,
                occupied_seats: 0,
                description: description || null,
                hours_json: parsedHours || null,
                images: imageUrls,
                image: imageUrls[0] || null,
                amenities: parsedAmenities || []
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

    show = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;

            const space = await Space.findOne({ _id: id, user_id: userId })
                .populate('district_id', 'name');

            if (!space) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Space not found');
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: space
            });
        } catch (error) {
            next(error);
        }
    };

    // OPTIMIZED: Update with better error handling and faster image processing
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
            if (updates.amenities) {
                try {
                    updates.amenities = typeof updates.amenities === 'string'
                        ? JSON.parse(updates.amenities)
                        : updates.amenities;
                } catch (e) {
                    console.error('Failed to parse amenities:', e);
                    delete updates.amenities;
                }
            }

            // Handle hours_json - skip if it's not valid JSON
            if (updates.hours_json) {
                try {
                    if (typeof updates.hours_json === 'string') {
                        // Check if it's actually a JSON object string
                        if (updates.hours_json.trim().startsWith('{')) {
                            updates.hours_json = JSON.parse(updates.hours_json);
                        } else {
                            // It's probably a plain string, skip it
                            delete updates.hours_json;
                        }
                    }
                } catch (e) {
                    console.warn('Failed to parse hours_json:', e);
                    delete updates.hours_json;
                }
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

            // 🚀 OPTIMIZED: Handle new image uploads
            if (req.cloudinaryUrls) {
                const newImages = Array.isArray(req.cloudinaryUrls)
                    ? req.cloudinaryUrls
                    : req.cloudinaryUrls.images || [];

                if (newImages.length > 0) {
                    // Delete old images from Cloudinary (async, don't wait)
                    const oldImages = space.images || [];
                    if (oldImages.length > 0) {
                        // Fire and forget - don't await to speed up response
                        Promise.all(oldImages.map(img => {
                            if (img && img.includes('cloudinary')) {
                                return deleteFileByUrl(img).catch(() => {});
                            }
                            return Promise.resolve();
                        })).catch(() => {});
                        console.log(`🗑️ Queued deletion of ${oldImages.length} old images`);
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

            // 🚀 OPTIMIZED: Delete images in background
            const allImages = [...(space.images || []), space.image].filter(Boolean);
            if (allImages.length > 0) {
                // Fire and forget - don't wait for deletion to complete
                Promise.all(allImages.map(img => {
                    if (img && img.includes('cloudinary')) {
                        return deleteFileByUrl(img).catch(() => {});
                    }
                    return Promise.resolve();
                })).catch(() => {});
                console.log(`🗑️ Queued deletion of ${allImages.length} images`);
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

    // OPTIMIZED: Add images with faster response
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

    // OPTIMIZED: Remove image with faster response
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

            // 🚀 OPTIMIZED: Delete from Cloudinary in background
            if (image && image.includes('cloudinary')) {
                // Fire and forget
                deleteFileByUrl(image).catch(() => {});
                console.log(`🗑️ Queued deletion of image: ${image}`);
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