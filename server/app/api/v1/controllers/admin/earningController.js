const { Booking, Settings, Earnings, Space, User } = require('@/api/v1/models');

class EarningController {
    
    // Get owner financial summary - who owes platform fees
    index = async (req, res, next) => {
        try {
            const { month, owner_id } = req.query;
            
            // Get platform fee percentage from settings
            const feeSetting = await Settings.findOne({ key: 'platform_fee_percent' });
            const feePercent = Number(feeSetting?.value || 30);
            
            // Get all completed bookings
            const allBookings = await Booking.find({ status: 'completed' })
                .populate('space_id')
                .populate('user_id');
            
            // Get available months with earnings
            const monthSet = new Set();
            allBookings.forEach(booking => {
                const date = new Date(booking.check_out_at || booking.updated_at || booking.created_at);
                if (!isNaN(date.getTime())) {
                    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    monthSet.add(yearMonth);
                }
            });
            
            const availableMonths = Array.from(monthSet).sort().reverse().map(monthValue => {
                const [year, monthNum] = monthValue.split('-');
                const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                return {
                    value: monthValue,
                    label: date.toLocaleString('default', { month: 'long', year: 'numeric' })
                };
            });
            
            // Use selected month or latest
            let selectedMonth = month;
            if (!selectedMonth && availableMonths.length > 0) {
                selectedMonth = availableMonths[0].value;
            }
            
            if (!selectedMonth) {
                return res.json({
                    success: true,
                    availableMonths: [],
                    data: { totalAdminCut: 0, feePercent: 0, ownerSummaries: [], totalPendingFees: 0 }
                });
            }
            
            const [y, m] = selectedMonth.split('-').map(Number);
            const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
            const endDate = new Date(y, m, 0, 23, 59, 59, 999);
            
            // Filter bookings for selected month
            const bookings = allBookings.filter(b => {
                const date = new Date(b.check_out_at || b.updated_at || b.created_at);
                return date >= startDate && date <= endDate;
            });
            
            // Group by owner - THIS CREATES THE OWNER SUMMARY
            const ownerMap = new Map();
            
            for (const booking of bookings) {
                const ownerId = booking.space_id?.user_id?._id?.toString();
                if (!ownerId) continue;
                
                let paymentMethod = booking.payment_method || 'walkin';
                const amount = Number(booking.total_amount || 0);
                const platformFee = amount * (feePercent / 100);
                
                // Check if earnings record already exists
                let earningsRecord = await Earnings.findOne({
                    order_number: booking.ticket_number,
                    booking_id: booking._id
                });
                
                const isAutoCollect = ['online', 'qr', 'card', 'gcash', 'maya'].includes(paymentMethod);
                
                if (!earningsRecord) {
                    earningsRecord = await Earnings.create({
                        owner_id: ownerId,
                        space_id: booking.space_id._id,
                        order_number: booking.ticket_number,
                        booking_id: booking._id,
                        total_amount: amount,
                        platform_fee_percent: feePercent,
                        platform_fee: platformFee,
                        owner_earnings: amount - platformFee,
                        payment_method: paymentMethod,
                        auto_collected: isAutoCollect,
                        fee_status: isAutoCollect ? 'collected' : 'pending',
                        booking_date: booking.check_out_at || booking.updated_at || booking.created_at,
                        month: selectedMonth
                    });
                }
                
                if (!ownerMap.has(ownerId)) {
                    const owner = await User.findById(ownerId);
                    ownerMap.set(ownerId, {
                        _id: ownerId,
                        ownerName: owner?.name || 'Unknown',
                        ownerEmail: owner?.email || 'Unknown',
                        totalFee: 0,
                        collectedFee: 0,
                        pendingFee: 0,
                        totalBookings: 0,
                        cashPendingFee: 0,
                        onlineCollectedFee: 0,
                        spaces: new Map(),
                        earnings: []
                    });
                }
                
                const ownerData = ownerMap.get(ownerId);
                ownerData.totalFee += platformFee;
                ownerData.totalBookings += 1;
                
                // Track per space
                const spaceName = booking.space_id?.name || 'Unknown Space';
                if (!ownerData.spaces.has(spaceName)) {
                    ownerData.spaces.set(spaceName, { fee: 0, bookings: 0 });
                }
                const spaceData = ownerData.spaces.get(spaceName);
                spaceData.fee += platformFee;
                spaceData.bookings += 1;
                
                if (earningsRecord.fee_status === 'collected') {
                    ownerData.collectedFee += platformFee;
                    if (earningsRecord.auto_collected) {
                        ownerData.onlineCollectedFee += platformFee;
                    }
                } else {
                    ownerData.pendingFee += platformFee;
                    if (paymentMethod === 'cash') {
                        ownerData.cashPendingFee += platformFee;
                    }
                }
                
                ownerData.earnings.push({
                    id: earningsRecord._id,
                    order_number: earningsRecord.order_number,
                    total_amount: earningsRecord.total_amount,
                    platform_fee: earningsRecord.platform_fee,
                    payment_method: earningsRecord.payment_method,
                    fee_status: earningsRecord.fee_status,
                    booking_date: earningsRecord.booking_date
                });
            }
            
            // Format owner summaries
            const ownerSummaries = Array.from(ownerMap.values()).map(o => ({
                _id: o._id,
                ownerName: o.ownerName,
                ownerEmail: o.ownerEmail,
                totalFee: Number(o.totalFee.toFixed(2)),
                collectedFee: Number(o.collectedFee.toFixed(2)),
                pendingFee: Number(o.pendingFee.toFixed(2)),
                cashPendingFee: Number(o.cashPendingFee.toFixed(2)),
                onlineCollectedFee: Number(o.onlineCollectedFee.toFixed(2)),
                totalBookings: o.totalBookings,
                spaces: Array.from(o.spaces.entries()).map(([name, data]) => ({
                    name: name,
                    fee: Number(data.fee.toFixed(2)),
                    bookings: data.bookings
                })),
                earnings: o.earnings
            }));
            
            // Calculate totals
            const totalAdminCut = ownerSummaries.reduce((a, b) => a + b.totalFee, 0);
            const totalPendingFees = ownerSummaries.reduce((a, b) => a + b.pendingFee, 0);
            const totalCollectedFees = ownerSummaries.reduce((a, b) => a + b.collectedFee, 0);
            
            return res.json({
                success: true,
                availableMonths,
                data: {
                    totalAdminCut: Number(totalAdminCut.toFixed(2)),
                    totalPendingFees: Number(totalPendingFees.toFixed(2)),
                    totalCollectedFees: Number(totalCollectedFees.toFixed(2)),
                    feePercent,
                    ownerSummaries
                }
            });
            
        } catch (error) {
            console.error('Earnings error:', error);
            next(error);
        }
    };
    
