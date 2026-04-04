const { Space, District } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');

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

            // 1. Session Check
            if (!userId) {
                throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Session missing or expired.');
            }

            const { search, district } = req.query;
            
            // Base query for active hubs
            let query = { status: { $in: ['active', 'Open Now'] } };

            // 2. Handle District Filter
            if (district && district !== 'All') {
                // Find the district ID based on the name (e.g., "Jaro")
                const districtDoc = await District.findOne({ name: district });
                
                if (districtDoc) {
                    query.district_id = districtDoc._id;
                } else {
                    // Fallback: If no district ID found, try matching the 'area' string
                    query.area = { $regex: district, $options: 'i' };
                }
            }

            // 3. Handle Text Search (Name or Area)
            if (search && search.trim() !== "") {
                const searchRegex = { $regex: search, $options: 'i' };
                
                // If we already have a district filter, we want to search WITHIN that district
                // Otherwise, we search globally across name and area
                query.$or = [
                    { name: searchRegex },
                    { area: searchRegex }
                ];
            }

            // 4. Fetch and Populate
            const spaces = await Space.find(query)
                .populate('district_id', 'name')
                .sort({ rating: -1, created_at: -1 });

            // 5. Format response for the high-end SpaceCard UI
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                count: spaces.length,
                data: spaces.map(space => ({
                    _id: space._id,
                    name: space.name,
                    area: space.area,
                    rate_hour: space.rate_hour,
                    image: space.image,
                    rating: space.rating || 5.0,
                    review_count: space.review_count || 0,
                    capacity: space.capacity,
                    available_rooms: space.available_rooms,
                    amenities: space.amenities?.length > 0 
                        ? space.amenities 
                        : ["Fiber WiFi", "Aircon", "Power Outlets"],
                    // Priority: District Name > Area String > Default
                    location: space.district_id?.name || space.area || 'Iloilo City'
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