const crypto = require('crypto');
const { Booking, Space, User, Room } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class WalkinController {

    generateReviewQRUrl = () => {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const token = crypto.randomBytes(32).toString('hex');
        return {
            qr_code_token: token,
            review_url: `${backendUrl}/api/v1/space/qr/${token}`
        };
    };

    getOwnerId = async (req) => {
        const userId = req.user?.sub || req.user?._id || req.user?.id;

        if (req.user?.role === 'staff') {
            const staffRecord = await User.findById(userId).select('parent_id');
            if (!staffRecord || !staffRecord.parent_id) {
                console.error(`❌ Staff member ${userId} has NO parent_id assigned!`);
                return userId;
            }
            return staffRecord.parent_id.toString();
        }
        return userId;
    };

    index = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const userSpaces = await Space.find({ user_id: ownerId }).select('_id');

            if (!userSpaces.length) {
                return res.status(HTTP_STATUS.OK).json({ success: true, data: [] });
            }

            const spaceIds = userSpaces.map(s => s._id);

            let query = {
                space_id: { $in: spaceIds },
                booking_type: 'walkin',
                status: { $ne: 'completed' }
            };

            const walkins = await Booking.find(query)
                .populate('space_id', 'name rate_hour qr_payment_image')
                .populate('room_id', 'name type capacity rate_hour')  // Add room population
                .sort({ created_at: -1 });

            return res.status(HTTP_STATUS.OK).json({ success: true, data: walkins });
        } catch (error) { next(error); }
    };

    // UPDATED: store method with room selection
    store = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const { space_id, room_id, name, email, is_open_time, start_time, end_time } = req.body;

            const space = await Space.findOne({ _id: space_id, user_id: ownerId });
            if (!space) throw new ApiError(HTTP_STATUS.FORBIDDEN, "Unauthorized space access.");

            // If room_id provided, verify room belongs to space and get rate
            let rate_per_hour = space.rate_hour;
            let bookable_type = 'space';
            let roomData = null;

            if (room_id) {
                const room = await Room.findOne({ _id: room_id, space_id: space_id });
                if (!room) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Room not found in this space.");
                rate_per_hour = room.rate_hour;
                bookable_type = 'room';
                roomData = room_id;
            }

            const ticket = `WK-${Math.random().toString(36).toUpperCase().substring(2, 8)}`;
            const now = new Date();

            // Generate QR token for review
            const { qr_code_token, review_url } = this.generateReviewQRUrl();

            const walkinData = {
                space_id,
                room_id: roomData,
                bookable_type: bookable_type,
                rate_per_hour: rate_per_hour,
                booking_type: 'walkin',
                guest_name: name,
                user_id: null,
                status: 'active',
                payment_status: 'unpaid',
                is_open_time: is_open_time || false,
                check_in_at: now,
                ticket_number: ticket,
                total_amount: 0,
                qr_code_token: qr_code_token
            };

            // OPEN TIME (checked) - No scheduled times, just check_in_at
            if (is_open_time === true) {
                walkinData.start_time = now;
                walkinData.end_time = null;
                console.log(`Open Time walk-in: Started at ${now} - ${bookable_type === 'room' ? 'Room: ' + room_id : 'Open Area'}`);
            }
            // HOURLY BOOKING (unchecked) - Use manual start_time and end_time
            else {
                const today = new Date().toISOString().split('T')[0];

                if (start_time) {
                    walkinData.start_time = new Date(`${today}T${start_time}:00+08:00`);
                }
                if (end_time) {
                    walkinData.end_time = new Date(`${today}T${end_time}:00+08:00`);
                }
                console.log(`Hourly walk-in: Scheduled ${walkinData.start_time} - ${walkinData.end_time} - ${bookable_type === 'room' ? 'Room' : 'Open Area'}`);
            }

            const walkin = await Booking.create(walkinData);

            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: "Walk-in created and checked in!",
                data: walkin
            });
        } catch (error) {
            next(error);
        }
    };

    // UPDATED: get spaces with rooms for the walk-in modal
    getSpacesWithRooms = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            
            const spaces = await Space.find({ user_id: ownerId })
                .select('_id name rate_hour')
                .lean();
            
            // Get rooms for each space
            const spacesWithRooms = await Promise.all(spaces.map(async (space) => {
                const rooms = await Room.find({ 
                    space_id: space._id, 
                    is_available: true 
                }).select('_id name type capacity rate_hour is_airconditioned has_window');
                
                return {
                    ...space,
                    rooms: rooms
                };
            }));
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: spacesWithRooms
            });
        } catch (error) {
            console.error('Get spaces with rooms error:', error);
            next(error);
        }
    };

    calculateBill = async (req, res, next) => {
        try {
            const { id } = req.params;
            const ownerId = await this.getOwnerId(req);

            let booking = await Booking.findById(id).populate('space_id').populate('room_id').populate('user_id');

            if (!booking || String(booking.space_id.user_id) !== String(ownerId)) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized access.');
            }

            const now = new Date();
            let totalAmount = 0;
            
            // Get rate (from room if booked, otherwise from space)
            const ratePerHour = booking.rate_per_hour || booking.space_id.rate_hour;

            // For HOURLY BOOKING (is_open_time = false) - Use scheduled start_time and end_time
            if (!booking.is_open_time) {
                if (!booking.start_time || !booking.end_time) {
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Missing scheduled start or end time.');
                }

                const scheduledStart = new Date(booking.start_time);
                const scheduledEnd = new Date(booking.end_time);
                const timeDiffMs = scheduledEnd - scheduledStart;
                const hoursSpent = timeDiffMs / (1000 * 60 * 60);
                totalAmount = hoursSpent * ratePerHour;
                totalAmount = parseFloat(totalAmount.toFixed(2));

                console.log(`Hourly walk-in - Bookable: ${booking.bookable_type || 'space'}`);
                console.log(`Scheduled: ${scheduledStart} to ${scheduledEnd}`);
                console.log(`Duration: ${hoursSpent} hours × ₱${ratePerHour}/hr = ₱${totalAmount}`);

            } else {
                // For OPEN TIME - Use actual check_in_at and check_out_at
                if (!booking.check_in_at) {
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No check-in recorded.');
                }

                const checkInTime = new Date(booking.check_in_at);
                const checkOutTime = booking.check_out_at ? new Date(booking.check_out_at) : now;

                const timeDiffMs = checkOutTime - checkInTime;
                const hoursSpent = timeDiffMs / (1000 * 60 * 60);
                totalAmount = hoursSpent * ratePerHour;
                totalAmount = parseFloat(totalAmount.toFixed(2));

                console.log(`Open time walk-in - Bookable: ${booking.bookable_type || 'space'}`);
                console.log(`Check-in: ${checkInTime}, Check-out: ${checkOutTime}`);
                console.log(`Duration: ${hoursSpent} hours × ₱${ratePerHour}/hr = ₱${totalAmount}`);
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

            const updateData = {
                total_amount: finalAmount,
                status: 'pending_payment',
                payment_status: 'unpaid',
                check_out_at: now
            };

            const updated = await Booking.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true }
            ).populate('space_id').populate('room_id').populate('user_id');

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    booking: updated,
                    sub_total: totalAmount,
                    discount: discount,
                    total_amount: finalAmount,
                    has_voucher: hasVoucher,
                    voucher_code: booking.voucher_applied
                }
            });
        } catch (error) {
            console.error('Walk-in calculate bill error:', error);
            next(error);
        }
    };

    checkout = async (req, res, next) => {
        try {
            const { id } = req.params;
            const ownerId = await this.getOwnerId(req);
            const { payment_method, amount_received } = req.body;

            const booking = await Booking.findById(id).populate('space_id').populate('room_id').populate('user_id');

            if (!booking || String(booking.space_id.user_id) !== String(ownerId)) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized access.');
            }

            if (booking.status !== 'pending_payment') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Booking is not awaiting payment.');
            }

            const totalDue = booking.total_amount;
            const received = parseFloat(amount_received) || 0;
            const change = payment_method === 'cash' ? Math.max(0, received - totalDue) : 0;

            let referenceNumber = null;
            if (payment_method !== 'cash') {
                referenceNumber = `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            }

            const { Payment } = require('@/api/v1/models');

            const paymentDoc = await Payment.create({
                booking_id: booking._id,
                method: payment_method,
                amount_total: totalDue,
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
            ).populate('space_id').populate('room_id').populate('user_id');

            if (completed.user_id && totalDue > 0) {
                const rewardService = require('@/api/v1/services/rewardService');
                await rewardService.awardPoints(completed.user_id, totalDue);
            }

            const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
            const reviewQrUrl = completed.qr_code_token
                ? `${backendUrl}/api/v1/space/qr/${completed.qr_code_token}`
                : null;

            console.log('Review QR URL (backend API):', reviewQrUrl);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Payment completed!',
                data: {
                    booking: completed,
                    review_qr_url: reviewQrUrl
                }
            });
        } catch (error) {
            console.error('Walk-in checkout error:', error);
            next(error);
        }
    };

    guests = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const userSpaces = await Space.find({ user_id: ownerId }).select('_id');
            const spaceIds = userSpaces.map(s => s._id);
            const { search } = req.query;

            const guests = await Booking.find({
                space_id: { $in: spaceIds },
                booking_type: 'walkin',
                guest_name: { $regex: search, $options: 'i' },
            })
                .select('guest_name space_id created_at')
                .populate('space_id', 'name')
                .sort({ created_at: -1 })
                .limit(5);

            const seen = new Set();
            const unique = guests.filter(g => {
                if (seen.has(g.guest_name)) return false;
                seen.add(g.guest_name);
                return true;
            });

            return res.status(HTTP_STATUS.OK).json({ success: true, data: unique });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new WalkinController();