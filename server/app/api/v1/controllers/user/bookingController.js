const { Booking, Space, User, Review } = require('@/api/v1/models'); // Fixed: Review instead of Reviews
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const crypto = require('crypto');
const rewardService = require('@/api/v1/services/rewardService');

class BookingController {
    getUserId = (req) => req.user?.sub || req.user?._id || req.user?.id;

   // In your BookingController.js - update getMyBookings method
getMyBookings = async (req, res, next) => {
    try {
        const userId = this.getUserId(req);
        const { page = 1, limit = 10, status = '' } = req.query;

        let query = { user_id: userId };
        if (status) query.status = status;

        // Get total points for the user to display in dashboard
        const userPoints = await rewardService.getUserPoints(userId);

        const total = await Booking.countDocuments(query);
        let bookings = await Booking.find(query)
            .populate('space_id', 'name image area rate_hour user_id')
            .sort({ created_at: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        // Check which completed bookings have been reviewed
        if (bookings.length > 0) {
            const bookingIds = bookings.map(b => b._id);
            
            // Get all reviews for these bookings
            const reviews = await Review.find({ 
                booking_id: { $in: bookingIds },
                user_id: userId 
            }).lean();

            // Create a Set of booking_ids that have reviews
            const reviewedBookingIds = new Set(
                reviews.map(r => r.booking_id.toString())
            );

            // Add has_reviewed and is_edited flags to each booking
            bookings = bookings.map(booking => {
                const review = reviews.find(r => r.booking_id.toString() === booking._id.toString());
                return {
                    ...booking,
                    has_reviewed: reviewedBookingIds.has(booking._id.toString()),
                    is_edited: review ? review.is_edited : false
                };
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            data: {
                bookings,
                total,
                points: userPoints
            }
        });
    } catch (error) {
        console.error('Error in getMyBookings:', error);
        next(error);
    }
};

    createBooking = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { space_id, date, start_time, end_time, is_open_time, notes } = req.body;

            const bookingData = {
                user_id: userId,
                space_id,
                notes,
                is_open_time: !!is_open_time,
                status: 'pending',
                booking_type: 'online',
                qr_code_token: crypto.randomBytes(20).toString('hex'),
                ticket_number: `FLX-${Math.floor(1000 + Math.random() * 9000)}`
            };

            const dateStr = date.split('T')[0];

            if (is_open_time) {
                bookingData.start_time = new Date(`${dateStr}T00:00:00+08:00`);
                bookingData.end_time = new Date(`${dateStr}T23:59:59+08:00`);
            } else {
                bookingData.start_time = new Date(`${dateStr}T${start_time}:00+08:00`);
                bookingData.end_time = new Date(`${dateStr}T${end_time}:00+08:00`);
            }

            const newBooking = await Booking.create(bookingData);
            return res.status(HTTP_STATUS.CREATED).json({ success: true, data: newBooking });
        } catch (error) {
            console.error('Create booking error:', error);
            next(error);
        }
    };

    scanHubQRCode = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { token } = req.body;

            const booking = await Booking.findOne({
                qr_code_token: token,
                user_id: userId,
                status: { $in: ['confirmed', 'active'] }
            }).populate('space_id');

            if (!booking) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'No valid confirmed or active booking found.');
            }

            const now = new Date();

            if (booking.status === 'confirmed' && !booking.is_open_time) {
                const limit = new Date(booking.start_time.getTime() + (60 * 60 * 1000));
                if (now > limit) {
                    booking.status = 'cancelled';
                    booking.notes = 'Expired: Scanned too late.';
                    await booking.save();
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Booking expired due to lateness.');
                }
            }

            if (booking.status === 'confirmed') {
                booking.check_in_at = now;
                booking.status = 'active';
                await booking.save();
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    message: "Check-in successful! Welcome to FlexSpace.",
                    data: booking
                });
            }

            if (booking.status === 'active') {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    message: "Session is already active. Head to the counter when you're ready to checkout!",
                    data: booking
                });
            }

        } catch (error) {
            next(error);
        }
    };

    previewVoucher = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;
            const { voucherCode } = req.body;

            const booking = await Booking.findOne({ _id: id, user_id: userId })
                .populate('space_id');

            if (!booking) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found');
            }

            if (booking.status !== 'pending_payment') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Vouchers can only be applied to pending payments');
            }

            let totalAmount = 0;
            if (booking.is_open_time) {
                totalAmount = parseFloat(booking.space_id.rate_hour || 0);
            } else {
                const checkIn = new Date(booking.check_in_at);
                const now = new Date();
                const seconds = Math.max(0, Math.floor((now - checkIn) / 1000));
                const ratePerSecond = (booking.space_id.rate_hour || 0) / 3600;
                totalAmount = parseFloat((seconds * ratePerSecond).toFixed(2));
            }

            const voucherResult = await rewardService.validateVoucher(voucherCode, userId);
            
            if (voucherResult.min_spend && totalAmount < voucherResult.min_spend) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Minimum spend of ₱${voucherResult.min_spend} required to use this voucher. Current total: ₱${totalAmount.toFixed(2)}`);
            }

            const discount = voucherResult.discount_amount;
            const finalAmount = Math.max(0, totalAmount - discount);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    sub_total: totalAmount,
                    discount_amount: discount,
                    total_amount: finalAmount,
                    voucher_code: voucherCode,
                    min_spend: voucherResult.min_spend
                }
            });
        } catch (error) {
            next(error);
        }
    };

    redeemVoucher = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;
            const { voucherCode } = req.body;

            const booking = await Booking.findOne({ _id: id, user_id: userId })
                .populate('space_id');

            if (!booking) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found');
            }

            if (booking.status !== 'pending_payment') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Vouchers can only be applied to pending payments');
            }

            let totalAmount = 0;
            if (booking.is_open_time) {
                totalAmount = parseFloat(booking.space_id.rate_hour || 0);
            } else {
                const checkIn = new Date(booking.check_in_at);
                const now = new Date();
                const seconds = Math.max(0, Math.floor((now - checkIn) / 1000));
                const ratePerSecond = (booking.space_id.rate_hour || 0) / 3600;
                totalAmount = parseFloat((seconds * ratePerSecond).toFixed(2));
            }

            const validationResult = await rewardService.validateVoucher(voucherCode, userId);
            
            if (validationResult.min_spend && totalAmount < validationResult.min_spend) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Minimum spend of ₱${validationResult.min_spend} required to use this voucher. Current total: ₱${totalAmount.toFixed(2)}`);
            }

            const voucherResult = await rewardService.validateAndUseVoucher(voucherCode, userId);

            const discount = voucherResult.discount_amount;
            const finalAmount = Math.max(0, totalAmount - discount);

            const updatedBooking = await Booking.findByIdAndUpdate(
                id,
                {
                    $set: {
                        total_amount: finalAmount,
                        voucher_applied: voucherCode,
                        voucher_discount: discount
                    }
                },
                { new: true }
            ).populate('space_id');

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Voucher redeemed successfully',
                data: {
                    booking: updatedBooking,
                    sub_total: totalAmount,
                    discount_amount: discount,
                    total_amount: finalAmount
                }
            });
        } catch (error) {
            console.error('Redeem voucher error:', error);
            next(error);
        }
    };

    previewVoucherForBooking = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { voucherCode } = req.body;

            const voucherResult = await rewardService.validateVoucher(voucherCode, userId);
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    discount_amount: voucherResult.discount_amount,
                    voucher_code: voucherCode,
                    min_spend: voucherResult.min_spend || 0,
                    message: `Voucher valid! Save ₱${voucherResult.discount_amount}`
                }
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new BookingController();