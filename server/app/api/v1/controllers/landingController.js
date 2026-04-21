const { Space, District, User, Booking } = require('@/api/v1/models');

class LandingController {
    async getExplorerData(req, res) {
        try {
            const [spaces, districts] = await Promise.all([
                Space.find({ status: 'Open Now' })
                    .populate('district_id', 'name')
                    .select('name area lat lng rate_hour images image user_id status district_id rating review_count capacity amenities description hours_json')
                    .lean(),
                District.find({ active: true })
                    .sort({ name: 1 })
                    .lean()
            ]);

            return res.status(200).json({
                success: true,
                count: spaces.length,
                data: {
                    spaces,
                    districts
                }
            });
        } catch (error) {
            console.error(`[LandingController Error]: ${error.message}`);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    }

    async getSpaceDetails(req, res) {
        try {
            const space = await Space.findById(req.params.id)
                .populate('district_id')
                .lean();

            if (!space) {
                return res.status(404).json({ success: false, message: "Space not found" });
            }

            if (space.hours_json && typeof space.hours_json === 'string') {
                space.hours_json = JSON.parse(space.hours_json);
            }

            return res.status(200).json({
                success: true,
                data: space
            });
        } catch (error) {
            console.error('Get space details error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async getPublicStats(req, res) {
        try {
            console.log('📊 Fetching public stats...');
            
            const [totalSpaces, totalUsers, activeBookings] = await Promise.all([
                Space.countDocuments({ status: 'Open Now' }),
                User.countDocuments({ 
                    role: 'user',  
                    isActive: { $ne: false }
                }),
                Booking.countDocuments({ 
                    status: 'active',
                    check_out_at: null 
                })
            ]);

            console.log(`Stats: ${totalSpaces} spaces, ${totalUsers} users, ${activeBookings} active bookings`);

            return res.status(200).json({
                success: true,
                data: {
                    totalSpaces: totalSpaces || 0,
                    totalUsers: totalUsers || 0,
                    activeBookings: activeBookings || 0
                }
            });
        } catch (error) {
            console.error('Stats error:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new LandingController();