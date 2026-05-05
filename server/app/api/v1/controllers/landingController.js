const { Space, District, User, Booking, Review } = require('@/api/v1/models');

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

    async getCustomerReviews(req, res) {
        try {
            const { spaceId, limit = 6 } = req.query;

            let query = { status: 'approved' };

            // If spaceId is provided, filter by specific space
            if (spaceId) {
                query.space_id = spaceId;
            }

            const reviews = await Review.find(query)
                .populate('space_id', 'name')
                .populate('user_id', 'name avatar')
                .sort({ created_at: -1 })
                .limit(parseInt(limit))
                .lean();

            // Get total count for statistics
            const totalReviews = await Review.countDocuments({ status: 'approved' });

            // Get average rating
            const avgResult = await Review.aggregate([
                { $match: { status: 'approved' } },
                { $group: { _id: null, avg: { $avg: '$rating' } } }
            ]);

            const averageRating = avgResult.length > 0 ? avgResult[0].avg : 0;

            // Format reviews for response
            const formattedReviews = reviews.map(review => ({
                _id: review._id,
                rating: review.rating,
                comment: review.comment,
                reviewer_name: review.user_id?.name || review.guest_name || 'Anonymous',
                reviewer_avatar: review.user_id?.avatar || null,
                space_name: review.space_id?.name,
                is_verified: review.is_verified_booking,
                helpful_count: review.helpful_count,
                created_at: review.created_at,
                reply: review.reply ? {
                    text: review.reply.text,
                    created_at: review.reply.created_at
                } : null
            }));

            return res.status(200).json({
                success: true,
                data: {
                    reviews: formattedReviews,
                    stats: {
                        total_reviews: totalReviews,
                        average_rating: parseFloat(averageRating.toFixed(1))
                    }
                }
            });
        } catch (error) {
            console.error('Get customer reviews error:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async publicLikeReview(req, res) {
        try {
            const { reviewId } = req.params;

            // Get client IP
            let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
                clientIp = '127.0.0.1';
            }
            if (clientIp && clientIp.includes(',')) {
                clientIp = clientIp.split(',')[0].trim();
            }

            const review = await Review.findById(reviewId);
            if (!review) {
                return res.status(404).json({ success: false, message: 'Review not found' });
            }

            // Check if IP already liked
            if (review.liked_ips && review.liked_ips.includes(clientIp)) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already liked this review'
                });
            }

            // Add IP and increment count
            if (!review.liked_ips) review.liked_ips = [];
            review.liked_ips.push(clientIp);
            review.helpful_count = (review.helpful_count || 0) + 1;
            await review.save();

            return res.status(200).json({
                success: true,
                message: 'Thanks for your feedback!',
                data: { helpful_count: review.helpful_count }
            });
        } catch (error) {
            console.error('Public like error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new LandingController();