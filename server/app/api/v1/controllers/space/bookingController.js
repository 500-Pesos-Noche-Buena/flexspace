const { Booking, Space, Payment, User, Review, Earnings } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const rewardService = require('@/api/v1/services/rewardService');
const emailService = require('@/api/v1/services/emailService');
const bookingBillingService = require('@/api/v1/services/bookingBillingService');
class BookingController {

    // Helper to get the actual "Boss" ID
    getOwnerId = async (req) => {
        const userId = req.user?.sub || req.user?._id || req.user?.id;

        // If the logged-in user is staff, find their parent (the space owner)
        if (req.user?.role === 'staff') {
            const staffRecord = await User.findById(userId).select('parent_id');
            return staffRecord?.parent_id || userId;
        }

        return userId;
    };

    // Add this helper method to get the spaces a user can access
    getAccessibleSpaceIds = async (req) => {
        const userId = req.user?.sub || req.user?._id || req.user?.id;
        const user = req.user;

        // If user is staff, get their assigned space
        if (user?.role === 'staff') {
            // Check if staff has a direct space assignment
            const staffUser = await User.findById(userId).select('space_id parent_id');

            if (staffUser?.space_id) {
                // Staff is directly assigned to a space
                return [staffUser.space_id];
            }

            if (staffUser?.parent_id) {
                // Staff belongs to a space owner, get all their spaces
                const userSpaces = await Space.find({ user_id: staffUser.parent_id }).select('_id');
                return userSpaces.map(s => s._id);
            }

            // Fallback: no assigned space
            return [];
        }

        // If user is owner/admin, get all their spaces
        const userSpaces = await Space.find({ user_id: userId }).select('_id');
        return userSpaces.map(s => s._id);
    };

    index = async (req, res, next) => {
        try {
            const { search = '', status = '', type = 'all', page = 1, limit = 10 } = req.query;

            // Get accessible space IDs based on user role
            const spaceIds = await this.getAccessibleSpaceIds(req);

            // If user has no accessible spaces, return empty
            if (spaceIds.length === 0) {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    data: {
                        bookings: [], total: 0, stats: {
                            total: 0, pending: 0, active: 0, online: 0, walkin: 0, revenue: 0
                        }
                    }
                });
            }

            let query = { space_id: { $in: spaceIds } };

            // 🆕 Handle multiple status values (comma-separated)
            if (status) {
                const statusArray = status.split(',').map(s => s.trim());
                if (statusArray.length === 1) {
                    query.status = statusArray[0];
                } else {
                    query.status = { $in: statusArray };
                }
            }

            if (type !== 'all') query.booking_type = type;
            if (search) {
                query.$or = [
                    { ticket_number: { $regex: search, $options: 'i' } },
                    { guest_name: { $regex: search, $options: 'i' } }
                ];
            }

            // Log for debugging
            console.log(`🔍 Fetching bookings for spaces: ${spaceIds.length} spaces, Query:`, JSON.stringify(query));

