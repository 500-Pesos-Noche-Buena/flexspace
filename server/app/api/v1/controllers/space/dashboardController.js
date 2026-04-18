const { Space, Booking, User } = require('@/api/v1/models'); // ← add User
const { HTTP_STATUS } = require('@/utils/constants');

class DashboardController {

    getOwnerId = async (req) => {
        const userId = req.user?.sub || req.user?._id || req.user?.id;

        if (req.user?.role === 'staff') {
            const staffRecord = await User.findById(userId).select('parent_id');
            if (staffRecord?.parent_id) {
                return { ownerId: staffRecord.parent_id.toString(), isStaff: true };
            }
        }

        return { ownerId: userId?.toString(), isStaff: false };
    };

    index = async (req, res, next) => {
        try {
            const { ownerId, isStaff } = await this.getOwnerId(req);
            const { period = 'daily' } = req.query;

            const userSpaces = await Space.find({ user_id: ownerId }).distinct('_id');

            const now = new Date();
            let startDate = new Date();
            startDate.setHours(0, 0, 0, 0);

            if (period === 'weekly')  startDate.setDate(now.getDate() - 7);
            else if (period === 'monthly') startDate.setMonth(now.getMonth() - 1);
            else if (period === 'yearly')  startDate.setFullYear(now.getFullYear() - 1);

            const [stats, activeSessions, revenueData] = await Promise.all([
                Promise.all([
                    // Staff don't need space count — return null, hide it on frontend
                    isStaff ? null : Space.countDocuments({ user_id: ownerId }),
                    Booking.countDocuments({ space_id: { $in: userSpaces } }),
                    Booking.countDocuments({
                        booking_type: 'walkin',
                        space_id: { $in: userSpaces },
                        created_at: { $gte: startDate }
                    })
                ]),
                Booking.find({ status: 'active', space_id: { $in: userSpaces } })
                    .select('guest_name user_id check_in_at _id')
                    .populate('user_id', 'name')
                    .sort({ check_in_at: -1 })
                    .limit(5),
                Booking.aggregate([
                    {
                        $match: {
                            space_id: { $in: userSpaces },
                            status: 'completed',
                            updated_at: { $gte: startDate }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$total_amount' }
                        }
                    }
                ])
            ]);

            const formattedSessions = activeSessions.map(session => ({
                _id:       session._id,
                userName:  session.guest_name || session.user_id?.name || 'Guest',
                startTime: session.check_in_at
                    ? new Date(session.check_in_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
                    : 'N/A'
            }));

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                isStaff,   // ← frontend uses this to hide the spaces card
                stats: {
                    spaces:   isStaff ? null : stats[0],
                    bookings: stats[1],
                    walkins:  stats[2],
                    revenue:  revenueData[0]?.total || 0
                },
                activeSessions: formattedSessions
            });

        } catch (error) {
            next(error);
        }
    };
}

module.exports = new DashboardController();