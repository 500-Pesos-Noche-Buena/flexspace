const { Space, District, User, Booking, Review } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/api/v1/utils/constants'); // Add this line

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

    getSpaceAvailability = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { date, start_time, end_time, is_open_time } = req.query;

        const space = await Space.findById(id);
        if (!space) {
            return res.status(404).json({
                success: false,
                message: 'Space not found'
            });
        }

        // Parse the selected date
        const selectedDate = new Date(date);
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const day = selectedDate.getDate();

        let startDateTime, endDateTime;

        if (is_open_time === 'true') {
            // Whole day from 00:00 to 23:59
            startDateTime = new Date(year, month, day, 0, 0, 0);
            endDateTime = new Date(year, month, day, 23, 59, 59);
        } else {
            // Specific time range
            const [startHour, startMinute] = (start_time || '00:00').split(':');
            const [endHour, endMinute] = (end_time || '23:59').split(':');
            
            startDateTime = new Date(year, month, day, parseInt(startHour), parseInt(startMinute), 0);
            endDateTime = new Date(year, month, day, parseInt(endHour), parseInt(endMinute), 0);
        }

        console.log('=== SPACE AVAILABILITY CHECK ===');
        console.log('Space ID:', id);
        console.log('Selected Date:', date);
        console.log('Start DateTime:', startDateTime);
        console.log('End DateTime:', endDateTime);
        console.log('Is Open Time:', is_open_time);

        // Count active bookings for the space (open area only, not rooms)
        // Include ALL statuses that occupy seats: pending, confirmed, active, pending_payment
        const activeBookings = await Booking.find({
            space_id: id,
            bookable_type: 'space', // Only count space/open area bookings
            status: { $in: ['pending', 'confirmed', 'active', 'pending_payment'] },
            $or: [
                {
                    $and: [
                        { start_time: { $lte: endDateTime } },
                        { end_time: { $gte: startDateTime } }
                    ]
                }
            ]
        }).lean();

        const bookingCount = activeBookings.length;
        const availableSeats = Math.max(0, (space.capacity || 0) - bookingCount);
        
        console.log(`Total capacity: ${space.capacity}`);
        console.log(`Active bookings found: ${bookingCount}`);
        console.log('Bookings details:');
        activeBookings.forEach(b => {
            console.log(`  - ${b.ticket_number}: ${b.status} from ${b.start_time} to ${b.end_time}`);
        });
        console.log(`Available seats: ${availableSeats}`);
        console.log('================================');

        return res.status(200).json({
            success: true,
            data: {
                occupied_seats: bookingCount,
                available_seats: availableSeats,
                total_capacity: space.capacity || 0,
                is_available: availableSeats > 0,
                bookings: activeBookings.map(b => ({
                    ticket: b.ticket_number,
                    status: b.status,
                    start: b.start_time,
                    end: b.end_time
                }))
            }
        });
    } catch (error) {
        console.error('Get space availability error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
}

module.exports = new LandingController();