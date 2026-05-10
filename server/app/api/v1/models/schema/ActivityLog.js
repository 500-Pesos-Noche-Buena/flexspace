const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            // User actions
            'user_login', 'user_logout', 'user_register', 'user_update', 'user_delete',
            // Space actions
            'space_create', 'space_update', 'space_delete', 'space_approve', 'space_reject',
            // Booking actions
            'booking_create', 'booking_cancel', 'booking_complete',
            // Payment actions
            'payment_made', 'payment_failed',
            // Location actions (ADD THESE)
            'district_create', 'district_update', 'district_delete',
            'city_create', 'city_update', 'city_delete',
            'province_create', 'province_update', 'province_delete',
            'region_create', 'region_update', 'region_delete',
            'country_create', 'country_update', 'country_delete',
            // Export action
            'export_logs'
        ],
        index: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'pending'],
        default: 'success'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userName: String,
    userEmail: String,
    spaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Space',
        index: true
    },
    spaceName: String,
    bookingId: String,
    amount: Number,
    ipAddress: String,
    userAgent: String,
    details: mongoose.Schema.Types.Mixed,
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Create indexes for faster queries
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ type: 1, createdAt: -1 });
activityLogSchema.index({ userName: 'text', description: 'text', userEmail: 'text' });

module.exports = mongoose.model('ActivityLog', activityLogSchema);