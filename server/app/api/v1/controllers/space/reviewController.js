// controllers/space/reviewController.js
const { Review, Space, Booking } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const mongoose = require('mongoose');

class ReviewController {
    /**
     * Get user ID from request
     */
    getUserId = (req) => req.user?.sub || req.user?._id || req.user?.id;

    /**
     * Get all reviews for spaces owned by the logged-in space owner
     * GET /api/v1/space/reviews
     */
    async getMySpaceReviews(req, res, next) {
        try {
            const userId = this.getUserId(req);
            const { spaceId, rating, sort = 'newest', page = 1, limit = 10 } = req.query;

            console.log('Getting reviews for user:', userId);

            // Get all spaces owned by this user
            const spaces = await Space.find({ user_id: userId }).select('_id name');
            const spaceIds = spaces.map(s => s._id);

            if (spaceIds.length === 0) {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    data: {
                        reviews: [],
                        spaces: [],
                        stats: {
                            total_reviews: 0,
                            average_rating: 0,
                            rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                        },
                        pagination: {
                            page: parseInt(page),
                            limit: parseInt(limit),
                            total: 0,
                            pages: 0
                        }
                    }
                });
            }

            // Build query
            let query = { 
                space_id: { $in: spaceIds },
                status: 'approved'
            };
            
            if (spaceId) {
                query.space_id = spaceId;
            }
            
            if (rating && [1, 2, 3, 4, 5].includes(parseInt(rating))) {
                query.rating = parseInt(rating);
            }
            
            // Sorting options
            let sortOption = {};
            switch(sort) {
                case 'newest':
                    sortOption = { created_at: -1 };
                    break;
                case 'oldest':
                    sortOption = { created_at: 1 };
                    break;
                case 'highest':
                    sortOption = { rating: -1, created_at: -1 };
                    break;
                case 'lowest':
                    sortOption = { rating: 1, created_at: -1 };
                    break;
                case 'most_helpful':
                    sortOption = { helpful_count: -1, created_at: -1 };
                    break;
                default:
                    sortOption = { created_at: -1 };
            }
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const reviews = await Review.find(query)
                .populate('user_id', 'name email avatar')
                .populate('space_id', 'name')
                .populate('booking_id', 'ticket_number date')
                .sort(sortOption)
                .skip(skip)
                .limit(parseInt(limit))
                .lean();
            
            const total = await Review.countDocuments(query);
            
