const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    method: { type: String, enum: ['cash', 'qr', 'gcash', 'qrph'], required: true },
    amount_total: { type: Number, required: true }, // Total price after discount
    amount_original: { type: Number, default: 0 }, // Original price before discount (optional)
    discount_applied: { type: Number, default: 0 }, // Discount amount (optional)
    amount_received: { type: Number, required: true }, // How much they gave
    change: { type: Number, default: 0 },
    reference_number: { type: String },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    // Optional: track who processed the payment
    processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);