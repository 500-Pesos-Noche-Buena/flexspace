const mongoose = require('mongoose');
const { logsActivity } = require('@/api/v1/utils/logsActivity');

const bookingSchema = new mongoose.Schema({
    booking_type: { 
        type: String, 
        enum: ['online', 'walkin'], 
        default: 'online',
        required: true 
    },
    
    // Bookable item: either a Space (open area) OR a Room (private room)
    bookable_type: { 
        type: String, 
        enum: ['space', 'room'], 
        required: true,
        default: 'space'
    },
    
    // One of these will be used based on bookable_type
    space_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Space', 
        default: null 
    },
    room_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Room', 
        default: null 
    },
    
    // User info
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    },
    guest_name: { 
        type: String, 
        default: null 
    },
    guest_email: { 
        type: String, 
        default: null 
    },
    guest_phone: { 
        type: String, 
        default: null 
    },
    
    // Booking details
    ticket_number: { 
        type: String, 
        default: null 
    },
    qr_code_token: { 
        type: String, 
        default: null 
    },
    is_open_time: { 
        type: Boolean, 
        default: false 
    },
    start_time: { 
        type: Date, 
        default: null 
    },
    end_time: { 
        type: Date, 
        default: null 
    },
    check_in_at: { 
        type: Date, 
        default: null 
    },
    check_out_at: { 
        type: Date, 
        default: null 
    },
    
    // Statuses
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'rejected', 'pending_payment', 'no_show'], 
        default: 'pending' 
    },
    payment_status: { 
        type: String, 
        enum: ['unpaid', 'partial', 'paid', 'refunded'], 
        default: 'unpaid' 
    },
    
    // Pricing
    rate_per_hour: { 
        type: Number, 
        default: 0 
    },
    total_hours: { 
        type: Number, 
        default: 0 
    },
    total_amount: { 
        type: Number, 
        default: 0 
    },
    
    // Payment
    payment_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Payment' 
    },
    payment_method: { 
        type: String, 
        enum: ['cash', 'card', 'gcash', 'paymaya', 'bank_transfer', 'points'],
        default: null 
    },
    
    // Notes & Vouchers
    notes: { 
        type: String, 
        default: null 
    },
    voucher_applied: { 
        type: String, 
        default: null 
    },
    voucher_discount: { 
        type: Number, 
        default: 0 
    },
    
    // Staff who handled walk-in booking (for POS/front desk)
    handled_by: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    }
}, { 
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at' 
    } 
});

// Indexes for faster queries
bookingSchema.index({ user_id: 1, status: 1 });
bookingSchema.index({ space_id: 1, start_time: 1 });
bookingSchema.index({ room_id: 1, start_time: 1 });
bookingSchema.index({ qr_code_token: 1 });
bookingSchema.index({ ticket_number: 1 });

// Virtual: Get the bookable item name
bookingSchema.virtual('bookable_name').get(function() {
    if (this.bookable_type === 'room' && this.room_id) {
        return this.room_id.name;
    }
    if (this.space_id) {
        return this.space_id.name;
    }
    return 'Unknown';
});

// Virtual: Get the bookable item image
bookingSchema.virtual('bookable_image').get(function() {
    if (this.bookable_type === 'room' && this.room_id) {
        return this.room_id.image || this.room_id.images?.[0];
    }
    if (this.space_id) {
        return this.space_id.image;
    }
    return null;
});

// Method: Calculate total based on actual time
bookingSchema.methods.calculateTotal = function() {
    if (!this.check_in_at) return this.total_amount;
    
    const now = this.check_out_at || new Date();
    const hours = Math.max(0.5, Math.ceil((now - this.check_in_at) / (1000 * 60 * 60) * 2) / 2);
    this.total_hours = hours;
    this.total_amount = hours * this.rate_per_hour;
    return this.total_amount;
};

// Add this to your booking schema file (before module.exports)
bookingSchema.pre('save', async function(next) {
    // Check if status changed to 'completed'
    if (this.isModified('status') && this.status === 'completed') {
        // Use setTimeout to avoid mongoose parallel save issues
        setTimeout(async () => {
            try {
                const Earnings = require('./Earnings');
                const Settings = require('./Settings');
                
                const existingEarnings = await Earnings.findOne({ booking_id: this._id });
                if (!existingEarnings) {
                    const feeSetting = await Settings.findOne({ key: 'platform_fee_percent' });
                    const platformFeePercent = feeSetting?.value ?? 3;
                    
                    const platformFee = (this.total_amount * platformFeePercent) / 100;
                    const ownerEarnings = this.total_amount - platformFee;
                    const month = new Date(this.start_time || this.created_at).toISOString().slice(0, 7);
                    const prefix = this.booking_type === 'online' ? 'ONL' : 'WLK';
                    const orderNumber = `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
                    
                    await Earnings.create({
                        owner_id: this.space_id,
                        space_id: this.space_id,
                        order_number: orderNumber,
                        booking_id: this._id,
                        total_amount: this.total_amount,
                        platform_fee_percent: platformFeePercent,
                        platform_fee: parseFloat(platformFee.toFixed(4)),
                        owner_earnings: parseFloat(ownerEarnings.toFixed(4)),
                        payment_method: this.booking_type === 'online' ? 'online' : (this.payment_method || 'walkin'),
                        payment_intent_id: this.payment_intent_id || null,
                        auto_collected: false, // ← CHANGE to false
                        fee_status: 'pending', // ← CHANGE to pending (not collected)
                        collected_at: null, // ← CHANGE to null
                        booking_date: this.start_time || this.created_at,
                        month: month,
                        notes: `Auto-created when booking became completed`
                    });
                    console.log(`✅ Earnings auto-created for ${this.booking_type} booking ${this.ticket_number}`);
                }
            } catch (error) {
                console.error('Error auto-creating earnings:', error);
            }
        }, 0);
    }
    next();
});

bookingSchema.plugin(logsActivity, { modelName: 'Booking' });

module.exports = mongoose.model('Booking', bookingSchema);