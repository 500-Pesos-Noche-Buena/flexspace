const { Booking, Space, Payment, User } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');
const rewardService = require('@/api/v1/services/rewardService');
const emailService = require('@/api/v1/services/emailService');

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

    index = async (req, res, next) => {
        try {
            // Use the helper to get the parent ID if staff
            const ownerId = await this.getOwnerId(req);
            const { search = '', status = '', type = 'all', page = 1, limit = 10 } = req.query;

            // Find spaces belonging to the parent owner
            const userSpaces = await Space.find({ user_id: ownerId }).select('_id');
            const spaceIds = userSpaces.map(s => s._id);

            let query = { space_id: { $in: spaceIds } };
            if (status) query.status = status;
            if (type !== 'all') query.booking_type = type;
            if (search) {
                query.$or = [
                    { ticket_number: { $regex: search, $options: 'i' } },
                    { guest_name: { $regex: search, $options: 'i' } }
                ];
            }

            const bookings = await Booking.find(query)
                .populate('space_id', 'name rate_hour qr_payment_image')
                .populate('user_id', 'name email')
                .sort({ created_at: -1 })
                .limit(limit * 1).skip((page - 1) * limit);

            const total = await Booking.countDocuments(query);

            // Stats logic remains focused on the parent's spaces
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
        } catch (error) { next(error); }
    };

    updateStatus = async (req, res, next) => {
        try {
            const { id, action } = req.params;
            const ownerId = await this.getOwnerId(req);

            const booking = await Booking.findById(id).populate('space_id').populate('user_id');

            if (!booking || String(booking.space_id.user_id) !== String(ownerId)) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized access.');
            }

            const statusMap = { confirm: 'confirmed', reject: 'rejected', cancel: 'cancelled' };
            if (!statusMap[action]) throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Unknown action: ${action}`);

            booking.status = statusMap[action];
            if (action === 'confirm') booking.notes = '';
            await booking.save();

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
                    // Don't fail the request if email fails
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
            const { id } = req.params;
            const ownerId = await this.getOwnerId(req);

            let booking = await Booking.findById(id).populate('space_id').populate('user_id');

            if (!booking || String(booking.space_id.user_id) !== String(ownerId)) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized access.');
            }

            const now = new Date();
            let totalAmount = 0;
            let checkInTime = null;
            let checkOutTime = null;

            // For non-open time bookings, calculate based on actual check-in/out times
            if (!booking.is_open_time) {
                // Use actual check_in_at (when they scanned QR)
                if (!booking.check_in_at) {
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No check-in recorded. User must scan QR code first.');
                }

                checkInTime = new Date(booking.check_in_at);

                // If they already checked out manually, use that time
                if (booking.check_out_at) {
                    checkOutTime = new Date(booking.check_out_at);
                } else {
                    checkOutTime = now;
                }

                // Calculate actual time spent
                const timeDiffMs = checkOutTime - checkInTime;

                // Validate that check-out is after check-in
                if (timeDiffMs < 0) {
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Check-out time cannot be before check-in time.');
                }

                const hoursSpent = timeDiffMs / (1000 * 60 * 60);
                const hourlyRate = parseFloat(booking.space_id.rate_hour || 0);
                totalAmount = hoursSpent * hourlyRate;
                totalAmount = parseFloat(totalAmount.toFixed(2));

                console.log(`Actual session time: ${hoursSpent.toFixed(2)} hours (from ${checkInTime} to ${checkOutTime})`);
                console.log(`Rate: ₱${hourlyRate}/hour, Total: ₱${totalAmount}`);

            } else {
                // For open time bookings, use flat rate
                totalAmount = parseFloat(booking.space_id.rate_hour || 0);
                console.log(`Open time booking, flat rate: ₱${totalAmount}`);
            }

            // Check if voucher was already applied
            const hasVoucher = booking.voucher_applied && booking.voucher_discount > 0;
            let discount = 0;
            let finalAmount = totalAmount;

            if (hasVoucher) {
                discount = booking.voucher_discount;
                finalAmount = Math.max(0, totalAmount - discount);
                console.log(`Voucher applied: ${booking.voucher_applied}, discount: ${discount}, final: ${finalAmount}`);
            }

            // Update booking to pending_payment with calculated amounts
            const updateData = {
                total_amount: finalAmount,
                status: 'pending_payment',
                payment_status: 'unpaid',
            };

            // Only set check_out_at if it's not already set
            if (!booking.check_out_at && !booking.is_open_time) {
                updateData.check_out_at = now;
            }

            const updated = await Booking.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true }
            ).populate('space_id').populate('user_id');

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    booking: updated,
                    sub_total: totalAmount,
                    discount: discount,
                    total_amount: finalAmount,
                    has_voucher: hasVoucher,
                    voucher_code: booking.voucher_applied,
                    time_spent: !booking.is_open_time && checkInTime ? {
                        check_in: checkInTime,
                        check_out: checkOutTime,
                        hours: ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2),
                        minutes: Math.floor((checkOutTime - checkInTime) / 60000)
                    } : null
                }
            });
        } catch (error) {
            console.error('Calculate bill error:', error);
            next(error);
        }
    };

    checkout = async (req, res, next) => {
        try {
            const { id } = req.params;
            const ownerId = await this.getOwnerId(req);
            const { payment_method, amount_received } = req.body;

            const booking = await Booking.findById(id).populate('space_id').populate('user_id');

            if (!booking || String(booking.space_id.user_id) !== String(ownerId)) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized access.');
            }

            if (booking.status !== 'pending_payment') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Booking is not awaiting payment.');
            }

            const totalDue = booking.total_amount;
            const received = parseFloat(amount_received) || 0;
            const change = payment_method === 'cash' ? Math.max(0, received - totalDue) : 0;

            // Calculate original amount (add back the discount if voucher was applied)
            const originalAmount = totalDue + (booking.voucher_discount || 0);
            const discountApplied = booking.voucher_discount || 0;

            let referenceNumber = null;
            if (payment_method !== 'cash') {
                referenceNumber = `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            }

            const paymentDoc = await Payment.create({
                booking_id: booking._id,
                method: payment_method,
                amount_total: totalDue,
                amount_original: originalAmount,
                discount_applied: discountApplied,
                amount_received: payment_method === 'cash' ? received : totalDue,
                change,
                reference_number: referenceNumber,
                status: 'completed',
                processed_by: ownerId,
            });

            const completed = await Booking.findByIdAndUpdate(
                id,
                {
                    $set: {
                        status: 'completed',
                        payment_status: 'paid',
                        payment_id: paymentDoc._id,
                    }
                },
                { new: true }
            ).populate('space_id').populate('user_id');

            if (completed.user_id && totalDue > 0) {
                await rewardService.awardPoints(completed.user_id, totalDue);

                // Send booking completion email with receipt
                const user = completed.user_id;
                const space = completed.space_id;

                // Format date and time
                const bookingDate = new Date(completed.created_at).toLocaleDateString('en-PH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                const startTime = completed.start_time ? new Date(completed.start_time).toLocaleTimeString('en-PH', {
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'N/A';

                const endTime = completed.end_time ? new Date(completed.end_time).toLocaleTimeString('en-PH', {
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'N/A';

                const bookingDetails = {
                    ticket_number: completed.ticket_number,
                    space_name: space.name,
                    date: bookingDate,
                    time: `${startTime} - ${endTime}`,
                    total_amount: totalDue,
                    original_amount: originalAmount,
                    discount: discountApplied,
                    points_earned: Math.floor(totalDue / 20),
                    payment_method: payment_method === 'cash' ? 'Cash' : 'GCash/QR',
                    receipt_number: paymentDoc._id.toString().slice(-8).toUpperCase()
                };

                // Send email receipt
                await emailService.sendBookingCompletionEmail(user.email, user.name, bookingDetails);

                console.log(`Booking completion email sent to ${user.email}`);
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Payment completed. Points earned!',
                data: { booking: completed }
            });
        } catch (error) {
            console.error('Checkout error:', error);
            next(error);
        }
    };

    // FIXED: applyVoucher - uses the already calculated total_amount from the booking
    applyVoucher = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { voucherCode } = req.body;
            const ownerId = await this.getOwnerId(req);

            const booking = await Booking.findById(id).populate('space_id').populate('user_id');

            if (!booking || String(booking.space_id.user_id) !== String(ownerId)) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized access.');
            }

            // Only allow voucher application if booking is in pending_payment status
            if (booking.status !== 'pending_payment') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Vouchers can only be applied to pending payments');
            }

            // Don't allow if voucher already applied
            if (booking.voucher_applied) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'A voucher has already been applied to this booking');
            }

            // USE THE ALREADY CALCULATED total_amount from the booking
            // This is the amount calculated by calculateBill
            const totalAmount = booking.total_amount;

            if (!totalAmount || totalAmount <= 0) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid total amount. Please calculate bill first.');
            }

            console.log(`Current total_amount from booking: ₱${totalAmount}`);

            // Validate the voucher (includes min_spend check)
            const validationResult = await rewardService.validateVoucher(voucherCode, booking.user_id?._id || booking.user_id);

            // Check minimum spend requirement
            if (validationResult.min_spend && totalAmount < validationResult.min_spend) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Minimum spend of ₱${validationResult.min_spend} required to use this voucher. Current total: ₱${totalAmount.toFixed(2)}`);
            }

            // Consume the voucher
            const voucherResult = await rewardService.validateAndUseVoucher(voucherCode, booking.user_id?._id || booking.user_id);

            const discount = voucherResult.discount_amount;
            const finalAmount = Math.max(0, totalAmount - discount);

            console.log(`Voucher applied: ${voucherCode}, discount: ₱${discount}, final: ₱${finalAmount}`);

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
            ).populate('space_id').populate('user_id');

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Voucher applied successfully',
                data: {
                    booking: updatedBooking,
                    discount_amount: discount,
                    total_amount: finalAmount,
                    original_amount: totalAmount
                }
            });
        } catch (error) {
            console.error('Apply voucher error:', error);
            next(error);
        }
    };
}

module.exports = new BookingController();