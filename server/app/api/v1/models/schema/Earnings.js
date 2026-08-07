// @/api/v1/models/schema/Earnings.js
const mongoose = require('mongoose');
const { logsActivity } = require('@/api/v1/utils/logsActivity');

const earningsSchema = new mongoose.Schema({
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    space_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
    order_number: { type: String, required: true },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    
    total_amount: { type: Number, required: true },
    platform_fee_percent: { type: Number, required: true, default: 3 },
    platform_fee: { type: Number, required: true },
    owner_earnings: { type: Number, required: true },
    
    payment_method: { 
        type: String, 
        enum: ['cash', 'qr', 'online', 'card', 'gcash', 'maya', 'bank_transfer', 'paypal', 'walkin', 'pay_later', 'pay_later_settled'],
        default: 'cash'
    },
    
    payment_intent_id: { type: String },
    auto_collected: { type: Boolean, default: false },
    
    fee_status: {
        type: String,
        enum: ['pending', 'collected', 'processing'],
        default: 'pending'
    },
    
    collected_at: { type: Date },
    collected_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    payment_link: { type: String },
    payment_link_expires_at: { type: Date },
    
    booking_date: { type: Date, required: true },
    month: { type: String, required: true },
    
    notes: { type: String },
    
}, { timestamps: true });

earningsSchema.index({ owner_id: 1, month: 1 });
earningsSchema.index({ space_id: 1, month: 1 });
earningsSchema.index({ fee_status: 1, payment_method: 1 });
earningsSchema.index({ order_number: 1 });

earningsSchema.plugin(logsActivity, { modelName: 'Earnings' });

module.exports = mongoose.model('Earnings', earningsSchema);