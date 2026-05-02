const { Space, District } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class SpaceController {
    // Standardized user ID extraction
    getUserId = (req) => {
        return req.user?.sub || req.user?._id || req.user?.id;
    };

    /**
     * Get All Spaces with Search and District Filtering
     */
    getAllSpaces = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);

            if (!userId) {
                throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Session missing or expired.');
            }

            const { search, district } = req.query;

            let query = { status: { $in: ['active', 'Open Now'] } };

            if (district && district !== 'All') {
                const districtDoc = await District.findOne({ name: district });

                if (districtDoc) {
                    query.district_id = districtDoc._id;
                } else {
                    query.area = { $regex: district, $options: 'i' };
                }
            }

            if (search && search.trim() !== "") {
                const searchRegex = { $regex: search, $options: 'i' };
                query.$or = [
                    { name: searchRegex },
                    { area: searchRegex }
                ];
            }

            const spaces = await Space.find(query)
                .populate('district_id', 'name')
                .sort({ rating: -1, created_at: -1 });

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                count: spaces.length,
                data: spaces.map(space => ({
                    _id: space._id,
                    name: space.name,
                    area: space.area,
                    lat: space.lat,
                    lng: space.lng,
                    rate_hour: space.rate_hour,
                    image: space.image,
                    images: space.images || [],
                    user_id: space.user_id,
                    hours_json: space.hours_json,
                    rating: space.rating || 5.0,
                    review_count: space.review_count || 0,
                    capacity: space.capacity,
                    available_rooms: space.available_rooms,
                    amenities: space.amenities?.length > 0
                        ? space.amenities
                        : ["Fiber WiFi", "Aircon", "Power Outlets"],
                    location: space.district_id?.name || space.area || 'Iloilo City',
                    status: space.status
                }))
            });

        } catch (error) {
            console.error("❌ Space Fetch Error:", error);
            next(error);
        }
    };
    /**
     * Get Single Space Details (For the "Book Now" flow later)
     */
    getSpaceById = async (req, res, next) => {
        try {
            const space = await Space.findById(req.params.id)
                .populate('district_id', 'name');

            if (!space) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Space not found');
            }

            // Parse hours_json if it's a string
            if (space.hours_json && typeof space.hours_json === 'string') {
                space.hours_json = JSON.parse(space.hours_json);
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: space
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new SpaceController();