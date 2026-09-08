const { Space, Settings, Order, Earnings } = require('@/api/v1/models');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const ApiError = require('@/api/v1/utils/ApiError');
const money = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

class EarningsController {
    // The screen and CSV use the same ledger and filters. Booking-linked orders
    // are detail lines in the booking settlement, never another revenue entry.
    report = async req => {
        const scope = req.user?.role === 'admin'
            ? { space_id: { $in: (await Space.find({}).select('_id')).map(s => s._id) } }
            : await require('@/api/v1/services/bookingOrderService').scope(req);
        const { period = 'daily', dateFrom, dateTo, search = '' } = req.query;
        let start = new Date();
        let end = new Date();
        if (dateFrom || dateTo) {
            if (!dateFrom || !dateTo || !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
                throw new ApiError(400, 'Choose a valid start and end date.');
            }
            start = new Date(`${dateFrom}T00:00:00`);
            end = new Date(`${dateTo}T23:59:59.999`);
        } else {
            if (period === 'weekly') start.setDate(start.getDate() - 7);
            else if (period === 'monthly') start.setMonth(start.getMonth() - 1);
            else if (period === 'yearly') start.setFullYear(start.getFullYear() - 1);
            else if (period !== 'daily') throw new ApiError(400, 'Invalid reporting period.');
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        }
        if (!Number.isFinite(+start) || !Number.isFinite(+end) || start > end) throw new ApiError(400, 'Invalid date range.');
        const setting = await Settings.findOne({ key: 'platform_fee_percent' }).lean();
        const feePercent = Number(setting?.value ?? 3);
        const earnings = await Earnings.find({ ...scope, booking_date: { $gte: start, $lte: end } })
            .populate('space_id', 'name')
            .populate({ path: 'booking_id', populate: [{ path: 'user_id', select: 'name' }, { path: 'room_id', select: 'name' }] })
            .sort({ booking_date: -1, _id: -1 }).lean();
        const orders = earnings.length ? await Order.find({ ...scope, $or: [
            { booking_id: { $in: earnings.filter(e => e.booking_id).map(e => e.booking_id._id) } },
            { order_number: { $in: earnings.filter(e => !e.booking_id).map(e => e.order_number) } }
        ] }).populate('user_id', 'name').lean() : [];
        const needle = String(search).trim().toLowerCase();
        const transactions = earnings.flatMap(e => {
            const booking = e.booking_id;
            const order = !booking && orders.find(o => o.order_number === e.order_number);
            if (!booking && (order?.booking_id || order?.settlement_type === 'booking' || (order && (order.payment_status !== 'paid' || ['cancelled', 'rejected'].includes(order.status))))) return [];
            const linked = booking ? (booking.billing_orders?.length ? booking.billing_orders : orders.filter(o => String(o.booking_id) === String(booking._id))) : [];
            const included = linked.filter(o => !['cancelled', 'rejected'].includes(o.status));
            const consumableTotal = money(included.reduce((sum, o) => sum + Number(o.total || 0), 0));
            const covered = Math.min(consumableTotal, Number(booking?.consumable_allowance || 0));
            const discount = Number(booking?.voucher_discount || order?.discount_amount || 0);
            const transaction = {
                id: e._id, reference: booking?.ticket_number || e.order_number,
                guest: booking?.guest_name || booking?.user_id?.name || order?.customer_name || order?.user_id?.name || 'Guest',
                space: e.space_id?.name || 'N/A', room: booking?.room_id?.name || '',
                amount: money(e.total_amount), originalAmount: money(e.total_amount + discount), discount,
                platformFee: money(e.platform_fee), netEarnings: money(e.owner_earnings),
                type: booking ? (included.length ? 'Booking + consumables' : 'Booking') : 'POS',
                source: booking ? 'booking' : 'pos', date: e.booking_date || e.createdAt,
                hasVoucher: Boolean(booking?.voucher_applied), linked_orders: included,
                roomCharge: Number(booking?.room_charge || 0),
                roomPortion: booking?.promo_snapshot?.room_portion ?? null,
                consumableTotal, consumableCovered: money(covered), consumableExcess: money(consumableTotal - covered)
            };
            const searchable = [transaction.reference, e.order_number, transaction.guest, transaction.space, transaction.room,
                ...included.map(o => o.order_number), ...included.flatMap(o => (o.items || []).map(i => i.name))].join(' ').toLowerCase();
            return !needle || searchable.includes(needle) ? [transaction] : [];
        });
        const sum = (rows, key) => money(rows.reduce((total, row) => total + Number(row[key] || 0), 0));
        const bookings = transactions.filter(t => t.source === 'booking');
        const pos = transactions.filter(t => t.source === 'pos');
        return {
            totalRevenue: sum(transactions, 'amount'), totalNetEarnings: sum(transactions, 'netEarnings'),
            totalPlatformFee: sum(transactions, 'platformFee'), feePercent,
            transactionCount: transactions.length, total: transactions.length,
            orderCount: transactions.length + bookings.reduce((sum, b) => sum + b.linked_orders.length, 0),
            totalDiscountGiven: sum(transactions, 'discount'), totalVoucherDiscount: sum(bookings, 'discount'),
            bookingsWithVouchers: bookings.filter(t => t.hasVoucher).length,
            breakdown: {
                bookings: { revenue: sum(bookings, 'amount'), netEarnings: sum(bookings, 'netEarnings'),
                    platformFee: sum(bookings, 'platformFee'), count: bookings.length, discount: sum(bookings, 'discount') },
                pos_orders: { revenue: sum(pos, 'amount'), count: pos.length, discount: sum(pos, 'discount') },
                consumables: { count: bookings.reduce((sum, b) => sum + b.linked_orders.length, 0),
                    total: sum(bookings, 'consumableTotal'), covered: sum(bookings, 'consumableCovered'), excess: sum(bookings, 'consumableExcess') }
            }, transactions
        };
    };

    index = async (req, res, next) => {
        try {
            const data = await this.report(req);
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 10));
            if (req.query.export_all !== 'true') data.transactions = data.transactions.slice((page - 1) * limit, page * limit);
            return res.status(HTTP_STATUS.OK).json({ success: true, data });
        } catch (error) { next(error); }
    };

    exportCSV = async (req, res, next) => {
        try {
            const data = await this.report(req);
            const cell = value => `"${String(value ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""')}"`;
            const rows = [['Reference', 'Guest', 'Space', 'Room', 'Original Amount', 'Discount', 'Net Amount', 'Type', 'Date', 'Consumables', 'Covered', 'Excess', 'Linked Orders'],
                ...data.transactions.map(t => [t.reference, t.guest, t.space, t.room, t.originalAmount, t.discount, t.amount,
                    t.type, new Date(t.date).toISOString(), t.consumableTotal, t.consumableCovered, t.consumableExcess,
                    t.linked_orders.map(o => o.order_number).join('; ')])];
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=earnings_${Date.now()}.csv`);
            return res.status(HTTP_STATUS.OK).send(rows.map(row => row.map(cell).join(',')).join('\r\n'));
        } catch (error) { next(error); }
    };
}
module.exports = new EarningsController();
