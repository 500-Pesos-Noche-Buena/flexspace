const { Space, Room, Booking } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const { deleteFileByUrl } = require('@/api/v1/utils/cloudinary');

class RoomController {
    getUserId = (req) => {
        return req.user?.id || req.user?._id || req.user?.sub;
    };

    // ✅ Helper to update space available_rooms count
    updateSpaceRoomCount = async (spaceId) => {
        try {
            const availableRooms = await Room.countDocuments({
                space_id: spaceId,
                is_available: true
            });

            await Space.findByIdAndUpdate(spaceId, {
                available_rooms: availableRooms
            });

            console.log(`✅ Updated space ${spaceId} available_rooms to ${availableRooms}`);
            return availableRooms;
        } catch (error) {
            console.error('Failed to update room count:', error);
            return 0;
        }
    };

    // EXISTING METHOD - For space owners (requires auth)
    getRooms = async (req, res, next) => {
        try {
            const { spaceId } = req.params;
            const userId = this.getUserId(req);

            const space = await Space.findOne({ _id: spaceId, user_id: userId });
            if (!space) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Space not found');

            const rooms = await Room.find({ space_id: spaceId }).sort({ created_at: 1 });

            return res.status(HTTP_STATUS.OK).json({ success: true, data: rooms });
        } catch (error) {
            next(error);
        }
    };

