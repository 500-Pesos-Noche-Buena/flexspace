const { Booking, Space, Payment, User } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');

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
                    { guest_name:    { $regex: search, $options: 'i' } }
                ];
            }

            const bookings = await Booking.find(query)
                .populate('space_id', 'name rate_hour')
                .populate('user_id', 'name email')
                .sort({ created_at: -1 })
                .limit(limit * 1).skip((page - 1) * limit);

            const total = await Booking.countDocuments(query);

            // Stats logic remains focused on the parent's spaces
            const stats = {
                total,
                pending: await Booking.countDocuments({ space_id: { $in: spaceIds }, status: 'pending' }),
                active:  await Booking.countDocuments({ space_id: { $in: spaceIds }, status: 'active' }),
                online:  await Booking.countDocuments({ space_id: { $in: spaceIds }, booking_type: 'online' }),
                walkin:  await Booking.countDocuments({ space_id: { $in: spaceIds }, booking_type: 'walkin' }),
                revenue: (await Booking.aggregate([
                    { $match: { 
                        space_id: { $in: spaceIds }, 
                        status: 'completed',
                        updated_at: { $gte: new Date(new Date().setHours(0,0,0,0)) } 
                    }},
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

            const booking = await Booking.findById(id).populate('space_id');
            
            // Authorization check against the parent ID
            if (!booking || String(booking.space_id.user_id) !== String(ownerId)) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized access.');
            }

            const statusMap = { confirm: 'confirmed', reject: 'rejected', cancel: 'cancelled' };
            if (!statusMap[action]) throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Unknown action: ${action}`);

            booking.status = statusMap[action];
            if (action === 'confirm') booking.notes = '';
            await booking.save();

            return res.status(HTTP_STATUS.OK).json({ success: true, message: `Status updated to ${booking.status}` });
        } catch (error) { next(error); }
    };

    calculateBill = async (req, res, next) => {
        try {
            const { id } = req.params;
            const ownerId = await this.getOwnerId(req);

            const booking = await Booking.findById(id).populate('space_id');
            if (!booking || String(booking.space_id.user_id) !== String(ownerId)) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized access.');
            }

            if (booking.status !== 'active') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Only active sessions can be billed.');
            }

            const now = new Date();
            let totalAmount = 0;

            if (booking.is_open_time) {
                totalAmount = parseFloat(booking.space_id.rate_hour || 0);
            } else {
                const checkIn = new Date(booking.check_in_at);
                const seconds = Math.max(0, Math.floor((now - checkIn) / 1000));
                const ratePerSecond = (booking.space_id.rate_hour || 0) / 3600;
                totalAmount = parseFloat((seconds * ratePerSecond).toFixed(2));
            }

            const updated = await Booking.findByIdAndUpdate(
                id,
                {
                    $set: {
                        check_out_at: now,
                        total_amount: totalAmount,
                        status: 'pending_payment',
                        payment_status: 'unpaid',
                    }
                },
                { new: true }
            )
            .populate('space_id', 'name image area rate_hour qr_payment_image')
            .populate('user_id', 'name email');

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: { booking: updated, total_amount: totalAmount }
            });
        } catch (error) { next(error); }
    };

    checkout = async (req, res, next) => {
        try {
            const { id }  = req.params;
            const ownerId = await this.getOwnerId(req);
            const { payment_method, amount_received } = req.body;

            const booking = await Booking.findById(id).populate('space_id');
            if (!booking || String(booking.space_id.user_id) !== String(ownerId)) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized access.');
            }

            if (booking.status !== 'pending_payment') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Booking is not awaiting payment.');
            }

            const totalDue = booking.total_amount;
            const received = parseFloat(amount_received) || 0;
            const change = payment_method === 'cash' ? Math.max(0, received - totalDue) : 0;

            const paymentDoc = await Payment.create({
                booking_id:      booking._id,
                method:          payment_method,
                amount_total:    totalDue,
                amount_received: payment_method === 'cash' ? received : totalDue,
                change,
                status:          'completed',
            });

            const completed = await Booking.findByIdAndUpdate(
                id,
                {
                    $set: {
                        status: 'completed',
                        payment_status: 'paid',
                        payment_id: paymentDoc._id,
                        total_amount: totalDue,
                    }
                },
                { new: true }
            ).populate('space_id').populate('user_id');

            return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Payment completed.' });
        } catch (error) { next(error); }
    };
}

module.exports = new BookingController();