            const bookings = await Booking.find(query)
                .populate({
                    path: 'space_id',
                    select: 'name rate_hour qr_payment_image user_id',
                    populate: {
                        path: 'user_id',
                        select: 'name email business_payment_qr payment_methods'
                    }
                })
                .populate('user_id', 'name email')
                .sort({ created_at: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Booking.countDocuments(query);

            // Stats logic
            const stats = {
                total,
                pending: await Booking.countDocuments({ space_id: { $in: spaceIds }, status: 'pending' }),
                active: await Booking.countDocuments({ space_id: { $in: spaceIds }, status: 'active' }),
                online: await Booking.countDocuments({ space_id: { $in: spaceIds }, booking_type: 'online' }),
                walkin: await Booking.countDocuments({ space_id: { $in: spaceIds }, booking_type: 'walkin' }),
                revenue: (await Booking.aggregate([
                    {
                        $match: {
                            space_id: { $in: spaceIds },
                            status: 'completed',
                            updated_at: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                        }
                    },
                    { $group: { _id: null, total: { $sum: "$total_amount" } } }
                ]))[0]?.total || 0
            };

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: { bookings, total, stats }
            });
        } catch (error) {
            console.error('❌ Error in index:', error);
            next(error);
        }
    };

    updateStatus = async (req, res, next) => {
        try {
            const { id, action } = req.params;
            const ownerId = await this.getOwnerId(req);

            console.log(`🔍 updateStatus called - Booking ID: ${id}, Action: ${action}`);

            const booking = await Booking.findOne({ _id: id, ...await require('@/api/v1/services/bookingOrderService').scope(req) }).populate('space_id').populate('user_id');

            if (!booking || String(booking.space_id.user_id) !== String(ownerId)) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized access.');
            }

            console.log(`📝 Booking found - Type: ${booking.booking_type}, Current Status: ${booking.status}, Action: ${action}`);

            const statusMap = {
                confirm: 'confirmed',
                reject: 'rejected',
                cancel: 'cancelled',
                complete: 'completed'  // ← Add this
            };
            if (!statusMap[action]) throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Unknown action: ${action}`);

            if (['active', 'pending_payment', 'completed'].includes(booking.status) || action === 'complete') {
                throw new ApiError(400, 'Use booking checkout to close and settle this session.');
            }
            booking.status = statusMap[action];
            if (action === 'confirm') booking.notes = '';
            await booking.save();

            console.log(`✅ Booking status updated to: ${booking.status}`);

            // 🔥 CREATE EARNINGS FOR ONLINE BOOKINGS IMMEDIATELY WHEN CONFIRMED
            if (action === 'confirm') {
                console.log(`🎯 Attempting to create earnings for booking ${booking.ticket_number} (Type: ${booking.booking_type})`);

                try {
                    const Settings = require('@/api/v1/models/schema/Settings');

                    // Check if earnings already exist
                    const existingEarnings = await Earnings.findOne({ booking_id: booking._id });
                    console.log(`Existing earnings check: ${existingEarnings ? 'YES - skipping' : 'NO - will create'}`);

                    if (!existingEarnings) {
                        // Get platform fee percentage from settings
                        const feeSetting = await Settings.findOne({ key: 'platform_fee_percent' });
                        const platformFeePercent = feeSetting?.value ?? 3;

                        const platformFee = (booking.total_amount * platformFeePercent) / 100;
                        const ownerEarnings = booking.total_amount - platformFee;
                        const month = new Date(booking.start_time || booking.created_at).toISOString().slice(0, 7);
                        const orderNumber = `ONL-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

                        const earningsData = {
                            owner_id: booking.space_id.user_id,
                            space_id: booking.space_id._id,
                            order_number: orderNumber,
                            booking_id: booking._id,
                            total_amount: booking.total_amount,
                            platform_fee_percent: platformFeePercent,
                            platform_fee: parseFloat(platformFee.toFixed(4)),
                            owner_earnings: parseFloat(ownerEarnings.toFixed(4)),
                            payment_method: 'online',
                            payment_intent_id: booking.payment_intent_id || null,
                            auto_collected: false, // ← CHANGE to false
                            fee_status: 'pending', // ← CHANGE to pending (not collected)
                            collected_at: null, // ← CHANGE to null
                            booking_date: booking.start_time || booking.created_at,
                            month: month,
                            notes: `Platform fee pending collection from space owner`
                        };

                        console.log('📊 Earnings data to create:', earningsData);

                        const newEarnings = await Earnings.create(earningsData);
                        console.log(`✅✅✅ Earnings created for ONLINE booking ${booking.ticket_number}: ID ${newEarnings._id}, Platform fee: ₱${platformFee}`);
                    }
                } catch (earningsError) {
                    console.error('❌ Failed to create earnings for online booking:', earningsError);
                    console.error('Error details:', earningsError.message);
                    // Don't fail the request - just log error
                }
            }

            // Send email when booking is confirmed
            if (action === 'confirm' && booking.user_id && booking.user_id.email) {
                try {
                    const user = booking.user_id;
                    const space = booking.space_id;

                    const bookingDate = booking.start_time ? new Date(booking.start_time).toLocaleDateString('en-PH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }) : new Date().toLocaleDateString('en-PH');

                    const startTime = booking.start_time ? new Date(booking.start_time).toLocaleTimeString('en-PH', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : 'N/A';

                    const endTime = booking.end_time ? new Date(booking.end_time).toLocaleTimeString('en-PH', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : 'N/A';

                    const bookingDetails = {
                        ticket_number: booking.ticket_number,
                        space_name: space.name,
                        date: bookingDate,
                        time: `${startTime} - ${endTime}`,
                        total_amount: booking.total_amount || 0
                    };

                    await emailService.sendBookingConfirmation(user.email, user.name, bookingDetails);
                    console.log(`✅ Booking confirmation email sent to ${user.email}`);
                } catch (emailError) {
                    console.error('❌ Failed to send confirmation email:', emailError.message);
                }
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `Status updated to ${booking.status}`
            });
        } catch (error) {
            console.error('Update status error:', error);
            next(error);
        }
    };
    calculateBill = async (req, res, next) => {
        try {
            const data = await require('@/api/v1/services/bookingOrderService').freeze(req);
            return res.status(HTTP_STATUS.OK).json({ success: true, data });
        } catch (error) { next(error); }
    };

    checkout = async (req, res, next) => {
        try {
            const booking = await require('@/api/v1/services/bookingOrderService').settle(req);
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
            return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Payment completed!', data: {
                booking,
                review_qr_url: booking.qr_code_token ? `${backendUrl}/api/v1/space/qr/${booking.qr_code_token}` : null
            } });
        } catch (error) { next(error); }
    };


    // FIXED: applyVoucher - uses the already calculated total_amount from the booking
    applyVoucher = async (req, res, next) => {
        try {
            const data = await require('@/api/v1/services/bookingOrderService').applyVoucher(req);
            return res.json({ success: true, data });
        } catch (error) { next(error); }
    };

    // Add this method to check if user has reviewed a booking
    getUserBookingWithReviewStatus = async (req, res, next) => {
        try {
            const userId = req.user?.sub || req.user?._id || req.user?.id;
            const { status = '' } = req.query;

            let query = { user_id: userId };
            if (status) query.status = status;

            const bookings = await Booking.find(query)
                .populate('space_id', 'name image rate_hour')
                .sort({ created_at: -1 });

            // Check which bookings have reviews
            const Review = require('@/api/v1/models/Review');
            const reviewedBookings = await Review.find({
                user_id: userId,
                booking_id: { $in: bookings.map(b => b._id) }
            }).select('booking_id');

            const reviewedBookingIds = new Set(reviewedBookings.map(r => r.booking_id.toString()));

            // Add has_reviewed flag to each booking
            const bookingsWithReviewFlag = bookings.map(booking => ({
                ...booking.toObject(),
                has_reviewed: reviewedBookingIds.has(booking._id.toString())
            }));

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    bookings: bookingsWithReviewFlag,
                    points: await rewardService.getUserPoints(userId)
                }
            });
        } catch (error) {
            next(error);
        }
    };


    // ============================================
    // PUBLIC QR CODE REDIRECT (No Auth)
    // GET /api/v1/space/qr/:token
    // ============================================
    handleQRRedirect = async (req, res, next) => {
        try {
            const { token } = req.params;
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';  // ← FIXED: use 5173 not 3000

            console.log('QR Redirect - Token:', token);  // DEBUG

            // Find booking by QR token
            const booking = await Booking.findOne({ qr_code_token: token })
                .populate('space_id', 'name address')
                .populate('user_id', 'name email');

            if (!booking) {
                console.log('No booking found for token:', token);
                return res.redirect(`${frontendUrl}/review/invalid?error=invalid_token`);
            }

            console.log('Booking found:', booking._id, 'Status:', booking.status);

            // Check if booking is completed (eligible for review)
            if (booking.status !== 'completed') {
                console.log('Booking not completed. Status:', booking.status);
                return res.redirect(`${frontendUrl}/review/not-completed?booking_id=${booking._id}&status=${booking.status}`);
            }

            // Check if review already exists
            const existingReview = await Review.findOne({ booking_id: booking._id });
            if (existingReview) {
                console.log('Review already exists for booking:', booking._id);
                return res.redirect(`${frontendUrl}/review/already-reviewed?booking_id=${booking._id}`);
            }

            // Redirect to review page
            console.log('Redirecting to review page:', `${frontendUrl}/review/booking/${booking._id}`);
            return res.redirect(`${frontendUrl}/review/booking/${booking._id}`);

        } catch (error) {
            console.error('QR Redirect Error:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/review/invalid?error=server_error&message=${encodeURIComponent(error.message)}`);
        }
    };

    // ============================================
    // GET BOOKING FOR REVIEW (Public)
    // GET /api/v1/space/booking/:id/review
    // ============================================
    getBookingForReview = async (req, res, next) => {
        try {
            const { id } = req.params;

            const booking = await Booking.findById(id)
                .populate('space_id', 'name address images rating review_count')
                .populate('user_id', 'name email');

            if (!booking) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            // Only allow review for completed bookings
            if (booking.status !== 'completed') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: `Cannot review booking with status: ${booking.status}. Only completed bookings can be reviewed.`
                });
            }

            // Check if review already exists
            const existingReview = await Review.findOne({ booking_id: booking._id });
            if (existingReview) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Review already submitted for this booking',
                    existingReview: existingReview
                });
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    booking: {
                        id: booking._id,
                        ticket_number: booking.ticket_number,
                        guest_name: booking.guest_name || booking.user_id?.name || 'Guest',
                        date: booking.created_at,
                        check_in_at: booking.check_in_at,
                        check_out_at: booking.check_out_at,
                        total_amount: booking.total_amount
                    },
                    space: {
                        id: booking.space_id._id,
                        name: booking.space_id.name,
                        address: booking.space_id.address,
                        images: booking.space_id.images,
                        rating: booking.space_id.rating,
                        review_count: booking.space_id.review_count
                    }
                }
            });

        } catch (error) {
            console.error('Get booking for review error:', error);
            next(error);
        }
    };

    // ============================================
    // SUBMIT REVIEW FROM QR (Public)
    // POST /api/v1/space/booking/:id/review
    // ============================================
    submitReviewFromQR = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { rating, title, comment, guest_name } = req.body;

            // Validation
            if (!rating || rating < 1 || rating > 5) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Rating must be between 1 and 5'
                });
            }

            if (!comment || comment.trim().length < 10) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Review must be at least 10 characters'
                });
            }

            if (comment.length > 1000) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Review cannot exceed 1000 characters'
                });
            }

            if (title && title.length > 100) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Title cannot exceed 100 characters'
                });
            }

            // Find booking
            const booking = await Booking.findById(id).populate('space_id');

            if (!booking) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Booking not found'
                });
            }

            // Only allow review for completed bookings
            if (booking.status !== 'completed') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: `Cannot review booking with status: ${booking.status}. Only completed bookings can be reviewed.`
                });
            }

            // Check if review already exists
            const existingReview = await Review.findOne({ booking_id: booking._id });
            if (existingReview) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Review already submitted for this booking'
                });
            }

            // Determine guest name (use provided or from booking)
            const finalGuestName = guest_name || booking.guest_name || booking.user_id?.name || 'Anonymous';

            // Create review
            const review = await Review.create({
                space_id: booking.space_id._id,
                booking_id: booking._id,
                user_id: booking.user_id || null, // If user is registered, link them
                guest_name: !booking.user_id ? finalGuestName : null, // Only set guest_name if no user_id
                rating: parseInt(rating),
                title: title?.trim() || null,
                comment: comment.trim(),
                reviewer_type: booking.user_id ? 'registered' : 'guest',
                is_verified_booking: true,
                status: 'approved', // Guest reviews auto-approved or set to 'pending' for admin review
                ip_address: req.ip || req.connection?.remoteAddress,
                user_agent: req.headers['user-agent']
            });

            // Update space rating
            await Review.updateSpaceRating(booking.space_id._id);

            // Populate response
            const populatedReview = await Review.findById(review._id)
                .populate('space_id', 'name')
                .lean();

            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Thank you for your review!',
                data: populatedReview
            });

        } catch (error) {
            console.error('Submit review from QR error:', error);
            next(error);
        }
    };

    // ============================================
    // CHECK IF BOOKING CAN BE REVIEWED (Public)
    // GET /api/v1/space/booking/:id/can-review
    // ============================================
    canReviewBooking = async (req, res, next) => {
        try {
            const { id } = req.params;

            const booking = await Booking.findById(id);

            if (!booking) {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    data: { can_review: false, reason: 'Booking not found' }
                });
            }

            if (booking.status !== 'completed') {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    data: { can_review: false, reason: `Booking status is ${booking.status}` }
                });
            }

            const existingReview = await Review.findOne({ booking_id: booking._id });
            if (existingReview) {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    data: { can_review: false, reason: 'Review already submitted' }
                });
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: { can_review: true }
            });

        } catch (error) {
            console.error('Can review check error:', error);
            next(error);
        }
    };

    // Add this method after your index method
    getBookingDetails = async (req, res, next) => {
        try {
            const { id } = req.params;
            const ownerId = await this.getOwnerId(req);

            const booking = await Booking.findById(id)
                .populate({
                    path: 'space_id',
                    select: 'name rate_hour qr_payment_image user_id address images',
                    populate: {
                        path: 'user_id',
                        select: 'name email business_payment_qr payment_methods'
                    }
                })
                .populate('room_id', 'name type capacity rate_hour images amenities is_airconditioned has_window')
                .populate('user_id', 'name email phone')
                .lean();

            if (!booking || String(booking.space_id.user_id._id) !== String(ownerId)) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized access.');
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: booking
            });
        } catch (error) {
            console.error('Get booking details error:', error);
            next(error);
        }
    };

    // Add this method to track when bookings become completed
    trackBookingCompletion = async (bookingId) => {
        try {
            const booking = await Booking.findById(bookingId).populate('space_id').populate('user_id');

            if (!booking || booking.status !== 'completed') {
                return;
            }

            // Check if earnings already exist
            const existingEarnings = await Earnings.findOne({ booking_id: booking._id });
            if (existingEarnings) {
                console.log(`Earnings already exist for booking ${booking._id}`);
                return;
            }

            const Settings = require('@/api/v1/models/schema/Settings');
            const feeSetting = await Settings.findOne({ key: 'platform_fee_percent' });
            const platformFeePercent = feeSetting?.value ?? 3;

            const platformFee = (booking.total_amount * platformFeePercent) / 100;
            const ownerEarnings = booking.total_amount - platformFee;
            const month = new Date(booking.start_time || booking.created_at).toISOString().slice(0, 7);
            const prefix = booking.booking_type === 'online' ? 'ONL' : 'WLK';
            const orderNumber = `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

            const earningsData = {
                owner_id: booking.space_id.user_id,
                space_id: booking.space_id._id,
                order_number: orderNumber,
                booking_id: booking._id,
                total_amount: booking.total_amount,
                platform_fee_percent: platformFeePercent,
                platform_fee: parseFloat(platformFee.toFixed(4)),
                owner_earnings: parseFloat(ownerEarnings.toFixed(4)),
                payment_method: booking.booking_type === 'online' ? 'online' : (booking.payment_method || 'walkin'),
                payment_intent_id: booking.payment_intent_id || null,
                fee_status: 'pending', // ← CHANGE to pending (not collected)
                collected_at: null, // ← CHANGE to null
                booking_date: booking.start_time || booking.created_at,
                month: month,
                notes: `Platform fee pending collection from space owner`
            };

            await Earnings.create(earningsData);
            console.log(`✅✅✅ Earnings created for ${booking.booking_type} booking ${booking.ticket_number}: ₱${platformFee} platform fee`);

        } catch (error) {
            console.error('Failed to track booking completion:', error);
        }
    };
}

module.exports = new BookingController();