            // Calculate stats
            const statsData = await Review.aggregate([
                { $match: { space_id: { $in: spaceIds }, status: 'approved' } },
                { $group: { 
                    _id: null, 
                    avgRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 }
                } }
            ]);
            
            const ratingBreakdown = await Review.aggregate([
                { $match: { space_id: { $in: spaceIds }, status: 'approved' } },
                { $group: { _id: '$rating', count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]);
            
            const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            ratingBreakdown.forEach(item => {
                breakdown[item._id] = item.count;
            });
            
            const formattedReviews = reviews.map(review => ({
                _id: review._id,
                rating: review.rating,
                title: review.title,
                comment: review.comment,
                images: review.images,
                reviewer_type: review.reviewer_type,
                is_verified_booking: review.is_verified_booking,
                is_edited: review.is_edited,
                helpful_count: review.helpful_count,
                created_at: review.created_at,
                space: review.space_id,
                booking: review.booking_id,
                customer: review.user_id ? {
                    name: review.user_id.name,
                    email: review.user_id.email,
                    avatar: review.user_id.avatar
                } : {
                    name: review.guest_name || 'Guest User',
                    email: null,
                    avatar: null
                },
                reply: review.reply
            }));

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    reviews: formattedReviews,
                    spaces: spaces.map(s => ({ _id: s._id, name: s.name })),
                    stats: {
                        total_reviews: statsData[0]?.totalReviews || 0,
                        average_rating: parseFloat((statsData[0]?.avgRating || 0).toFixed(1)),
                        rating_breakdown: breakdown
                    },
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / parseInt(limit))
                    }
                }
            });
        } catch (error) {
            console.error('Get my space reviews error:', error);
            next(error);
        }
    }

    /**
     * Get reviews for a specific space
     * GET /api/v1/space/spaces/:spaceId/reviews
     */
    async getSpaceReviews(req, res, next) {
        try {
            const userId = this.getUserId(req);
            const { spaceId } = req.params;
            const { rating, sort = 'newest', page = 1, limit = 10 } = req.query;

            const space = await Space.findOne({ _id: spaceId, user_id: userId });
            if (!space) {
                throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You do not have access to this space');
            }

            let query = { space_id: spaceId, status: 'approved' };
            
            if (rating && [1, 2, 3, 4, 5].includes(parseInt(rating))) {
                query.rating = parseInt(rating);
            }
            
            let sortOption = {};
            switch(sort) {
                case 'newest': sortOption = { created_at: -1 }; break;
                case 'oldest': sortOption = { created_at: 1 }; break;
                case 'highest': sortOption = { rating: -1, created_at: -1 }; break;
                case 'lowest': sortOption = { rating: 1, created_at: -1 }; break;
                default: sortOption = { created_at: -1 };
            }
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const reviews = await Review.find(query)
                .populate('user_id', 'name email avatar')
                .populate('booking_id', 'ticket_number date start_time end_time')
                .sort(sortOption)
                .skip(skip)
                .limit(parseInt(limit))
                .lean();
            
            const total = await Review.countDocuments(query);
            
            const ratingBreakdown = await Review.aggregate([
                { $match: { space_id: new mongoose.Types.ObjectId(spaceId), status: 'approved' } },
                { $group: { _id: '$rating', count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]);
            
            const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            ratingBreakdown.forEach(item => {
                breakdown[item._id] = item.count;
            });

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    reviews,
                    space: { _id: space._id, name: space.name },
                    stats: {
                        total_reviews: total,
                        average_rating: space.rating || 0,
                        rating_breakdown: breakdown
                    },
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / parseInt(limit))
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reply to a review
     * POST /api/v1/space/reviews/:reviewId/reply
     */
    async replyToReview(req, res, next) {
        try {
            const userId = this.getUserId(req);
            const { reviewId } = req.params;
            const { replyText } = req.body;

            if (!replyText || replyText.trim().length < 2) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Reply must be at least 2 characters');
            }

            const review = await Review.findById(reviewId).populate('space_id');
            if (!review) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Review not found');
            }

            const space = await Space.findOne({ _id: review.space_id._id, user_id: userId });
            if (!space) {
                throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You do not have permission');
            }

            review.reply = {
                text: replyText.trim(),
                created_at: review.reply?.created_at || new Date(),
                updated_at: new Date()
            };
            
            await review.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Reply added successfully',
                data: { reply: review.reply }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update reply
     * PUT /api/v1/space/reviews/:reviewId/reply
     */
    async updateReply(req, res, next) {
        try {
            const userId = this.getUserId(req);
            const { reviewId } = req.params;
            const { replyText } = req.body;

            if (!replyText || replyText.trim().length < 2) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Reply must be at least 2 characters');
            }

            const review = await Review.findById(reviewId).populate('space_id');
            if (!review) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Review not found');
            }

            const space = await Space.findOne({ _id: review.space_id._id, user_id: userId });
            if (!space) {
                throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You do not have permission');
            }

            if (!review.reply) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No reply to update');
            }

            review.reply.text = replyText.trim();
            review.reply.updated_at = new Date();
            await review.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Reply updated successfully',
                data: { reply: review.reply }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete reply
     * DELETE /api/v1/space/reviews/:reviewId/reply
     */
    async deleteReply(req, res, next) {
        try {
            const userId = this.getUserId(req);
            const { reviewId } = req.params;

            const review = await Review.findById(reviewId).populate('space_id');
            if (!review) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Review not found');
            }

            const space = await Space.findOne({ _id: review.space_id._id, user_id: userId });
            if (!space) {
                throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You do not have permission');
            }

            review.reply = undefined;
            await review.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Reply deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ReviewController();