const mongoose = require('mongoose');
const { logsActivity } = require('@/api/v1/utils/logsActivity');

const earningsSchema = new mongoose.Schema({
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true }, // "2026-04"

    total_fee: { type: Number, default: 0 },
    collected_fee: { type: Number, default: 0 },

    status: {
        type: String,
        enum: ['pending', 'partially_collected', 'collected'],
        default: 'pending'
    },

    last_collected_at: { type: Date, default: null }
}, { timestamps: true });

earningsSchema.plugin(logsActivity, { modelName: 'Earnings' });

module.exports = mongoose.model('Earnings', earningsSchema);