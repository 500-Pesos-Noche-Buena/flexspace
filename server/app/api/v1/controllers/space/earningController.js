const { Booking, Space } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/utils/constants');

class EarningsController {
    getUserId = (req) => req.user?.sub || req.user?._id || req.user?.id;

    index = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const isAdmin = req.user?.role === 'admin';

            // 1. Determine Scope: Admin sees all, Owner sees their own spaces
            let spaceQuery = {};
            if (!isAdmin) {
                const userSpaces = await Space.find({ user_id: userId }).select('_id');
                spaceQuery = { space_id: { $in: userSpaces.map(s => s._id) } };
            }

            // 2. Fetch Completed Bookings (Revenue)
            const bookings = await Booking.find({ 
                ...spaceQuery, 
                status: 'confirmed' // Only count paid/confirmed revenue
            }).populate('space_id', 'name');

            // 3. Calculate Stats
            const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
            const platformFee = totalRevenue * 0.10; // Example 10% fee
            const netEarnings = totalRevenue - platformFee;

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    totalRevenue,
                    netEarnings,
                    platformFee,
                    transactionCount: bookings.length,
                    transactions: bookings.map(b => ({
                        id: b._id,
                        reference: b.booking_reference,
                        space: b.space_id?.name,
                        amount: b.total_price,
                        date: b.created_at
                    }))
                }
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new EarningsController();