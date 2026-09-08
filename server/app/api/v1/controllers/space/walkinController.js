const crypto = require('crypto');
const { Booking, Space, User, Room } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const bookingBillingService = require('@/api/v1/services/bookingBillingService');

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

            if (req.body.use_consumable_promo != null && typeof req.body.use_consumable_promo !== 'boolean') throw new ApiError(400, 'Choose whether to use the consumable promo.');
            const allowed = await require('@/api/v1/services/bookingOrderService').scope(req);
            const allowedIds = allowed.space_id?.$in || [allowed.space_id];
            if (!allowedIds.some(id => String(id) === String(space_id))) throw new ApiError(403, 'Unauthorized branch.');
            const space = await Space.findOne({ _id: space_id, user_id: ownerId });
            if (!space) throw new ApiError(HTTP_STATUS.FORBIDDEN, "Unauthorized space access.");

            // If room_id provided, verify room belongs to space and get rate
            let rate_per_hour = space.rate_hour;
            let bookable_type = 'space';
            let roomData = null;

            let consumableAllowance = 0;
            let promoSnapshot = null;

            if (room_id) {
                const room = await Room.findOne({
                    _id: room_id,
                    space_id: space_id,
                    is_available: true
                });

                if (!room) {
                    throw new ApiError(
                        HTTP_STATUS.NOT_FOUND,
                        'Room not found in this space.'
                    );
                }


                rate_per_hour = require('@/api/v1/services/roomPricingService').selectRate(room, req.body.guest_count ?? 1).rate_per_hour;

                bookable_type =
                    'room';

                roomData =
                    room_id;


                const promo = require('@/api/v1/services/roomPromoService').snapshot(room, req.body.use_consumable_promo !== false, req.body.promo_audience, req.body.guest_count ?? 1);
                consumableAllowance = promo.consumable_allowance;
                promoSnapshot = promo.promo_snapshot;
            }

            const ticket = `WK-${Math.random().toString(36).toUpperCase().substring(2, 8)}`;
            const now = new Date();

            // Generate QR token for review
            const { qr_code_token, review_url } = this.generateReviewQRUrl();

            const walkinData = {
                space_id,

                room_id: roomData,
                guest_count: roomData ? Number(req.body.guest_count ?? 1) : 1,

                bookable_type,

                rate_per_hour,

                booking_type: 'walkin',

                guest_name: name,

                user_id: null,

                status: 'active',

                payment_status: 'unpaid',

                is_open_time:
                    is_open_time || false,

                check_in_at: now,

                ticket_number: ticket,

                total_amount: 0,

                qr_code_token,


                // ✅ NEW
                consumable_allowance:
                    consumableAllowance,

                promo_snapshot:
                    promoSnapshot
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

            const allowed = await require('@/api/v1/services/bookingOrderService').scope(req);
            const spaces = await Space.find({ user_id: ownerId, _id: allowed.space_id })
                .select('_id name rate_hour')
                .lean();

            // Get rooms for each space
            const spacesWithRooms = await Promise.all(spaces.map(async (space) => {
                const rooms = await Room.find({
                    space_id: space._id,
                    is_available: true
                }).select('_id name type capacity rate_hour is_airconditioned has_window has_consumable_promo promo_name promo_price promo_duration_hours consumable_allowance consumable_packages hourly_rates promo_room_portion');

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

    guests = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const userSpaces = await Space.find({ user_id: ownerId }).select('_id');
            const spaceIds = userSpaces.map(s => s._id);
            const { search = '' } = req.query;

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