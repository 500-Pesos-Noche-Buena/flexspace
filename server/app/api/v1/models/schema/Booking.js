const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    booking_type: { 
        type: String, 
        enum: ['online', 'walkin'], 
        default: 'online',
        required: true 
    },
    // user_id is optional for walk-ins (guest_name used instead)
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    },
    guest_name: { 
        type: String, 
        default: null 
    },
    space_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Space', 
        required: true 
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
        enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'rejected', 'pending_payment'], 
        default: 'pending' 
    },
    payment_status: { 
        type: String, 
        enum: ['unpaid', 'partial', 'paid'], 
        default: 'unpaid' 
    },
    total_amount: { 
        type: Number, 
        default: 0 
    },
    payment_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Payment' 
    },
    notes: { 
        type: String, 
        default: null 
    },
    // Voucher fields - ADD THESE
    voucher_applied: { 
        type: String, 
        default: null 
    },
    voucher_discount: { 
        type: Number, 
        default: 0 
    }
}, { 
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at' 
    } 
});

module.exports = mongoose.model('Booking', bookingSchema);