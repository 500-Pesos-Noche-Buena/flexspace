const { Booking, Space, User } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');
const crypto = require('crypto');
const rewardService = require('@/api/v1/services/rewardService');

class BookingController {
    getUserId = (req) => req.user?.sub || req.user?._id || req.user?.id;

    getMyBookings = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { page = 1, limit = 10, status = '' } = req.query;

            let query = { user_id: userId };
            if (status) query.status = status;

            // Get total points for the user to display in dashboard
            const userPoints = await rewardService.getUserPoints(userId);

            const total = await Booking.countDocuments(query);
            const bookings = await Booking.find(query)
                .populate('space_id', 'name image area rate_hour')
                .sort({ created_at: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    bookings,
                    total,
                    points: userPoints // Send points to frontend
                }
            });
        } catch (error) {
            next(error);
        }
    };

    // FIXED: Removed voucher_code from createBooking - vouchers should only be applied at payment time
    createBooking = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { space_id, date, start_time, end_time, is_open_time, notes } = req.body; // REMOVED voucher_code

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

            // Fix for timezone consistency in Iloilo (+8)
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

            // 1. LATENESS CHECK (1 Hour Grace Period)
            if (booking.status === 'confirmed' && !booking.is_open_time) {
                const limit = new Date(booking.start_time.getTime() + (60 * 60 * 1000));
                if (now > limit) {
                    booking.status = 'cancelled';
                    booking.notes = 'Expired: Scanned too late.';
                    await booking.save();
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Booking expired due to lateness.');
                }
            }

            // 2. CHECK-IN LOGIC
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

            // 3. ALREADY ACTIVE LOGIC
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

    // Preview voucher for existing booking (pending_payment status)
    previewVoucher = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;
            const { voucherCode } = req.body;

            // Get booking and verify ownership
            const booking = await Booking.findOne({ _id: id, user_id: userId })
                .populate('space_id');

            if (!booking) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found');
            }

            if (booking.status !== 'pending_payment') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Vouchers can only be applied to pending payments');
            }

            // Calculate current total (same logic as calculateBill)
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

            // Validate voucher without consuming it (includes min_spend check)
            const voucherResult = await rewardService.validateVoucher(voucherCode, userId);
            
            // Check minimum spend requirement
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

    // Redeem voucher for existing booking (pending_payment status)
    redeemVoucher = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { id } = req.params;
            const { voucherCode } = req.body;

            // Get booking and verify ownership
            const booking = await Booking.findOne({ _id: id, user_id: userId })
                .populate('space_id');

            if (!booking) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found');
            }

            if (booking.status !== 'pending_payment') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Vouchers can only be applied to pending payments');
            }

            // Calculate current total
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

            // First validate the voucher (includes min_spend check)
            const validationResult = await rewardService.validateVoucher(voucherCode, userId);
            
            // Check minimum spend requirement
            if (validationResult.min_spend && totalAmount < validationResult.min_spend) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Minimum spend of ₱${validationResult.min_spend} required to use this voucher. Current total: ₱${totalAmount.toFixed(2)}`);
            }

            // Validate AND consume the voucher
            const voucherResult = await rewardService.validateAndUseVoucher(voucherCode, userId);

            const discount = voucherResult.discount_amount;
            const finalAmount = Math.max(0, totalAmount - discount);

            // Update booking with discounted amount
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

    // Preview voucher during booking creation (before booking is made)
    // This is optional - you can keep or remove this
    previewVoucherForBooking = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { voucherCode } = req.body;

            // Validate voucher without consuming it
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