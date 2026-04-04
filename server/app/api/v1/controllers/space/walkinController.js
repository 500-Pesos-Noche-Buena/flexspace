const { Booking, Space } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');

class WalkinController {
    getUserId = (req) => {
        return req.user?.sub || req.user?._id || req.user?.id;
    };

    index = async (req, res, next) => {
        try {
            const ownerId = this.getUserId(req);
            const { search = '' } = req.query;

            const userSpaces = await Space.find({ user_id: ownerId }).select('_id');
            const spaceIds = userSpaces.map(s => s._id);

            let query = { 
                space_id: { $in: spaceIds },
                is_walkin: true // Assuming you flag these in your schema
            };

            if (search) {
                query['user_details.name'] = { $regex: search, $options: 'i' };
            }

            const walkins = await Booking.find(query)
                .populate('space_id', 'name')
                .sort({ created_at: -1 });

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: walkins
            });
        } catch (error) {
            next(error);
        }
    };

    store = async (req, res, next) => {
        try {
            const ownerId = this.getUserId(req);
            const { space_id, name, email, duration_hours } = req.body;

            // Verify ownership of the space
            const space = await Space.findOne({ _id: space_id, user_id: ownerId });
            if (!space) throw new ApiError(HTTP_STATUS.FORBIDDEN, "Unauthorized space access.");

            const walkin = await Booking.create({
                space_id,
                user_details: { name, email },
                status: 'confirmed', // Walk-ins are auto-confirmed
                is_walkin: true,
                start_time: new Date(),
                // Example logic: auto-calculate end time based on hours
                end_time: new Date(Date.now() + (duration_hours * 60 * 60 * 1000)),
                booking_reference: `WK-${Math.random().toString(36).toUpperCase().substring(2, 8)}`
            });

            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: "Walk-in checked in successfully!",
                data: walkin
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new WalkinController();