        // Mark fees as collected (when owner pays)
    markFeesAsCollected = async (req, res, next) => {
        try {
            const adminId = req.user?.id;
            const { owner_id, month, amount, earnings_ids } = req.body;
            
            if (!owner_id || !amount) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Owner ID and amount are required' 
                });
            }
            
            // Update all pending earnings for this owner in the selected month
            const query = {
                owner_id: owner_id,
                month: month,
                fee_status: 'pending'
            };
            
            // If specific earnings IDs provided, update only those
            if (earnings_ids && earnings_ids.length > 0) {
                query._id = { $in: earnings_ids };
            }
            
            const result = await Earnings.updateMany(
                query,
                {
                    fee_status: 'collected',
                    collected_at: new Date(),
                    collected_by: adminId,
                    notes: `Manually marked as collected by admin on ${new Date().toLocaleString()}`
                }
            );
            
            return res.status(200).json({
                success: true,
                message: `Successfully collected ₱${amount} from owner`,
                data: { updatedCount: result.modifiedCount }
            });
            
        } catch (error) {
            console.error('Mark fees collected error:', error);
            next(error);
        }
    };
    
    // Get single owner detailed summary
    getOwnerDetails = async (req, res, next) => {
        try {
            const { owner_id, month } = req.params;
            
            const earnings = await Earnings.find({
                owner_id: owner_id,
                month: month
            }).populate('space_id', 'name');
            
            const totalFee = earnings.reduce((sum, e) => sum + e.platform_fee, 0);
            const collectedFee = earnings
                .filter(e => e.fee_status === 'collected')
                .reduce((sum, e) => sum + e.platform_fee, 0);
            const pendingFee = totalFee - collectedFee;
            
            const owner = await User.findById(owner_id);
            
            return res.status(200).json({
                success: true,
                data: {
                    owner: {
                        id: owner_id,
                        name: owner?.name,
                        email: owner?.email
                    },
                    summary: {
                        totalFee: Number(totalFee.toFixed(2)),
                        collectedFee: Number(collectedFee.toFixed(2)),
                        pendingFee: Number(pendingFee.toFixed(2)),
                        totalTransactions: earnings.length
                    },
                    transactions: earnings.map(e => ({
                        id: e._id,
                        order_number: e.order_number,
                        space_name: e.space_id?.name,
                        total_amount: e.total_amount,
                        platform_fee: e.platform_fee,
                        payment_method: e.payment_method,
                        fee_status: e.fee_status,
                        booking_date: e.booking_date,
                        collected_at: e.collected_at
                    }))
                }
            });
            
        } catch (error) {
            console.error('Get owner details error:', error);
            next(error);
        }
    };
}

module.exports = new EarningController();