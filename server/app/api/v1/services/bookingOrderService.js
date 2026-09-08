const mongoose = require('mongoose');
const { Booking, Order, Product, Space, User, Payment, Earnings } = require('@/api/v1/models');
const Settings = require('@/api/v1/models/schema/Settings');
const billing = require('./bookingBillingService');
const ApiError = require('@/api/v1/utils/ApiError');
const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const fail = message => { throw new ApiError(400, message); };

async function scope(req) {
    const userId = req.user?.sub || req.user?._id || req.user?.id;
    if (req.user?.role === 'staff') {
        const staff = await User.findById(userId).select('space_id parent_id');
        if (!staff?.space_id || !staff?.parent_id) throw new ApiError(403, 'No branch assigned.');
        return { space_id: staff.space_id };
    }
    const spaces = await Space.find({ user_id: userId }).select('_id');
    return { space_id: { $in: spaces.map(s => s._id) } };
}

function priceItems(products, items, discountType, discountValue = 0) {
    if (!Array.isArray(items) || !items.length) fail('Add at least one product.');
    const quantities = new Map();
    for (const item of items) {
        if (!mongoose.isValidObjectId(item.product_id) || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
            fail('Each product needs a valid ID and positive whole quantity.');
        }
        const id = String(item.product_id);
        quantities.set(id, (quantities.get(id) || 0) + item.quantity);
    }
    const priced = [...quantities].map(([id, quantity]) => {
        const product = products.find(p => String(p._id) === id);
        if (!product || !product.is_available) fail('A product is unavailable in this branch.');
        if (!Number.isFinite(product.price) || product.price < 0) fail('Invalid product price.');
        if (!Number.isSafeInteger(quantity) || product.stock < quantity) fail(`Insufficient stock for ${product.name}.`);
        return { product_id: product._id, name: product.name, quantity, price: money(product.price) };
    });
    const subtotal = money(priced.reduce((sum, item) => sum + item.price * item.quantity, 0));
    const value = Number(discountValue);
    if (!Number.isFinite(value) || value < 0 || ![null, undefined, 'percentage', 'fixed'].includes(discountType) ||
        (discountType === 'percentage' && value > 100) || (!discountType && value)) fail('Invalid discount.');
    const discount = money(discountType === 'percentage' ? subtotal * value / 100 : value);
    if (discount > subtotal) fail('Discount exceeds the order subtotal.');
    return { items: priced, subtotal, tax: 0, discount_type: discountType || null,
        discount_value: value, discount_amount: discount, total: money(subtotal - discount) };
}

async function activeSessions(req) {
    const filter = await scope(req);
    if (req.query.space_id) {
        // Check the requested branch against the allowed IDs without trusting the client.
        const allowed = filter.space_id?.$in || [filter.space_id];
        if (!allowed.some(id => String(id) === String(req.query.space_id))) throw new ApiError(403, 'Unauthorized branch.');
        filter.space_id = req.query.space_id;
    }
    const bookings = await Booking.find({ ...filter, status: 'active' })
        .populate('room_id', 'name').populate('space_id', 'name')
        .populate('user_id', 'name').sort({ check_in_at: -1 }).lean();
    for (const booking of bookings) {
        Object.assign(booking, await billing.calculateConsumables(booking));
    }
    return bookings;
}

async function addOrder(req) {
    const filter = await scope(req);
    const { booking_id, request_key, items, discount_type, discount_value } = req.body;
    if (!mongoose.isValidObjectId(booking_id)) fail('Select an active booking.');
    if (typeof request_key !== 'string' || !/^[\w-]{8,100}$/.test(request_key)) fail('A valid order request key is required.');
    const actor = req.user?.sub || req.user?._id || req.user?.id;
    let result;
    await mongoose.connection.transaction(async session => {
        const booking = await Booking.findOne({ _id: booking_id, ...filter }).session(session).populate('user_id', 'name');
        if (!booking) throw new ApiError(404, 'Booking not found.');
        const existing = await Order.findOne({ booking_id, request_key }).session(session);
        if (existing) { result = existing; return; }
        if (booking.status !== 'active') fail('Only checked-in, active sessions can receive consumables.');
        if (req.body.space_id && String(req.body.space_id) !== String(booking.space_id)) fail('Booking and products must belong to the same branch.');
        if (!Array.isArray(items) || !items.length || items.some(i => !mongoose.isValidObjectId(i.product_id))) fail('Add valid products.');
        const products = await Product.find({ space_id: booking.space_id,
            _id: { $in: items.map(i => i.product_id) } }).session(session).lean();
        const priced = priceItems(products, items, discount_type, discount_value);
        // Every order/status/freeze operation writes this booking, serializing concurrent changes.
        await Booking.updateOne({ _id: booking._id }, { $inc: { billing_revision: 1 } }, { session });
        for (const item of priced.items) {
            const stock = await Product.updateOne({ _id: item.product_id, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } }, { session });
            if (!stock.modifiedCount) fail(`Insufficient stock for ${item.name}.`);
        }
        const [order] = await Order.create([{
            ...priced, booking_id, request_key, space_id: booking.space_id,
            settlement_type: 'booking', payment_method: 'booking', amount_received: 0,
            customer_name: booking.guest_name || booking.user_id?.name || 'Booking customer', user_id: booking.user_id?._id || booking.user_id,
            order_type: 'pos', status: 'confirmed', payment_status: 'unpaid', processed_by: actor
        }], { session });
        const summary = await billing.calculateConsumables(booking, session);
        await Booking.updateOne({ _id: booking._id }, { $set: {
            consumable_total: summary.consumable_total, consumable_covered: summary.consumable_covered,
            consumable_excess: summary.consumable_excess
        } }, { session });
        result = order;
    });
    return result;
}

