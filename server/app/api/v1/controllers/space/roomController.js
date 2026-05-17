const { Space, Room } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class RoomController {
    getUserId = (req) => {
        return req.user?.id || req.user?._id || req.user?.sub;
    };

    // Get all rooms for a space
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
}

module.exports = new RoomController();