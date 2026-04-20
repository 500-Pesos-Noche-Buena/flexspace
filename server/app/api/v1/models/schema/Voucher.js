const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discount_amount: { type: Number, required: true },
    
    // Link to specific space (null = can be used in any space)
    space_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', default: null },
    
    // TYPE OF VOUCHER
    type: { 
        type: String, 
        enum: ['global', 'space_specific', 'user_specific'], 
        default: 'global' 
    },
    
    // For user-specific vouchers (from points exchange)
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // REDEMPTION tracking (when user exchanges points for voucher)
    redemption_limit: { type: Number, default: null }, // Max number of users who can redeem this voucher
    redemption_count: { type: Number, default: 0 },    // How many users have redeemed this voucher
    redeemed_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Who redeemed it
    
    // USAGE tracking (when user actually applies the voucher at checkout)
    usage_limit: { type: Number, default: 1 }, // Max times a single user can USE this voucher (default 1)
    usage_count: { type: Number, default: 0 }, // How many times THIS SPECIFIC USER has used it
    
    // For multi-use vouchers (user can use multiple times)
    max_uses_per_user: { type: Number, default: 1 }, // How many times a user can use this voucher
    
    // When the user actually used it
    used_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    used_at: { type: Date },
    
    // Requirements
    min_spend: { type: Number, default: 0 },
    expiry_date: { type: Date, required: true }
}, { timestamps: true });

// Index for faster queries
voucherSchema.index({ code: 1 });
voucherSchema.index({ user_id: 1, is_used: 1 });
voucherSchema.index({ expiry_date: 1 });

module.exports = mongoose.model('Voucher', voucherSchema);