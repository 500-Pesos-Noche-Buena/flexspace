const { Booking, Space, User, Review } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class ReviewController {
    getUserId = (req) => req.user?.sub || req.user?._id || req.user?.id;

    /**
     * Submit a review for a completed booking
     * POST /api/v1/user/reviews
     */
    async submitReview(req, res, next) {
        try {
            const userId = this.getUserId(req);
            
            if (!userId) {
                throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
            }

            const { space_id, booking_id, rating, title, comment, images } = req.body;

            // Validation
            if (!space_id || !booking_id) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Space ID and Booking ID are required');
            }

            if (!rating || rating < 1 || rating > 5) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Rating must be between 1 and 5');
            }

            if (!comment || comment.trim().length < 10) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Review must be at least 10 characters');
            }

            if (comment.length > 1000) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Review cannot exceed 1000 characters');
            }

            if (title && title.length > 100) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Title cannot exceed 100 characters');
            }

            // Check if booking exists and belongs to user
            const booking = await Booking.findOne({
                _id: booking_id,
                user_id: userId
            });

            if (!booking) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found or does not belong to you');
            }

            // Check if booking status is completed
            if (booking.status !== 'completed') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, `You can only review completed bookings. Current status: ${booking.status}`);
            }

            // Check if review already exists for this booking
            const existingReview = await Review.findOne({ booking_id });
            if (existingReview) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'You have already reviewed this booking');
            }

            // Validate images array (max 5)
            const validImages = Array.isArray(images) ? images.slice(0, 5) : [];

            // Create review
            const review = await Review.create({
                user_id: userId,
                space_id,
                booking_id,
                rating: parseInt(rating),
                title: title?.trim() || null,
                comment: comment.trim(),
                images: validImages,
                reviewer_type: 'registered',
                is_verified_booking: true,
                status: 'approved',
                ip_address: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress,
                user_agent: req.headers['user-agent']
            });

            // Update space rating using the schema's static method
            await Review.updateSpaceRating(space_id);

            // Populate user info for response
            const populatedReview = await Review.findById(review._id)
                .populate('user_id', 'name avatar')
                .lean();

            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Review submitted successfully. Thank you for your feedback!',
                data: populatedReview
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Get reviews by current user
     * GET /api/v1/user/reviews
     */
    async getMyReviews(req, res, next) {
        try {
            const userId = this.getUserId(req);
            const { page = 1, limit = 10 } = req.query;

            const query = { 
                user_id: userId,
                reviewer_type: 'registered'
            };

            const total = await Review.countDocuments(query);
            const reviews = await Review.find(query)
                .populate('space_id', 'name address images')
                .populate('booking_id', 'ticket_number date start_time end_time')
                .sort({ created_at: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .lean();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    reviews,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Check if user has reviewed a booking
     * GET /api/v1/user/reviews/check/:bookingId
     */
    async checkBookingReviewed(req, res, next) {
        try {
            const userId = this.getUserId(req);
            const { bookingId } = req.params;

            const review = await Review.findOne({ 
                booking_id: bookingId,
                user_id: userId 
            });

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    has_reviewed: !!review,
                    review: review || null
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update a review
     * PUT /api/v1/user/reviews/:id
     */
    async updateReview(req, res, next) {
        try {
            const userId = this.getUserId(req);
            const reviewId = req.params.id;
            const { rating, title, comment, images } = req.body;

            // Find review and verify ownership
            const review = await Review.findOne({
                _id: reviewId,
                user_id: userId,
                reviewer_type: 'registered'
            });

            if (!review) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Review not found');
            }

            // Check if review is editable (within 30 days)
            const daysSinceCreation = (Date.now() - new Date(review.created_at).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceCreation > 30) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Reviews can only be edited within 30 days of creation');
            }

            // Check if review is not rejected
            if (review.status === 'rejected') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot edit a rejected review. Please contact support.');
            }

            let ratingChanged = false;
            let oldRating = review.rating;

            // Update fields
            if (rating && rating >= 1 && rating <= 5) {
                review.rating = parseInt(rating);
                ratingChanged = oldRating !== review.rating;
            }
            if (title !== undefined) review.title = title?.trim() || null;
            if (comment && comment.trim().length >= 10) {
                if (comment.trim().length <= 1000) {
                    review.comment = comment.trim();
                } else {
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Comment cannot exceed 1000 characters');
                }
            }
            if (Array.isArray(images)) review.images = images.slice(0, 5);
            
            review.is_edited = true;
            review.edited_at = new Date();
            review.updated_at = new Date();

            await review.save();

            // Update space rating if rating changed
            if (ratingChanged) {
                await Review.updateSpaceRating(review.space_id);
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Review updated successfully',
                data: review
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete a review
     * DELETE /api/v1/user/reviews/:id
     */
    async deleteReview(req, res, next) {
        try {
            const userId = this.getUserId(req);
            const reviewId = req.params.id;

            // Find review and verify ownership
            const review = await Review.findOne({
                _id: reviewId,
                user_id: userId,
                reviewer_type: 'registered'
            });

            if (!review) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Review not found');
            }

            // Check if review is deletable (within 7 days)
            const daysSinceCreation = (Date.now() - new Date(review.created_at).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceCreation > 7) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Reviews can only be deleted within 7 days of creation. Please contact support.');
            }

            const spaceId = review.space_id;
            await review.deleteOne();

            // Update space rating
            await Review.updateSpaceRating(spaceId);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Review deleted successfully'
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Mark a review as helpful
     * POST /api/v1/user/reviews/:id/helpful
     */
    async markHelpful(req, res, next) {
        try {
            const userId = this.getUserId(req);
            const reviewId = req.params.id;

            const review = await Review.findById(reviewId);
            if (!review) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Review not found');
            }

            // Can't mark your own review as helpful
            if (review.user_id && review.user_id.toString() === userId) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'You cannot mark your own review as helpful');
            }

            // Check if user already marked as helpful
            if (review.helpful_users && review.helpful_users.includes(userId)) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'You have already marked this review as helpful');
            }

            // Add user to helpful list and increment count
            if (!review.helpful_users) review.helpful_users = [];
            review.helpful_users.push(userId);
            review.helpful_count = (review.helpful_count || 0) + 1;
            
            await review.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Review marked as helpful',
                data: { helpful_count: review.helpful_count }
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Remove helpful mark from a review
     * DELETE /api/v1/user/reviews/:id/helpful
     */
    async removeHelpful(req, res, next) {
        try {
            const userId = this.getUserId(req);
            const reviewId = req.params.id;

            const review = await Review.findById(reviewId);
            if (!review) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Review not found');
            }

            // Check if user has marked as helpful
            if (!review.helpful_users || !review.helpful_users.includes(userId)) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'You have not marked this review as helpful');
            }

            // Remove user from helpful list and decrement count
            review.helpful_users = review.helpful_users.filter(id => id.toString() !== userId);
            review.helpful_count = Math.max(0, (review.helpful_count || 0) - 1);
            
            await review.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Helpful mark removed',
                data: { helpful_count: review.helpful_count }
            });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ReviewController();