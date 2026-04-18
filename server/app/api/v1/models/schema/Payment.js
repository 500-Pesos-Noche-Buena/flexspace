const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    method: { type: String, enum: ['cash', 'gcash', 'qrph'], required: true },
    amount_total: { type: Number, required: true }, // Total price
    amount_received: { type: Number, required: true }, // How much they gave
    change: { type: Number, default: 0 }, // (amount_received - amount_total)
    reference_number: { type: String }, // For GCash/QRPh
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);