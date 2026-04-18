// user/bookingController
const { Booking, Space } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');
const crypto = require('crypto');

class BookingController {
    getUserId = (req) => req.user?.sub || req.user?._id || req.user?.id;

    getMyBookings = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { page = 1, limit = 10, status = '' } = req.query;

            let query = { user_id: userId };
            if (status) query.status = status;

            const total = await Booking.countDocuments(query);
            const bookings = await Booking.find(query)
                .populate('space_id', 'name image area')
                .sort({ created_at: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            return res.status(HTTP_STATUS.OK).json({ success: true, data: { bookings, total } });
        } catch (error) {
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

            // Force Philippines Offset (+08:00) so it doesn't shift back to yesterday
            if (is_open_time) {
                bookingData.start_time = new Date(`${date}T00:00:00+08:00`);
                bookingData.end_time = new Date(`${date}T23:59:59+08:00`);
            } else {
                bookingData.start_time = new Date(`${date}T${start_time}:00+08:00`);
                bookingData.end_time = new Date(`${date}T${end_time}:00+08:00`);
            }

            const newBooking = await Booking.create(bookingData);
            return res.status(HTTP_STATUS.CREATED).json({ success: true, data: newBooking });
        } catch (error) {
            next(error);
        }
    };

    scanHubQRCode = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { space_id } = req.body;

            const booking = await Booking.findOne({
                user_id: userId,
                space_id: space_id,
                status: { $in: ['confirmed', 'active'] }
            }).sort({ created_at: -1 });

            if (!booking) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'No valid booking found.');

            const now = new Date();

            // Prevent late check-in (1 hour late max)
            if (booking.status === 'confirmed' && !booking.is_open_time) {
                const limit = new Date(booking.start_time.getTime() + (60 * 60 * 1000));
                if (now > limit) {
                    booking.status = 'cancelled';
                    booking.notes = 'Expired: Scanned too late.';
                    await booking.save();
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Booking expired due to lateness.');
                }
            }

            if (!booking.check_in_at) {
                booking.check_in_at = now;
                booking.status = 'active';
            } else if (!booking.check_out_at) {
                booking.check_out_at = now;
                booking.status = 'completed';
            }

            await booking.save();
            return res.status(HTTP_STATUS.OK).json({ success: true, message: "Status Updated", data: booking });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new BookingController();