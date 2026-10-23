const mongoose = require('mongoose');

const aiUsageLogSchema = new mongoose.Schema({
    service: {
        type: String,
        enum: ['chatbot', 'blog'],
        required: true,
        index: true
    },
    modelUsed: {
        type: String,
        required: true,
        index: true
    },
    inputTokens: {
        type: Number,
        default: 0
    },
    outputTokens: {
        type: Number,
        default: 0
    },
    totalTokens: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['success', 'fallback', 'rate_limited', 'failed'],
        required: true,
        index: true
    },
    fallbackFrom: {
        type: String,
        default: null
    },
    durationMs: {
        type: Number,
        default: 0
    },
    errorMessage: {
        type: String,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

aiUsageLogSchema.index({ timestamp: -1 });
aiUsageLogSchema.index({ service: 1, timestamp: -1 });
aiUsageLogSchema.index({ status: 1, timestamp: -1 });

module.exports = mongoose.model('AiUsageLog', aiUsageLogSchema);
