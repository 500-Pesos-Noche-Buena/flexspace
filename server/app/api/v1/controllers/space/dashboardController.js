const { Space, Booking } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/utils/constants');

class DashboardController {
    index = async (req, res, next) => {
        try {
            const ownerId = req.user?.sub || req.user?._id || req.user?.id;

            if (!ownerId) {
                console.error("Access Denied: No ownerId found. Payload was:", req.user);
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    success: false,
                    message: "Unauthorized: User session missing."
                });
            }

            const userSpaces = await Space.find({ user_id: ownerId }).distinct('_id');
            const [activeSpacesCount, totalBookings, walkinsToday, activeSessions] = await Promise.all([
                Space.countDocuments({ user_id: ownerId }),

                Booking.countDocuments({
                    space_id: { $in: userSpaces }
                }),

                Booking.countDocuments({
                    booking_type: 'walkin',
                    space_id: { $in: userSpaces },
                    created_at: {
                        $gte: new Date().setHours(0, 0, 0, 0),
                        $lt: new Date().setHours(23, 59, 59, 999)
                    }
                }),

                Booking.find({
                    status: 'active',
                    space_id: { $in: userSpaces }
                })
                    .select('guest_name user_id check_in_at _id')
                    .populate('user_id', 'name')
                    .sort({ check_in_at: -1 })
                    .limit(5)
            ]);

            const formattedSessions = activeSessions.map(session => ({
                _id: session._id,
                userName: session.guest_name || (session.user_id ? session.user_id.name : 'Guest'),
                startTime: session.check_in_at
                    ? new Date(session.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'N/A'
            }));

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                stats: {
                    spaces: activeSpacesCount,
                    bookings: totalBookings,
                    walkins: walkinsToday
                },
                activeSessions: formattedSessions
            });

        } catch (error) {
            console.error("Dashboard Error:", error);
            next(error);
        }
    };
}

module.exports = new DashboardController();