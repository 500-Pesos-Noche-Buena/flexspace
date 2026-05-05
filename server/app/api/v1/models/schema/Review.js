const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    // Either user_id OR guest_name must be present
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    guest_name: {
        type: String,
        trim: true,
        default: null
    },
    space_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Space',
        required: true
    },
    booking_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null
    },
    comment: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    images: {
        type: [String],
        default: []
    },
    reviewer_type: {
        type: String,
        enum: ['registered', 'guest'],
        required: true
    },
    is_verified_booking: {
        type: Boolean,
        default: false
    },
    is_edited: {
        type: Boolean,
        default: false
    },
    edited_at: {
        type: Date,
        default: null
    },
    helpful_count: {
        type: Number,
        default: 0
    },
    helpful_users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    liked_ips: {
        type: [String],
        default: []
    },
    reply: {
        text: String,
        created_at: Date,
        updated_at: Date
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'reported'],
        default: 'pending' // Guest reviews need admin approval
    },
    session_id: {
        type: String,
        default: null
    },
    ip_address: {
        type: String,
        default: null
    },
    user_agent: {
        type: String,
        default: null
    }
}, {
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at' 
    }
});

// Indexes
reviewSchema.index({ space_id: 1, created_at: -1 });
reviewSchema.index({ reviewer_type: 1, status: 1 });
reviewSchema.index({ status: 1, created_at: -1 });

// Validate that either user_id or guest_name exists
reviewSchema.pre('validate', function(next) {
    if (!this.user_id && !this.guest_name) {
        next(new Error('Either user_id OR guest_name must be provided'));
    }
    if (this.user_id) {
        this.reviewer_type = 'registered';
    } else {
        this.reviewer_type = 'guest';
    }
    next();
});

// Static method to update space rating
reviewSchema.statics.updateSpaceRating = async function(spaceId) {
    const result = await this.aggregate([
        { 
            $match: { 
                space_id: spaceId, 
                status: 'approved' 
            } 
        },
        { 
            $group: {
                _id: '$space_id',
                avgRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 }
            }
        }
    ]);
    
    if (result.length > 0) {
        const Space = mongoose.model('Space');
        await Space.findByIdAndUpdate(spaceId, {
            rating: Math.round(result[0].avgRating * 10) / 10,
            review_count: result[0].reviewCount
        });
    }
};

module.exports = mongoose.model('Review', reviewSchema);