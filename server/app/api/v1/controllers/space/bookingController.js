const { Booking, Space } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');

class BookingController {
    /**
     * Standardized User ID Extractor 
     * Matches Dashboard logic to handle different JWT payload structures
     */
    getUserId = (req) => {
        return req.user?.sub || req.user?._id || req.user?.id;
    };

    index = async (req, res, next) => {
        try {
            const ownerId = this.getUserId(req);

            if (!ownerId) {
                console.error("🏢 Access Denied: No ownerId found for Bookings. Payload was:", req.user);
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    success: false,
                    message: "Unauthorized: User session missing."
                });
            }

            const { page = 1, limit = 10, search = '', status = '' } = req.query;

            // 1. Get all spaces owned by this specific owner
            const userSpaces = await Space.find({ user_id: ownerId }).select('_id');
            const spaceIds = userSpaces.map(s => s._id);

            // 2. Build Query - Filter by owner's space pool
            let query = { space_id: { $in: spaceIds } };
            
            if (status) query.status = status;
            
            if (search) {
                query.$or = [
                    { booking_reference: { $regex: search, $options: 'i' } },
                    { 'user_details.name': { $regex: search, $options: 'i' } }
                ];
            }

            // 3. Execute with Pagination
            const total = await Booking.countDocuments(query);
            const bookings = await Booking.find(query)
                .populate('space_id', 'name image')
                .sort({ created_at: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            // 4. Stats for the Dashboard-style Grid
            const stats = {
                total,
                pending: await Booking.countDocuments({ space_id: { $in: spaceIds }, status: 'pending' }),
                confirmed: await Booking.countDocuments({ space_id: { $in: spaceIds }, status: 'confirmed' }),
                cancelled: await Booking.countDocuments({ space_id: { $in: spaceIds }, status: 'cancelled' })
            };

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    bookings,
                    total,
                    stats
                }
            });
        } catch (error) {
            console.error("❌ Booking Index Error:", error);
            next(error);
        }
    };

    updateStatus = async (req, res, next) => {
        try {
            const { id, action } = req.params;
            const ownerId = this.getUserId(req);

            if (!ownerId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Session expired.');

            const booking = await Booking.findById(id).populate('space_id');
            
            if (!booking || String(booking.space_id.user_id) !== String(ownerId)) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking record not found or access denied.');
            }

            booking.status = action === 'confirm' ? 'confirmed' : 'cancelled';
            await booking.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `Booking has been ${booking.status}.`,
                data: { status: booking.status }
            });
        } catch (error) {
            console.error("❌ Booking Update Error:", error);
            next(error);
        }
    };
}

module.exports = new BookingController();