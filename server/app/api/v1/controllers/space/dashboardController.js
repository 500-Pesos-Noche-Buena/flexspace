const { User, Space, Booking } = require('@/api/v1/models');

class DashboardController {
    async index(req, res) {
        try {
            const ownerId = req.user._id; 

            // First, get all space IDs owned by this user
            const userSpaces = await Space.find({ user_id: ownerId }).distinct('_id');

            // Fetch metrics in parallel
            const [activeSpacesCount, totalBookings, walkinsToday, activeSessions] = await Promise.all([
                // 1. Count active listings
                Space.countDocuments({ user_id: ownerId }),
                
                // 2. Count bookings for those spaces
                Booking.countDocuments({ 
                    space_id: { $in: userSpaces } 
                }),
                
                // 3. Count today's walk-ins
                Booking.countDocuments({ 
                    booking_type: 'walkin',
                    space_id: { $in: userSpaces },
                    created_at: { 
                        $gte: new Date().setHours(0, 0, 0, 0),
                        $lt: new Date().setHours(23, 59, 59, 999)
                    } 
                }),

                // 4. Get live occupants
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
                startTime: session.check_in_at ? new Date(session.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'
            }));

            return res.status(200).json({
                success: true,
                stats: {
                    spaces: activeSpacesCount,
                    bookings: totalBookings,
                    walkins: walkinsToday
                },
                activeSessions: formattedSessions
            });

        } catch (error) {
            console.error("Space Dashboard Sync Error:", error);
            return res.status(500).json({ 
                success: false, 
                message: "Internal Server Error" 
            });
        }
    }
}

module.exports = new DashboardController();