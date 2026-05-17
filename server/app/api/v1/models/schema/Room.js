const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    space_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Space', 
        required: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['private_office', 'meeting_room', 'conference_room', 'event_space', 'study_room', 'pod', 'shared_desk'],
        default: 'private_office'
    },
    capacity: { 
        type: Number, 
        default: 1 
    },
    rate_hour: { 
        type: Number, 
        default: null 
    },
    is_available: { 
        type: Boolean, 
        default: true 
    },
    description: { 
        type: String, 
        default: null 
    },
    amenities: { 
        type: [String], 
        default: [] 
    },
    images: { 
        type: [String], 
        default: [] 
    },
    image: { 
        type: String, 
        default: null 
    },
    is_airconditioned: { 
        type: Boolean, 
        default: true 
    },
    has_window: { 
        type: Boolean, 
        default: false 
    },
    floor_number: { 
        type: Number, 
        default: 1 
    }
}, { 
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at' 
    } 
});

module.exports = mongoose.model('Room', roomSchema);