    // NEW METHOD - Public access for landing page (no auth required)
    getPublicRoomsBySpace = async (req, res, next) => {
        try {
            const { spaceId } = req.params;

            // Only return available rooms
            const rooms = await Room.find({
                space_id: spaceId,
                is_available: true
            }).sort({ type: 1, name: 1 });

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: rooms
            });
        } catch (error) {
            next(error);
        }
    };

    // Get rooms with availability for today
    getRoomsWithAvailability = async (req, res, next) => {
        try {
            const { spaceId } = req.params;
            const userId = this.getUserId(req);

            // Verify space ownership
            const space = await Space.findOne({ _id: spaceId, user_id: userId });
            if (!space) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Space not found'
                });
            }

            // Get all rooms for this space
            const rooms = await Room.find({
                space_id: spaceId
            }).sort({ name: 1 }).lean();

            if (!rooms || rooms.length === 0) {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    data: []
                });
            }

            // Get today's date range
            const today = new Date();
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);

            console.log('=== GET ROOMS WITH AVAILABILITY ===');
            console.log('Space ID:', spaceId);
            console.log('Room IDs:', rooms.map(r => r._id));

            // Get all bookings for these rooms today
            const bookings = await Booking.find({
                room_id: { $in: rooms.map(r => r._id) },
                status: { $nin: ['cancelled', 'checked_out', 'expired'] },
                $or: [
                    {
                        $and: [
                            { start_time: { $lte: endOfDay } },
                            { end_time: { $gte: startOfDay } }
                        ]
                    }
                ]
            }).lean();

            // Create a map of room_id -> is_booked
            const bookedRoomIds = new Set(bookings.map(b => b.room_id.toString()));

            console.log(`Found ${bookings.length} active bookings today`);
            console.log('Booked room IDs:', [...bookedRoomIds]);

            // Add availability flag to each room
            const roomsWithAvailability = rooms.map(room => ({
                ...room,
                is_available: !bookedRoomIds.has(room._id.toString())
            }));

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: roomsWithAvailability
            });
        } catch (error) {
            console.error('Error in getRoomsWithAvailability:', error);
            next(error);
        }
    };

    // Create a new room
    createRoom = async (req, res, next) => {
        try {
            const { spaceId } = req.params;
            const userId = this.getUserId(req);

            const space = await Space.findOne({ _id: spaceId, user_id: userId });
            if (!space) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Space not found');

            const roomData = {
                ...req.body,
                space_id: spaceId
            };

            // Handle stringified JSON fields from FormData
            if (roomData.amenities && typeof roomData.amenities === 'string') {
                try {
                    roomData.amenities = JSON.parse(roomData.amenities);
                } catch (e) {
                    console.warn('Failed to parse amenities:', e);
                }
            }
            if (roomData.hourly_rates && typeof roomData.hourly_rates === 'string') {
                try {
                    roomData.hourly_rates = JSON.parse(roomData.hourly_rates);
                } catch (e) {
                    console.warn('Failed to parse hourly_rates:', e);
                }
            }
            if (roomData.consumable_packages && typeof roomData.consumable_packages === 'string') {
                try {
                    roomData.consumable_packages = JSON.parse(roomData.consumable_packages);
                } catch (e) {
                    console.warn('Failed to parse consumable_packages:', e);
                }
            }

            // Convert numeric/boolean fields from FormData strings
            if (roomData.capacity !== undefined) roomData.capacity = parseInt(roomData.capacity) || 1;
            if (roomData.rate_hour !== undefined && roomData.rate_hour !== '') roomData.rate_hour = parseFloat(roomData.rate_hour);
            if (roomData.floor_number !== undefined) roomData.floor_number = parseInt(roomData.floor_number) || 1;
            if (roomData.promo_price !== undefined && roomData.promo_price !== '') roomData.promo_price = parseFloat(roomData.promo_price);
            if (roomData.promo_duration_hours !== undefined && roomData.promo_duration_hours !== '') roomData.promo_duration_hours = parseFloat(roomData.promo_duration_hours);
            if (roomData.promo_room_portion !== undefined && roomData.promo_room_portion !== '') roomData.promo_room_portion = parseFloat(roomData.promo_room_portion);
            if (roomData.consumable_allowance !== undefined && roomData.consumable_allowance !== '') roomData.consumable_allowance = parseFloat(roomData.consumable_allowance);
            if (roomData.is_airconditioned !== undefined) roomData.is_airconditioned = roomData.is_airconditioned === true || roomData.is_airconditioned === 'true';
            if (roomData.has_window !== undefined) roomData.has_window = roomData.has_window === true || roomData.has_window === 'true';
            if (roomData.is_available !== undefined) roomData.is_available = roomData.is_available === true || roomData.is_available === 'true';
            if (roomData.has_consumable_promo !== undefined) roomData.has_consumable_promo = roomData.has_consumable_promo === true || roomData.has_consumable_promo === 'true';

            // Handle images from Cloudinary upload middleware
            let imageUrls = [];
            if (req.cloudinaryUrls) {
                imageUrls = Array.isArray(req.cloudinaryUrls)
                    ? req.cloudinaryUrls
                    : (req.cloudinaryUrls.images || []);
            }

            let existingImages = [];
            if (roomData.existing_images !== undefined) {
                try {
                    existingImages = typeof roomData.existing_images === 'string'
                        ? JSON.parse(roomData.existing_images)
                        : (Array.isArray(roomData.existing_images) ? roomData.existing_images : []);
                } catch (e) {
                    existingImages = [];
                }
                delete roomData.existing_images;
            }

            const allImages = [...existingImages, ...imageUrls].filter(Boolean);
            if (allImages.length > 0) {
                roomData.images = allImages;
                roomData.image = allImages[0];
            }

            const room = await Room.create(roomData);

            // ✅ Update space room count
            await this.updateSpaceRoomCount(spaceId);

            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Room added successfully',
                data: room
            });
        } catch (error) {
            next(error);
        }
    };

    // Update room
    updateRoom = async (req, res, next) => {
        try {
            const { roomId } = req.params;
            const userId = this.getUserId(req);

            const room = await Room.findById(roomId).populate('space_id');
            if (!room) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Room not found');

            // Verify ownership
            const space = await Space.findOne({ _id: room.space_id._id, user_id: userId });
            if (!space) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Unauthorized');

            const updates = { ...req.body };
            delete updates._id;
            delete updates.created_at;
            delete updates.space_id;

            // Handle stringified JSON fields from FormData
            if (updates.amenities && typeof updates.amenities === 'string') {
                try {
                    updates.amenities = JSON.parse(updates.amenities);
                } catch (e) {
                    console.warn('Failed to parse amenities:', e);
                }
            }
            if (updates.hourly_rates && typeof updates.hourly_rates === 'string') {
                try {
                    updates.hourly_rates = JSON.parse(updates.hourly_rates);
                } catch (e) {
                    console.warn('Failed to parse hourly_rates:', e);
                }
            }
            if (updates.consumable_packages && typeof updates.consumable_packages === 'string') {
                try {
                    updates.consumable_packages = JSON.parse(updates.consumable_packages);
                } catch (e) {
                    console.warn('Failed to parse consumable_packages:', e);
                }
            }

            // Convert numeric/boolean fields from FormData strings
            if (updates.capacity !== undefined) updates.capacity = parseInt(updates.capacity) || 1;
            if (updates.rate_hour !== undefined && updates.rate_hour !== '') updates.rate_hour = parseFloat(updates.rate_hour);
            if (updates.floor_number !== undefined) updates.floor_number = parseInt(updates.floor_number) || 1;
            if (updates.promo_price !== undefined && updates.promo_price !== '') updates.promo_price = parseFloat(updates.promo_price);
            if (updates.promo_duration_hours !== undefined && updates.promo_duration_hours !== '') updates.promo_duration_hours = parseFloat(updates.promo_duration_hours);
            if (updates.promo_room_portion !== undefined && updates.promo_room_portion !== '') updates.promo_room_portion = parseFloat(updates.promo_room_portion);
            if (updates.consumable_allowance !== undefined && updates.consumable_allowance !== '') updates.consumable_allowance = parseFloat(updates.consumable_allowance);
            if (updates.is_airconditioned !== undefined) updates.is_airconditioned = updates.is_airconditioned === true || updates.is_airconditioned === 'true';
            if (updates.has_window !== undefined) updates.has_window = updates.has_window === true || updates.has_window === 'true';
            if (updates.is_available !== undefined) updates.is_available = updates.is_available === true || updates.is_available === 'true';
            if (updates.has_consumable_promo !== undefined) updates.has_consumable_promo = updates.has_consumable_promo === true || updates.has_consumable_promo === 'true';

            // Handle images
            let newImages = [];
            if (req.cloudinaryUrls) {
                newImages = Array.isArray(req.cloudinaryUrls)
                    ? req.cloudinaryUrls
                    : (req.cloudinaryUrls.images || []);
            }

            let hasExistingImages = false;
            let existingImages = [];
            if (updates.existing_images !== undefined) {
                hasExistingImages = true;
                try {
                    existingImages = typeof updates.existing_images === 'string'
                        ? JSON.parse(updates.existing_images)
                        : (Array.isArray(updates.existing_images) ? updates.existing_images : []);
                } catch (e) {
                    existingImages = [];
                }
                delete updates.existing_images;
            }

            if (hasExistingImages || newImages.length > 0) {
                const combinedImages = [...existingImages, ...newImages].filter(Boolean);
                updates.images = combinedImages;
                updates.image = combinedImages[0] || null;

                // Clean up removed images from Cloudinary (fire and forget)
                const previousImages = room.images || (room.image ? [room.image] : []);
                const removedImages = previousImages.filter(img => !combinedImages.includes(img));
                if (removedImages.length > 0) {
                    Promise.all(removedImages.map(img => {
                        if (img && img.includes('cloudinary')) {
                            return deleteFileByUrl(img).catch(() => {});
                        }
                        return Promise.resolve();
                    })).catch(() => {});
                }
            }

            room.set(updates);
            const updatedRoom = await room.save();

            // ✅ Update space room count
            await this.updateSpaceRoomCount(room.space_id._id);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Room updated',
                data: updatedRoom
            });
        } catch (error) {
            next(error);
        }
    };

    // Add images directly to an existing room
    addImages = async (req, res, next) => {
        try {
            const { roomId } = req.params;
            const userId = this.getUserId(req);

            const room = await Room.findById(roomId).populate('space_id');
            if (!room) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Room not found');

            const space = await Space.findOne({ _id: room.space_id._id, user_id: userId });
            if (!space) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Unauthorized');

            let newImages = [];
            if (req.cloudinaryUrls) {
                newImages = Array.isArray(req.cloudinaryUrls)
                    ? req.cloudinaryUrls
                    : (req.cloudinaryUrls.images || []);
            }

            if (newImages.length === 0) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No images to add');
            }

            const updatedImages = [...(room.images || []), ...newImages].slice(0, 10);
            room.images = updatedImages;
            if (!room.image) room.image = updatedImages[0];
            await room.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `${newImages.length} image(s) added`,
                images: room.images
            });
        } catch (error) {
            next(error);
        }
    };

    // Remove image from room
    removeImage = async (req, res, next) => {
        try {
            const { roomId } = req.params;
            const userId = this.getUserId(req);
            const { image } = req.body;

            if (!image) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Image URL is required');
            }

            const room = await Room.findById(roomId).populate('space_id');
            if (!room) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Room not found');

            const space = await Space.findOne({ _id: room.space_id._id, user_id: userId });
            if (!space) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Unauthorized');

            const currentImages = room.images || [];
            const updatedImages = currentImages.filter(img => img !== image);
            room.images = updatedImages;
            if (room.image === image) {
                room.image = updatedImages[0] || null;
            }
            await room.save();

            if (image && image.includes('cloudinary')) {
                deleteFileByUrl(image).catch(() => {});
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Image removed',
                images: room.images
            });
        } catch (error) {
            next(error);
        }
    };

    // Delete room
    deleteRoom = async (req, res, next) => {
        try {
            const { roomId } = req.params;
            const userId = this.getUserId(req);

            const room = await Room.findById(roomId).populate('space_id');
            if (!room) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Room not found');

            const space = await Space.findOne({ _id: room.space_id._id, user_id: userId });
            if (!space) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Unauthorized');

            const spaceId = room.space_id._id;

            // Delete old room images from Cloudinary (fire and forget)
            const oldImages = room.images || (room.image ? [room.image] : []);
            if (oldImages.length > 0) {
                Promise.all(oldImages.map(img => {
                    if (img && img.includes('cloudinary')) {
                        return deleteFileByUrl(img).catch(() => {});
                    }
                    return Promise.resolve();
                })).catch(() => {});
            }

            await Room.findByIdAndDelete(roomId);

            // ✅ Update space room count
            await this.updateSpaceRoomCount(spaceId);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Room deleted'
            });
        } catch (error) {
            next(error);
        }
    };

    // Check room availability
    checkRoomAvailability = async (req, res, next) => {
        try {
            const { roomId } = req.params;
            const { date, start_time, end_time, is_open_time } = req.query;

            const room = await Room.findById(roomId);
            if (!room) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Room not found'
                });
            }

            // Parse the selected date (user's local date)
            const selectedDate = new Date(date);
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const day = selectedDate.getDate();

            let startDateTime, endDateTime;

            if (is_open_time === 'true') {
                // For open time: whole day from 00:00 to 23:59 in LOCAL time
                startDateTime = new Date(year, month, day, 0, 0, 0);
                endDateTime = new Date(year, month, day, 23, 59, 59);
            } else {
                // For fixed time: specific start and end in LOCAL time
                const [startHour, startMinute] = (start_time || '00:00').split(':');
                const [endHour, endMinute] = (end_time || '23:59').split(':');

                startDateTime = new Date(year, month, day, parseInt(startHour), parseInt(startMinute), 0);
                endDateTime = new Date(year, month, day, parseInt(endHour), parseInt(endMinute), 0);
            }

            console.log('=== AVAILABILITY CHECK ===');
            console.log('Room ID:', roomId);
            console.log('Selected Date:', date);
            console.log('Start DateTime (local):', startDateTime);
            console.log('End DateTime (local):', endDateTime);
            console.log('Is Open Time:', is_open_time);

            // Find ALL conflicting bookings
            const conflictingBookings = await Booking.find({
                room_id: roomId,
                status: { $in: ['pending', 'confirmed', 'active', 'pending_payment'] },
                $or: [
                    {
                        $and: [
                            { start_time: { $lte: endDateTime } },
                            { end_time: { $gte: startDateTime } }
                        ]
                    }
                ]
            }).lean();

            const isAvailable = conflictingBookings.length === 0;

            console.log(`Found ${conflictingBookings.length} conflicting bookings`);
            console.log(`Result: ${isAvailable ? 'AVAILABLE ✅' : 'NOT AVAILABLE ❌'}`);
            console.log('========================');

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    is_available: isAvailable,
                    conflicting_bookings: conflictingBookings.length,
                    available_slots: isAvailable ? 1 : 0,
                    total_capacity: room.capacity
                }
            });
        } catch (error) {
            console.error('Check room availability error:', error);
            next(error);
        }
    };
}

module.exports = new RoomController();