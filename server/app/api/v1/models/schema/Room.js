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
    hourly_rates: [{
        _id: false,
        min_pax: { type: Number, required: true, min: 1 },
        max_pax: { type: Number, required: true, min: 1 },
        rate_hour: { type: Number, required: true, min: 0 }
    }],
    has_consumable_promo: {
        type: Boolean,
        default: false
    },

    promo_name: {
        type: String,
        default: null
    },

    promo_room_portion: { type: Number, default: null, min: 0 },
    consumable_packages: [{
        _id: false,
        audience: { type: String, enum: ['student', 'professional'], required: true },
        price: { type: Number, required: true, min: 0 },
        room_portion: { type: Number, default: null, min: 0 }
    }],
    promo_price: { type: Number, default: null, min: 0 },
    promo_duration_hours: {
        type: Number,
        default: null
    },

    consumable_allowance: {
        type: Number,
        default: 0,
        min: 0
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

roomSchema.pre('validate', function(next) {
    const tiers = [...(this.hourly_rates || [])].sort((a, b) => a.min_pax - b.min_pax);
    let previous = 0;
    for (const tier of tiers) {
        if (!Number.isSafeInteger(tier.min_pax) || !Number.isSafeInteger(tier.max_pax) || tier.min_pax !== previous + 1 || tier.max_pax < tier.min_pax || tier.max_pax > this.capacity || !Number.isFinite(tier.rate_hour) || tier.rate_hour < 0) {
            this.invalidate('hourly_rates', 'Guest ranges must cover 1 through room capacity without gaps or overlaps, with nonnegative rates.');
        }
        previous = tier.max_pax;
    }
    if (tiers.length && previous !== this.capacity) this.invalidate('hourly_rates', 'Guest ranges must cover the full room capacity.');

    if (this.has_consumable_promo) {
        if (!this.promo_name?.trim() || !(this.promo_duration_hours > 0)) this.invalidate('promo_name', 'A promo needs a name and positive duration.');
        const seen = new Set();
        for (const pkg of this.consumable_packages || []) {
            if (seen.has(pkg.audience) || !(pkg.price > 0) || (pkg.room_portion != null && pkg.room_portion >= pkg.price)) this.invalidate('consumable_packages', 'Each audience needs one package with a positive price.');
            seen.add(pkg.audience);
        }
        if (!this.consumable_packages?.length) {
            if (this.promo_price != null) this.consumable_allowance = this.promo_price - (this.promo_room_portion ?? this.hourly_rates?.[0]?.rate_hour ?? this.rate_hour ?? 0);
            if (!(this.consumable_allowance > 0)) this.invalidate('consumable_allowance', 'The package must leave positive product credit.');
        }
    }
    next();
});
module.exports = mongoose.model('Room', roomSchema);