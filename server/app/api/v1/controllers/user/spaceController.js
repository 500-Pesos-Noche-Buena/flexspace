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

            const {
                search,
                district,
                page = 1,
                limit = 12,
                sort = 'rating',
                minPrice,
                maxPrice
            } = req.query;

            let query = { status: { $in: ['active', 'Open Now'] } };

            // District filter
            if (district && district !== 'All') {
                const districtDoc = await District.findOne({ name: district });
                if (districtDoc) {
                    query.district_id = districtDoc._id;
                } else {
                    query.area = { $regex: district, $options: 'i' };
                }
            }

            // Search filter
            if (search && search.trim() !== "") {
                const searchRegex = { $regex: search, $options: 'i' };
                query.$or = [
                    { name: searchRegex },
                    { area: searchRegex }
                ];
            }

            // Price range filter
            if (minPrice !== undefined || maxPrice !== undefined) {
                query.rate_hour = {};
                if (minPrice) query.rate_hour.$gte = parseFloat(minPrice);
                if (maxPrice) query.rate_hour.$lte = parseFloat(maxPrice);
            }

            // Sorting
            let sortQuery = { rating: -1, created_at: -1 };
            if (sort === 'price_low') sortQuery = { rate_hour: 1 };
            if (sort === 'price_high') sortQuery = { rate_hour: -1 };
            if (sort === 'newest') sortQuery = { created_at: -1 };
            if (sort === 'rating') sortQuery = { rating: -1, created_at: -1 };

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const total = await Space.countDocuments(query);
            const spaces = await Space.find(query)
                .populate('district_id', 'name')
                .sort(sortQuery)
                .skip(skip)
                .limit(parseInt(limit));

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                total,
                page: parseInt(page),
                limit: parseInt(limit),
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
                    amenities: space.amenities?.length > 0 ? space.amenities : ["WiFi", "Aircon", "Power Outlets"],
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

    getDistricts = async (req, res, next) => {
        try {
            const districts = await District.find({ active: true }).select('name slug');
            return res.status(HTTP_STATUS.OK).json({ success: true, data: districts });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new SpaceController();