async function updateOrder(orderId, status) {
    return mongoose.connection.transaction(async session => {
        const order = await Order.findById(orderId).session(session);
        const booking = await Booking.findById(order.booking_id).session(session);
        if (['cancelled', 'rejected'].includes(order.status)) fail('A cancelled order cannot be reopened. Create a new order.');
        if (!['confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'].includes(status)) fail('Invalid booking order status.');
        const cancelling = ['cancelled', 'rejected'].includes(status);
        if (!booking || (cancelling && booking.status !== 'active')) fail('The bill is frozen. Consumables cannot be removed after checkout starts.');
        await Booking.updateOne({ _id: booking._id }, { $inc: { billing_revision: 1 } }, { session });
        if (cancelling) {
            for (const item of order.items) await Product.updateOne({ _id: item.product_id },
                { $inc: { stock: item.quantity } }, { session });
        }
        order.status = status;
        await order.save({ session });
        if (booking.status === 'active') {
            const summary = await billing.calculateConsumables(booking, session);
            await Booking.updateOne({ _id: booking._id }, { $set: {
                consumable_total: summary.consumable_total, consumable_covered: summary.consumable_covered,
                consumable_excess: summary.consumable_excess
            } }, { session });
        }
        return order;
    });
}

async function freeze(req) {
    const filter = await scope(req);
    return mongoose.connection.transaction(async session => {
        const booking = await Booking.findOne({ _id: req.params.id, ...filter }).session(session)
            .populate('space_id').populate('room_id').populate('user_id');
        if (!booking) throw new ApiError(404, 'Booking not found.');
        if (!['active', 'pending_payment'].includes(booking.status)) fail('Only an active session can be checked out.');
        if (booking.status === 'pending_payment' && booking.amount_due != null) {
            return { booking: booking.toObject(), total_amount: booking.total_amount };
        }
        await Booking.updateOne({ _id: booking._id }, { $inc: { billing_revision: 1 } }, { session });
        booking.billing_revision = (booking.billing_revision || 0) + 1;
        const bill = await billing.calculateBookingBill(booking, { persist: true, checkout: true, session });
        return { booking: booking.toObject(), ...bill, total_amount: bill.final_amount };
    });
}

async function applyVoucher(req) {
    const filter = await scope(req);
    const code = String(req.body.voucherCode || '').trim().toUpperCase();
    return mongoose.connection.transaction(async session => {
        const booking = await Booking.findOne({ _id: req.params.id, ...filter }).session(session);
        if (!booking || booking.status !== 'pending_payment') fail('Vouchers require a frozen, unpaid booking.');
        if (booking.voucher_applied) fail('A voucher is already applied.');
        const Voucher = require('@/api/v1/models/schema/Voucher');
        const voucher = await Voucher.findOne({ code }).session(session);
        if (!voucher || voucher.expiry_date < new Date()) fail('Voucher is invalid or expired.');
        if (voucher.space_id && String(voucher.space_id) !== String(booking.space_id)) fail('Voucher belongs to another branch.');
        if (voucher.type === 'user_specific' && (!booking.user_id || String(voucher.user_id) !== String(booking.user_id))) fail('Voucher belongs to another customer.');
        const limit = voucher.type === 'user_specific' ? voucher.max_uses_per_user : voucher.usage_limit;
        if (limit != null && voucher.usage_count >= limit) fail('Voucher usage limit reached.');
        if (booking.total_amount < voucher.min_spend) fail('Booking does not meet voucher minimum spend.');
        if (!Number.isFinite(voucher.discount_amount) || voucher.discount_amount < 0) fail('Invalid voucher discount.');
        const discount = Math.min(booking.total_amount, voucher.discount_amount);
        booking.total_amount = money(booking.total_amount - discount);
        booking.amount_due = money(Math.max(0, booking.total_amount - booking.amount_paid));
        booking.voucher_applied = code;
        booking.voucher_discount = discount;
        await Booking.updateOne({ _id: booking._id }, { $inc: { billing_revision: 1 }, $set: {
            total_amount: booking.total_amount, amount_due: booking.amount_due,
            voucher_applied: code, voucher_discount: discount
        } }, { session });
        await Voucher.updateOne({ _id: voucher._id }, { $inc: { usage_count: 1 },
            $set: { used_by: booking.user_id, used_at: new Date() } }, { session });
        await booking.populate(['room_id', 'space_id', 'user_id']);
        return { booking: booking.toObject(), total_amount: booking.amount_due, discount_amount: discount };
    });
}

