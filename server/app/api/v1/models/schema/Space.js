// server/app/api/v1/models/schema/Space.js

const mongoose = require('mongoose');
const { logsActivity } = require('@/api/v1/utils/logsActivity');

const spaceSchema = new mongoose.Schema({
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    name: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 120
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
    rating: { 
        type: Number, 
        default: 5.0,
        min: 0,
        max: 5
    },
    review_count: { 
        type: Number, 
        default: 0 
    },
    amenities: { 
        type: [String],
        default: [] 
    },
    status: { 
        type: String, 
        default: 'Open Now' 
    },
    images: { 
        type: [String],
        default: [] 
    },
    image: { 
        type: String, 
        default: null 
    },
    panorama_images: {
        type: [String],
        default: []
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
    description: { 
        type: String, 
        default: null 
    },
    is_open_time: { 
        type: Boolean, 
        default: false 
    },
    hours_json: { 
        type: mongoose.Schema.Types.Mixed,
        default: null 
    },
    available_rooms: { 
        type: String, 
        default: null 
    },
    has_rooms: { 
        type: Boolean, 
        default: false 
    },
    room_count: { 
        type: Number, 
        default: 0 
    },
    virtual_tour: {
        enabled: { type: Boolean, default: false },
        initial_node_id: { type: String, default: null },
        nodes: [{
            id: { type: String, required: true },
            name: { type: String, required: true },
            panorama: { type: String, required: true },
            thumbnail: { type: String, default: null },
            caption: { type: String, default: null },
            room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
            room_name: { type: String, default: null },
            default_pitch: { type: Number, default: 0 },
            default_yaw: { type: Number, default: 0 },
            default_zoom: { type: Number, default: 50 },
            links: [{
                nodeId: { type: String, required: true },
                pitch: { type: Number, default: -0.2 },
                yaw: { type: Number, required: true },
                tooltip: { type: String, default: '' }
            }],
            markers: [{
                id: { type: String },
                pitch: { type: Number },
                yaw: { type: Number },
                tooltip: { type: String },
                html: { type: String },
                room_name: { type: String }
            }]
        }]
    }
}, { 
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at' 
    } 
});

// ============ VIRTUAL FIELD FOR DYNAMIC STATUS ============
spaceSchema.virtual('current_status').get(function() {
    const now = new Date();
    // Fix: Use getDay() instead of toLocaleString
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    
    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };
    
    const hours = this.hours_json;
    const todayHours = hours?.[currentDay];
    
    let isOpenBySchedule = false;
    
    if (todayHours && todayHours.active === true) {
        const openMinutes = timeToMinutes(todayHours.open);
        const closeMinutes = timeToMinutes(todayHours.close);
        
        if (closeMinutes < openMinutes) {
            isOpenBySchedule = currentTimeMinutes >= openMinutes || currentTimeMinutes <= closeMinutes;
        } else {
            isOpenBySchedule = currentTimeMinutes >= openMinutes && currentTimeMinutes <= closeMinutes;
        }
    } else if (!hours || Object.keys(hours).length === 0) {
        isOpenBySchedule = true;
    }
    
    const totalCapacity = this.capacity || 0;
    const occupied = this.occupied_seats || 0;
    const isFull = totalCapacity > 0 && occupied >= totalCapacity;
    
    if (!isOpenBySchedule) {
        return 'Closed';
    }
    
    if (isFull) {
        return 'Full';
    }
    
    return 'Open Now';
});

// Ensure virtuals are included when converting to JSON
spaceSchema.set('toJSON', { virtuals: true });
spaceSchema.set('toObject', { virtuals: true });

spaceSchema.plugin(logsActivity, { modelName: 'Space' });

module.exports = mongoose.model('Space', spaceSchema);