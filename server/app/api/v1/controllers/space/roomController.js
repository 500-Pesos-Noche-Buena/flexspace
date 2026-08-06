const { Space, Room, Booking } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

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

            // Handle amenities as JSON string
            if (roomData.amenities && typeof roomData.amenities === 'string') {
                roomData.amenities = JSON.parse(roomData.amenities);
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

            if (updates.amenities && typeof updates.amenities === 'string') {
                updates.amenities = JSON.parse(updates.amenities);
            }

            const updatedRoom = await Room.findByIdAndUpdate(roomId, updates, { new: true });

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