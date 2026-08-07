const mongoose = require('mongoose');
const { logsActivity } = require('@/api/v1/utils/logsActivity');

const paymentSchema = new mongoose.Schema({
    // For bookings
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    // For POS orders
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    // Which type of payment
    payment_type: { 
        type: String, 
        enum: ['booking', 'pos_order', 'online'], 
        default: 'booking' 
    },
    method: { type: String, enum: ['cash', 'qr', 'gcash', 'qrph', 'online', 'pay_later'], required: true },
    amount_total: { type: Number, required: true },
    amount_original: { type: Number, default: 0 },
    discount_applied: { type: Number, default: 0 },
    amount_received: { type: Number, required: true },
    change: { type: Number, default: 0 },
    reference_number: { type: String },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

paymentSchema.plugin(logsActivity, { modelName: 'Payment' });

module.exports = mongoose.model('Payment', paymentSchema);