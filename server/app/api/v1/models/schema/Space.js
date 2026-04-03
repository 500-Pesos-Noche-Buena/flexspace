const mongoose = require('mongoose');

const spaceSchema = new mongoose.Schema({
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    area: { 
        type: String, 
        default: null 
    },
    lat: { 
        type: Number, 
        default: null 
    },
    lng: { 
        type: Number, 
        default: null 
    },
    rate_hour: { 
        type: Number, 
        required: true 
    },
    status: { 
        type: String, 
        default: 'Open Now' 
    },
    image: { 
        type: String, 
        default: null 
    },
    district_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'District', 
        default: null 
    },
    capacity: { 
        type: Number, 
        default: 10 
    },
    occupied_seats: { 
        type: Number, 
        default: 0 
    },
    hours_json: { 
        type: mongoose.Schema.Types.Mixed,
        default: null 
    },
    available_rooms: { 
        type: String, 
        default: null 
    }
}, { 
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at' 
    } 
});

module.exports = mongoose.model('Space', spaceSchema);