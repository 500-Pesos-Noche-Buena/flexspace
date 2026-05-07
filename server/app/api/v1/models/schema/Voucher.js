const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discount_amount: { type: Number, required: true },
    
    space_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', default: null },
    
    type: { 
        type: String, 
        enum: ['global', 'space_specific', 'user_specific'], 
        default: 'global' 
    },
    
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    redemption_limit: { type: Number, default: null },
    redemption_count: { type: Number, default: 0 },
    redeemed_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    usage_limit: { type: Number, default: 1 },
    usage_count: { type: Number, default: 0 },
    
    max_uses_per_user: { type: Number, default: 1 },
    
    used_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    used_at: { type: Date },
    
    min_spend: { type: Number, default: 0 },
    expiry_date: { type: Date, required: true }
}, { timestamps: true });

voucherSchema.index({ user_id: 1, is_used: 1 });
voucherSchema.index({ expiry_date: 1 });

module.exports = mongoose.model('Voucher', voucherSchema);