const { Booking, Settings, Earnings } = require('@/api/v1/models');

class EarningsController {

    index = async (req, res, next) => {
        try {
            const { month } = req.query;

            // Get all unique months that have earnings data
            const allBookings = await Booking.find({
                status: 'completed'
            }).populate({
                path: 'space_id',
                populate: { path: 'user_id' }
            });

            // Extract unique months from all bookings
            const monthSet = new Set();
            allBookings.forEach(booking => {
                const date = new Date(booking.check_out_at || booking.updated_at || booking.created_at);
                const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthSet.add(yearMonth);
            });

            // Convert to array and sort chronologically
            const availableMonths = Array.from(monthSet)
                .sort()
                .map(monthValue => {
                    const [year, monthNum] = monthValue.split('-');
                    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                    const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                    return {
                        value: monthValue,
                        label: label
                    };
                });

            // If no month selected, use the latest available month
            let selectedMonth = month;
            if (!selectedMonth && availableMonths.length > 0) {
                selectedMonth = availableMonths[availableMonths.length - 1].value;
            }

            // If still no month, return empty response
            if (!selectedMonth) {
                return res.json({
                    success: true,
                    availableMonths: [],
                    data: {
                        totalAdminCut: 0,
                        feePercent: 0,
                        ownerSummaries: []
                    }
                });
            }

            const [y, m] = selectedMonth.split('-').map(Number);

            const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
            const endDate = new Date(y, m, 0, 23, 59, 59, 999);

            const feeSetting = await Settings.findOne({ key: 'platform_fee_percent' });
            const feePercent = Number(feeSetting?.value || 2);

            const bookings = await Booking.find({ status: 'completed' })
                .populate({
                    path: 'space_id',
                    populate: { path: 'user_id' }
                });

            const filtered = bookings.filter(b => {
                const date = new Date(b.check_out_at || b.updated_at || b.created_at);
                return date >= startDate && date <= endDate;
            });

            const ownerMap = {};

            filtered.forEach(b => {
                if (!b.space_id?.user_id) return;

                const ownerId = b.space_id.user_id._id.toString();
                const ownerName = b.space_id.user_id.name;
                const spaceName = b.space_id.name;

                const amount = Number(b.total_amount || 0);
                const fee = amount * (feePercent / 100);

                if (!ownerMap[ownerId]) {
                    ownerMap[ownerId] = {
                        _id: ownerId,
                        ownerName,
                        totalFee: 0,
                        totalBookings: 0,
                        spaces: {}
                    };
                }

                ownerMap[ownerId].totalFee += fee;
                ownerMap[ownerId].totalBookings += 1;

                ownerMap[ownerId].spaces[spaceName] =
                    (ownerMap[ownerId].spaces[spaceName] || 0) + fee;
            });

            const ownerSummaries = await Promise.all(
                Object.values(ownerMap).map(async (o) => {

                    const record = await Earnings.findOne({
                        owner_id: o._id,
                        month: selectedMonth
                    });

                    const collected = record?.collected_fee || 0;
                    const pending = o.totalFee - collected;

                    return {
                        _id: o._id,
                        ownerName: o.ownerName,
                        totalFee: Number(o.totalFee.toFixed(2)),
                        totalBookings: o.totalBookings,

                        collectedFee: Number(collected.toFixed(2)),
                        pendingFee: Number(pending.toFixed(2)),

                        status: collected >= o.totalFee
                            ? 'collected'
                            : collected > 0
                                ? 'partially_collected'
                                : 'pending',

                        spaces: Object.entries(o.spaces).map(([name, fee]) => ({
                            name,
                            fee: Number(fee.toFixed(2))
                        }))
                    };
                })
            );

            const totalAdminCut = Number(
                ownerSummaries.reduce((a, b) => a + b.totalFee, 0).toFixed(2)
            );

            return res.json({
                success: true,
                availableMonths: availableMonths,
                data: {
                    totalAdminCut,
                    feePercent,
                    ownerSummaries
                }
            });

        } catch (err) {
            next(err);
        }
    };

    collect = async (req, res, next) => {
        try {
            const { owner_id, month, amount } = req.body;

            let record = await Earnings.findOne({ owner_id, month });

            if (!record) {
                record = new Earnings({
                    owner_id,
                    month,
                    total_fee: amount,
                    collected_fee: amount,
                    status: 'collected',
                    last_collected_at: new Date()
                });
            } else {
                record.collected_fee += amount;

                record.status =
                    record.collected_fee >= record.total_fee
                        ? 'collected'
                        : 'partially_collected';

                record.last_collected_at = new Date();
            }

            await record.save();

            return res.json({
                success: true,
                message: "Fee collected successfully",
                data: record
            });

        } catch (err) {
            next(err);
        }
    };
}

module.exports = new EarningsController();