async function settle(req) {
    const filter = await scope(req);
    const { payment_method, amount_received } = req.body;
    if (!['cash', 'qr', 'gcash'].includes(payment_method)) fail('Choose cash or a verified QR payment.');
    const actor = req.user?.sub || req.user?._id || req.user?.id;
    return mongoose.connection.transaction(async session => {
        const booking = await Booking.findOne({ _id: req.params.id, ...filter }).session(session)
            .populate('space_id').populate('room_id').populate('user_id');
        if (!booking) throw new ApiError(404, 'Booking not found.');
        if (booking.status === 'completed' && booking.settlement_payment_id) {
            const payment = await Payment.findById(booking.settlement_payment_id).session(session).lean();
            return { ...booking.toObject(), payment };
        }
        if (booking.status !== 'pending_payment') fail('Freeze the session before collecting payment.');
        await Booking.updateOne({ _id: booking._id }, { $inc: { billing_revision: 1 } }, { session });
        const payments = await Payment.find({ booking_id: booking._id, status: 'completed' }).session(session).lean();
        const paid = money(payments.reduce((sum, p) => sum + p.amount_total, 0));
        const due = money(Math.max(0, booking.total_amount - paid));
        const received = Number(amount_received);
        if (payment_method === 'cash' && (!Number.isFinite(received) || received < due || received < 0)) fail('Cash received is less than the amount due.');
        const [payment] = await Payment.create([{
            booking_id: booking._id, payment_type: 'booking', method: payment_method,
            amount_total: due, amount_original: booking.total_amount + booking.voucher_discount,
            discount_applied: booking.voucher_discount, amount_received: payment_method === 'cash' ? received : due,
            change: payment_method === 'cash' ? money(received - due) : 0,
            reference_number: `BOOKING-${booking._id}`, status: 'completed', processed_by: actor
        }], { session });
        const values = { status: 'completed', payment_status: 'paid', payment_id: payment._id,
            settlement_payment_id: payment._id, payment_method, amount_paid: money(paid + due), amount_due: 0 };
        // Earnings are written explicitly in this transaction; avoid the legacy pre-save side effect.
        await Booking.updateOne({ _id: booking._id }, { $set: values }, { session });
        await Order.updateMany({ booking_id: booking._id, status: { $nin: ['cancelled', 'rejected'] } },
            { $set: { payment_status: 'paid', settlement_payment_id: payment._id } }, { session });
        const existing = await Earnings.findOne({ booking_id: booking._id }).session(session);
        if (!existing && booking.total_amount > 0) {
            const setting = await Settings.findOne({ key: 'platform_fee_percent' }).session(session);
            const percent = Number(setting?.value ?? 3);
            const fee = money(booking.total_amount * percent / 100);
            const date = booking.start_time || booking.created_at;
            await Earnings.create([{
                booking_id: booking._id, owner_id: booking.space_id.user_id, space_id: booking.space_id._id,
                order_number: `BOOKING-${booking._id}`, total_amount: booking.total_amount,
                platform_fee_percent: percent, platform_fee: fee, owner_earnings: money(booking.total_amount - fee),
                payment_method, booking_date: date, month: new Date(date).toISOString().slice(0, 7),
                notes: 'Room and consumables settled together'
            }], { session });
        }
        if (booking.user_id && booking.total_amount > 0) {
            const ratio = require('./rewardService').POINT_RATIO;
            await User.updateOne({ _id: booking.user_id._id }, { $inc: { points: Math.floor(booking.total_amount / ratio) } }, { session });
        }
        return { ...booking.toObject(), ...values, payment: payment.toObject() };
    });
}

module.exports = { scope, activeSessions, addOrder, updateOrder, freeze, settle, applyVoucher, priceItems };
