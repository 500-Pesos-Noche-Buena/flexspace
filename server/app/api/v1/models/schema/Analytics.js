// api/v1/models/Analytics.js
const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    period: { type: String, enum: ['24h', '7d', '30d'], default: '7d' },
    visitors: { type: Number, default: 0 },
    pageViews: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    avgSessionDuration: { type: Number, default: 0 },
    topPages: [{
        path: String,
        views: Number,
        visitors: Number
    }],
    trafficSources: [{
        source: String,
        percentage: Number,
        visitors: Number
    }],
    countries: [{
        code: String,
        name: String,
        visitors: Number,
        percentage: Number
    }],
    devices: [{
        type: { type: String }, 
        visitors: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 }
    }],
    browsers: [{
        name: String,
        visitors: Number,
        percentage: Number
    }],
    os: [{
        name: String,
        visitors: Number,
        percentage: Number
    }],
    dailyStats: [{
        date: String,
        visitors: Number,
        pageViews: Number
    }],
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Analytics', analyticsSchema);