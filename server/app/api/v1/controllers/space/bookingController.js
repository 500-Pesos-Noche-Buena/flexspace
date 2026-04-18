// Space/bookingController
const { Booking, Space } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');

class BookingController {
    getUserId = (req) => req.user?.sub || req.user?._id || req.user?.id;

    index = async (req, res, next) => {
        try {
            const ownerId = this.getUserId(req);
            if (!ownerId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Session missing.");

            const { page = 1, limit = 10, search = '', status = '' } = req.query;
            const userSpaces = await Space.find({ user_id: ownerId }).select('_id');
            const spaceIds = userSpaces.map(s => s._id);

            // --- PH TIME AUTO-EXPIRY LOGIC ---
            const now = new Date();
            // Get the very start of "Today" in PH time
            const startOfToday = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Manila"}));
            startOfToday.setHours(0,0,0,0);

            // Grace period for fixed slots (e.g., 1.5 hours)
            const gracePeriod = new Date(now.getTime() - 90 * 60 * 1000);

            await Booking.updateMany(
                {
                    space_id: { $in: spaceIds },
                    status: 'confirmed',
                    check_in_at: null,
                    $or: [
                        { 
                            is_open_time: false, 
                            start_time: { $lt: gracePeriod } // Cancel if 1.5hrs late
                        },
                        { 
                            is_open_time: true, 
                            end_time: { $lt: startOfToday } // Only cancel Open Time if it's from a previous day
                        }
                    ]
                },
                { 
                    $set: { 
                        status: 'cancelled', 
                        notes: 'Auto-cancelled: No-show or period expired.' 
                    } 
                }
            );

            // Build Query
            let query = { space_id: { $in: spaceIds } };
            if (status) query.status = status;
            if (search) {
                query.$or = [
                    { ticket_number: { $regex: search, $options: 'i' } },
                    { booking_reference: { $regex: search, $options: 'i' } }
                ];
            }

            const total = await Booking.countDocuments(query);
            const bookings = await Booking.find(query)
                .populate('space_id', 'name image')
                .populate('user_id', 'name email')
                .sort({ created_at: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const stats = {
                total,
                pending: await Booking.countDocuments({ space_id: { $in: spaceIds }, status: 'pending' }),
                confirmed: await Booking.countDocuments({ space_id: { $in: spaceIds }, status: 'confirmed' }),
                active: await Booking.countDocuments({ space_id: { $in: spaceIds }, status: 'active' }),
                cancelled: await Booking.countDocuments({ space_id: { $in: spaceIds }, status: { $in: ['cancelled', 'rejected'] } })
            };

            return res.status(HTTP_STATUS.OK).json({ success: true, data: { bookings, total, stats } });
        } catch (error) {
            next(error);
        }
    };

    updateStatus = async (req, res, next) => {
        try {
            const { id, action } = req.params;
            const ownerId = this.getUserId(req);

            const booking = await Booking.findById(id).populate('space_id');
            if (!booking || String(booking.space_id.user_id) !== String(ownerId)) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized access.');
            }

            const statusMap = {
                confirm: 'confirmed',
                reject: 'rejected',
                cancel: 'cancelled'
            };

            booking.status = statusMap[action] || booking.status;
            
            // Clear system notes if manually approving
            if (action === 'confirm') booking.notes = ''; 

            await booking.save();
            return res.status(HTTP_STATUS.OK).json({ success: true, message: `Status updated to ${booking.status}` });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new BookingController();