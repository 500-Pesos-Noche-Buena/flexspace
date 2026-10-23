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

    // ============================================
    // DEDICATED EARNINGS ANALYTICS & PROJECTIONS
    // ============================================
    getEarningsAnalytics = async (req, res, next) => {
        try {
            // Get platform fee percentage from settings
            const feeSetting = await Settings.findOne({ key: 'platform_fee_percent' });
            const feePercent = Number(feeSetting?.value || 10);

            // Sync all completed bookings to earnings records if not yet created
            const completedBookings = await Booking.find({ status: 'completed' })
                .populate('space_id')
                .lean();

            for (const booking of completedBookings) {
                const ownerId = booking.space_id?.user_id?._id || booking.space_id?.user_id;
                if (!ownerId) continue;

                const existing = await Earnings.findOne({
                    order_number: booking.ticket_number,
                    booking_id: booking._id
                });

                if (!existing) {
                    const amount = Number(booking.total_amount || 0);
                    const platformFee = amount * (feePercent / 100);
                    const paymentMethod = booking.payment_method || 'walkin';
                    const isAutoCollect = ['online', 'qr', 'card', 'gcash', 'maya'].includes(paymentMethod);
                    const date = new Date(booking.check_out_at || booking.updated_at || booking.created_at || Date.now());
                    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                    await Earnings.create({
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
                        booking_date: date,
                        month: monthStr
                    });
                }
            }

            // Historical monthly aggregation across all records
            const monthlyAggregation = await Earnings.aggregate([
                {
                    $group: {
                        _id: "$month",
                        grossVolume: { $sum: "$total_amount" },
                        platformFee: { $sum: "$platform_fee" },
                        collectedFee: {
                            $sum: {
                                $cond: [{ $eq: ["$fee_status", "collected"] }, "$platform_fee", 0]
                            }
                        },
                        pendingFee: {
                            $sum: {
                                $cond: [{ $eq: ["$fee_status", "pending"] }, "$platform_fee", 0]
                            }
                        },
                        ownerEarnings: { $sum: "$owner_earnings" },
                        transactionCount: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);

            // Payment method breakdown
            const paymentMethodAggregation = await Earnings.aggregate([
                {
                    $group: {
                        _id: "$payment_method",
                        count: { $sum: 1 },
                        volume: { $sum: "$total_amount" },
                        fees: { $sum: "$platform_fee" }
                    }
                },
                { $sort: { "volume": -1 } }
            ]);

            // All-time totals across platform
            const overallTotals = await Earnings.aggregate([
                {
                    $group: {
                        _id: null,
                        totalGross: { $sum: "$total_amount" },
                        totalPlatformFee: { $sum: "$platform_fee" },
                        totalCollected: {
                            $sum: {
                                $cond: [{ $eq: ["$fee_status", "collected"] }, "$platform_fee", 0]
                            }
                        },
                        totalPending: {
                            $sum: {
                                $cond: [{ $eq: ["$fee_status", "pending"] }, "$platform_fee", 0]
                            }
                        },
                        totalOwnerPayouts: { $sum: "$owner_earnings" },
                        totalTransactions: { $sum: 1 }
                    }
                }
            ]);

            const totals = overallTotals[0] || {
                totalGross: 0,
                totalPlatformFee: 0,
                totalCollected: 0,
                totalPending: 0,
                totalOwnerPayouts: 0,
                totalTransactions: 0
            };

            // Current Month Run-Rate and Projections
            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const daysElapsed = Math.max(1, now.getDate());

            const currentMonthRecord = monthlyAggregation.find(m => m._id === currentMonthKey) || {
                grossVolume: 0,
                platformFee: 0,
                collectedFee: 0,
                pendingFee: 0,
                ownerEarnings: 0,
                transactionCount: 0
            };

            const dailyRunRate = currentMonthRecord.grossVolume / daysElapsed;
            const projectedGross = Number((dailyRunRate * daysInMonth).toFixed(2));
            const projectedPlatformFee = Number(((dailyRunRate * daysInMonth) * (feePercent / 100)).toFixed(2));
            const projectedOwnerEarnings = Number((projectedGross - projectedPlatformFee).toFixed(2));

            const collectionEfficiency = totals.totalPlatformFee > 0
                ? Number(((totals.totalCollected / totals.totalPlatformFee) * 100).toFixed(1))
                : 100;

            return res.status(200).json({
                success: true,
                data: {
                    monthlyTrends: monthlyAggregation.map(m => {
                        const [yr, mo] = String(m._id || '2026-01').split('-');
                        const dateObj = new Date(parseInt(yr), parseInt(mo) - 1);
                        return {
                            month: m._id,
                            label: dateObj.toLocaleString('default', { month: 'short', year: 'numeric' }),
                            grossVolume: Number(m.grossVolume.toFixed(2)),
                            platformFee: Number(m.platformFee.toFixed(2)),
                            collectedFee: Number(m.collectedFee.toFixed(2)),
                            pendingFee: Number(m.pendingFee.toFixed(2)),
                            ownerEarnings: Number(m.ownerEarnings.toFixed(2)),
                            transactionCount: m.transactionCount
                        };
                    }),
                    paymentMethodBreakdown: paymentMethodAggregation.map(p => ({
                        method: p._id || 'unknown',
                        count: p.count,
                        volume: Number(p.volume.toFixed(2)),
                        fees: Number(p.fees.toFixed(2))
                    })),
                    totals: {
                        totalGross: Number(totals.totalGross.toFixed(2)),
                        totalPlatformFee: Number(totals.totalPlatformFee.toFixed(2)),
                        totalCollected: Number(totals.totalCollected.toFixed(2)),
                        totalPending: Number(totals.totalPending.toFixed(2)),
                        totalOwnerPayouts: Number(totals.totalOwnerPayouts.toFixed(2)),
                        totalTransactions: totals.totalTransactions,
                        collectionEfficiency
                    },
                    projections: {
                        month: currentMonthKey,
                        daysElapsed,
                        daysInMonth,
                        currentGross: Number(currentMonthRecord.grossVolume.toFixed(2)),
                        currentFee: Number(currentMonthRecord.platformFee.toFixed(2)),
                        dailyRunRate: Number(dailyRunRate.toFixed(2)),
                        projectedGross,
                        projectedPlatformFee,
                        projectedOwnerEarnings
                    }
                }
            });
        } catch (error) {
            console.error('getEarningsAnalytics error:', error);
            next(error);
        }
    };
}

module.exports = new EarningController();