const { Booking, Space, User } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');

class WalkinController {

    // Inside your Controller class
    getOwnerId = async (req) => {
        const userId = req.user?.sub || req.user?._id || req.user?.id;

        if (req.user?.role === 'staff') {
            const staffRecord = await User.findById(userId).select('parent_id');

            if (!staffRecord || !staffRecord.parent_id) {
                console.error(`❌ Staff member ${userId} has NO parent_id assigned!`);
                return userId;
            }

            // Return the parent_id as a string for the query
            return staffRecord.parent_id.toString();
        }

        return userId;
    };

    index = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);

            // 1. Find the spaces
            const userSpaces = await Space.find({ user_id: ownerId }).select('_id');

            // 2. CHECK: If no spaces found, walkins will be empty
            if (!userSpaces.length) {
                console.log(`⚠️ No spaces found for Owner ID: ${ownerId}`);
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
                .sort({ created_at: -1 });

            return res.status(HTTP_STATUS.OK).json({ success: true, data: walkins });
        } catch (error) { next(error); }
    };

    store = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const { space_id, name, email, is_open_time } = req.body;

            // Verify space belongs to the parent owner
            const space = await Space.findOne({ _id: space_id, user_id: ownerId });
            if (!space) throw new ApiError(HTTP_STATUS.FORBIDDEN, "Unauthorized space access.");

            // Generate unique ticket
            const ticket = `WK-${Math.random().toString(36).toUpperCase().substring(2, 8)}`;

            const walkin = await Booking.create({
                space_id,
                booking_type: 'walkin',
                guest_name: name,
                user_id: null, // Walk-ins stay anonymous
                status: 'active',
                payment_status: 'unpaid',
                is_open_time: is_open_time || false,
                start_time: new Date(),
                check_in_at: new Date(),
                ticket_number: ticket,
                // If it's open time (whole day/session), set price now
                total_amount: is_open_time ? parseFloat(space.rate_hour || 0) : 0,
            });

            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: "Walk-in created and checked in!",
                data: walkin
            });
        } catch (error) {
            next(error);
        }
    };

    // Route: GET /space/walkins/guests?search=jo
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

            // Deduplicate by guest_name — show most recent visit per name
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