const mongoose = require('mongoose');
const { logsActivity } = require('@/api/v1/utils/logsActivity');

const bookingSchema = new mongoose.Schema({
    booking_type: { 
        type: String, 
        enum: ['online', 'walkin'], 
        default: 'online',
        required: true 
    },
    
    bookable_type: { 
        type: String, 
        enum: ['space', 'room'], 
        required: true,
        default: 'space'
    },
    
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
    
    payment_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Payment' 
    },
    payment_method: { 
        type: String, 
        enum: ['cash', 'card', 'gcash', 'paymaya', 'bank_transfer', 'points'],
        default: null 
    },
    
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

bookingSchema.index({ user_id: 1, status: 1 });
bookingSchema.index({ space_id: 1, start_time: 1 });
bookingSchema.index({ room_id: 1, start_time: 1 });
bookingSchema.index({ qr_code_token: 1 });
bookingSchema.index({ ticket_number: 1 });

bookingSchema.virtual('bookable_name').get(function() {
    if (this.bookable_type === 'room' && this.room_id) {
        return this.room_id.name;
    }
    if (this.space_id) {
        return this.space_id.name;
    }
    return 'Unknown';
});

bookingSchema.virtual('bookable_image').get(function() {
    if (this.bookable_type === 'room' && this.room_id) {
        return this.room_id.image || this.room_id.images?.[0];
    }
    if (this.space_id) {
        return this.space_id.image;
    }
    return null;
});

bookingSchema.methods.calculateTotal = function() {
    if (!this.check_in_at) return this.total_amount;
    
    const now = this.check_out_at || new Date();
    const hours = Math.max(0.5, Math.ceil((now - this.check_in_at) / (1000 * 60 * 60) * 2) / 2);
    this.total_hours = hours;
    this.total_amount = hours * this.rate_per_hour;
    return this.total_amount;
};

// ✅ FINAL FIXED: pre('save') hook without setTimeout
bookingSchema.pre('save', async function(next) {
    try {
        // Log the status change
        console.log(`📝 Booking ${this.ticket_number} pre-save hook running. Current status: ${this.status}, isModified('status'): ${this.isModified('status')}`);
        
        // Check if status is being set to 'completed'
        if (this.status === 'completed') {
            console.log(`🎯 Booking ${this.ticket_number} is being set to completed!`);
            
            const Earnings = require('./Earnings');
            const Settings = require('./Settings');
            const Space = require('./Space');
            
            // Check if earnings already exist
            const existingEarnings = await Earnings.findOne({ booking_id: this._id });
            if (existingEarnings) {
                console.log(`⚠️ Earnings already exist for booking ${this.ticket_number}`);
                return next();
            }
            
            // Get the actual owner (user_id) from the Space
            const space = await Space.findById(this.space_id).select('user_id');
            if (!space) {
                console.error(`❌ Space not found for booking ${this.ticket_number}`);
                return next();
            }
            
            const ownerId = space.user_id;
            const totalAmount = this.total_amount || 0;
            
            if (totalAmount <= 0) {
                console.log(`⚠️ Booking ${this.ticket_number} has 0 total (${totalAmount}), skipping earnings`);
                return next();
            }
            
            // Get platform fee percentage from settings
            const feeSetting = await Settings.findOne({ key: 'platform_fee_percent' });
            const platformFeePercent = feeSetting?.value ?? 3;
            
            const platformFee = (totalAmount * platformFeePercent) / 100;
            const ownerEarnings = totalAmount - platformFee;
            
            let bookingDate = this.start_time || this.created_at || new Date();
            if (typeof bookingDate === 'string') {
                bookingDate = new Date(bookingDate);
            }
            if (isNaN(bookingDate.getTime())) {
                bookingDate = new Date();
            }
            
            const month = bookingDate.toISOString().slice(0, 7);
            
            // Create unique order number
            const prefix = this.booking_type === 'online' ? 'ONL' : 'WLK';
            const orderNumber = `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
            
            const earningsData = {
                owner_id: ownerId,
                space_id: this.space_id,
                order_number: orderNumber,
                booking_id: this._id,
                total_amount: totalAmount,
                platform_fee_percent: platformFeePercent,
                platform_fee: parseFloat(platformFee.toFixed(4)),
                owner_earnings: parseFloat(ownerEarnings.toFixed(4)),
                payment_method: this.booking_type === 'online' ? 'online' : (this.payment_method || 'walkin'),
                payment_intent_id: this.payment_intent_id || null,
                auto_collected: false,
                fee_status: 'pending',
                collected_at: null,
                booking_date: bookingDate,
                month: month,
                notes: `Auto-created when booking became completed`
            };
            
            console.log('📊 Creating earnings for booking:', {
                ticket_number: this.ticket_number,
                total_amount: totalAmount,
                owner_id: ownerId,
                platform_fee_percent: platformFeePercent
            });
            
            const result = await Earnings.create(earningsData);
            console.log(`✅✅✅ Earnings CREATED for booking ${this.ticket_number}: ID ${result._id}, Amount: ₱${totalAmount}`);
        }
    } catch (error) {
        console.error('❌ Error in booking pre-save hook:', error);
        console.error('Error stack:', error.stack);
    }
    next();
});

bookingSchema.plugin(logsActivity, { modelName: 'Booking' });

module.exports = mongoose.model('Booking', bookingSchema);