const { User, Booking, Space } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const rewardService = require('@/api/v1/services/rewardService');

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

            // Fetch data in parallel
            const [bookingCount, userDetails, trendingSpaces] = await Promise.all([
                Booking.countDocuments({ user_id: userId }),
                User.findById(userId).select('points total_hours_spent'),
                Space.find({ status: { $in: ['active', 'Open Now'] } })
                    .populate('district_id', 'name') 
                    .sort({ rating: -1, created_at: -1 })
                    .limit(6)
            ]);

            // Map the data for SpaceCard component
            const formattedTrending = trendingSpaces.map(space => ({
                _id: space._id,
                name: space.name,
                area: space.area,
                rate_hour: space.rate_hour,
                image: space.image,
                user_id: space.user_id,
                rating: space.rating || 5.0,
                review_count: space.review_count || 0,
                capacity: space.capacity,
                available_rooms: space.available_rooms,
                amenities: space.amenities && space.amenities.length > 0 
                    ? space.amenities 
                    : ["Fiber WiFi", "Aircon", "Power Outlets"],
                location: space.district_id?.name || space.area || 'Iloilo City'
            }));

            const userPoints = userDetails?.points || 0;
            
            // Get redemption ratio from rewardService (you'll need to expose it)
            const redemptionRatio = rewardService.REDEMPTION_RATIO || 20;
            const minPointsToRedeem = rewardService.MIN_POINTS_TO_REDEEM || 100;

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    stats: {
                        total_bookings: String(bookingCount || 0).padStart(2, '0'),
                        total_hours: String(userDetails?.total_hours_spent || 0).padStart(2, '0'),
                        loyalty_points: String(userPoints).padStart(3, '0'),
                        points_value: Math.floor(userPoints / redemptionRatio), // Dynamic calculation
                        redemption_ratio: redemptionRatio,
                        min_points: minPointsToRedeem
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