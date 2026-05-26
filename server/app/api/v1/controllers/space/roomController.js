const { Space, Room, Booking } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class RoomController {
    getUserId = (req) => {
        return req.user?.id || req.user?._id || req.user?.sub;
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

            // Update space room count
            const roomCount = await Room.countDocuments({ space_id: spaceId });
            await Space.findByIdAndUpdate(spaceId, {
                has_rooms: true,
                room_count: roomCount
            });

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

            await Room.findByIdAndDelete(roomId);

            // Update space room count
            const roomCount = await Room.countDocuments({ space_id: room.space_id._id });
            await Space.findByIdAndUpdate(room.space_id._id, {
                room_count: roomCount,
                has_rooms: roomCount > 0
            });

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Room deleted'
            });
        } catch (error) {
            next(error);
        }
    };

// Complete fixed checkRoomAvailability method for roomController.js
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

        // Find ALL conflicting bookings (including pending, confirmed, active, pending_payment)
        const conflictingBookings = await Booking.find({
            room_id: roomId,
            status: { $in: ['pending', 'confirmed', 'active', 'pending_payment'] },
            $or: [
                // Booking overlaps with selected time range
                {
                    $and: [
                        { start_time: { $lte: endDateTime } },
                        { end_time: { $gte: startDateTime } }
                    ]
                }
            ]
        }).lean();

        const isAvailable = conflictingBookings.length === 0;

        console.log(`Found ${conflictingBookings.length} conflicting bookings:`);
        conflictingBookings.forEach(booking => {
            console.log(`- Booking ${booking._id}: ${booking.status}, ${booking.start_time} to ${booking.end_time}`);
        });
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