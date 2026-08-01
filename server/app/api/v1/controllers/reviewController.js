// controllers/reviewController.js
const { Review, Space } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class PublicReviewController {
    /**
     * Submit a review for a space (No authentication required)
     * POST /api/v1/public/reviews
     */
    async submitReview(req, res, next) {
        try {
            const { space_id, rating, title, comment, guest_name, guest_email } = req.body;

            // Validation
            if (!space_id) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Space ID is required');
            }

            if (!rating || rating < 1 || rating > 5) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Rating must be between 1 and 5');
            }

            if (!guest_name || guest_name.trim().length < 2) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Name is required');
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

            // Check if space exists
            const space = await Space.findById(space_id);
            if (!space) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Space not found');
            }

            // Create review (no booking_id, no user_id)
            const review = await Review.create({
                space_id,
                guest_name: guest_name.trim(),
                guest_email: guest_email?.trim() || null,
                rating: parseInt(rating),
                title: title?.trim() || null,
                comment: comment.trim(),
                reviewer_type: 'guest',
                is_verified_booking: false, // No booking verification
                status: 'pending', // Guest reviews go to pending for moderation
                ip_address: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress,
                user_agent: req.headers['user-agent']
            });

            // Update space rating
            await Review.updateSpaceRating(space_id);

            // Populate response
            const populatedReview = await Review.findById(review._id)
                .populate('space_id', 'name')
                .lean();

            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Review submitted successfully. It will be visible after moderation.',
                data: populatedReview
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Get space details for review page
     * GET /api/v1/public/spaces/:spaceId
     */
    async getSpaceForReview(req, res, next) {
        try {
            const { spaceId } = req.params;

            const space = await Space.findById(spaceId)
                .select('name address images rating review_count capacity')
                .lean();

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
    }
}

module.exports = new PublicReviewController();