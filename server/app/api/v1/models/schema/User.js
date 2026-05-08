// app/api/v1/models/schema/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    space_request_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'SpaceRequest',
        default: null 
    },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    
    // Make password optional for Google OAuth users
    password: { 
        type: String, 
        required: false,  // ← Changed to false
        default: null 
    },
    
    // ============ GOOGLE OAUTH FIELDS ============
    googleId: { 
        type: String, 
        default: null,
    },
    authProvider: { 
        type: String, 
        enum: ['local', 'google'],
        default: 'local' 
    },
    avatar: { 
        type: String, 
        default: null 
    },
    
    role: { type: String, default: 'user' },
    parent_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    },
    points: { 
        type: Number, 
        default: 0 
    },
    isActive: { type: Boolean, default: true },
    isVerified: { 
        type: Boolean, 
        default: false  // Google users will be auto-verified
    },
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    business_permit: { type: String },
    dti_sec_reg: { type: String },
    business_payment_qr: { 
        type: String,
        default: null 
    },
    payment_methods: {
        type: [String],
        default: ['cash']
    },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    otpCode: { type: String, default: null },
    otpExpires: { type: Date, default: null }
}, { 
    timestamps: true,
    collection: 'users' 
});

module.exports = mongoose.model('User', userSchema);