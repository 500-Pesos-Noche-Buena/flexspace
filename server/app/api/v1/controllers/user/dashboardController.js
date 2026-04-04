const { User, Booking, Space } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');

class DashboardController {
    getUserId = (req) => {
        return req.user?.sub || req.user?._id || req.user?.id;
    };

    getUserDashboard = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);

            if (!userId) {
                throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Session missing or expired.');
            }

            // 1. Fetch data in parallel
            // Note: Added .populate('district_id') to get the actual name from the District collection
            const [bookingCount, userDetails, trendingSpaces] = await Promise.all([
                Booking.countDocuments({ user_id: userId }),
                User.findById(userId).select('loyalty_points total_hours_spent'),
                Space.find({ status: { $in: ['active', 'Open Now'] } })
                    .populate('district_id', 'name') 
                    .sort({ rating: -1, created_at: -1 }) // Sort by highest rating first
                    .limit(6) // Get a few more for the horizontal scroll if needed
            ]);

            // 2. Map the data precisely for your SpaceCard component
            const formattedTrending = trendingSpaces.map(space => ({
                _id: space._id,
                name: space.name,
                area: space.area,
                rate_hour: space.rate_hour,
                image: space.image,
                rating: space.rating || 5.0, // Fallback if DB value is missing
                review_count: space.review_count || 0,
                capacity: space.capacity,
                available_rooms: space.available_rooms,
                // If amenities array is empty in DB, send a clean default for the high-end UI look
                amenities: space.amenities && space.amenities.length > 0 
                    ? space.amenities 
                    : ["Fiber WiFi", "Aircon", "Power Outlets"],
                location: space.district_id?.name || space.area || 'Iloilo City'
            }));

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    stats: {
                        total_bookings: String(bookingCount || 0).padStart(2, '0'),
                        total_hours: String(userDetails?.total_hours_spent || 0).padStart(2, '0'),
                        loyalty_points: String(userDetails?.loyalty_points || 0).padStart(3, '0')
                    },
                    trending: formattedTrending
                }
            });

        } catch (error) {
            console.error("❌ User Dashboard Sync Error:", error);
            next(error);
        }
    };
}

module.exports = new DashboardController();