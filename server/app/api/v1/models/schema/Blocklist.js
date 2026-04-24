const mongoose = require('mongoose');

const blocklistSchema = new mongoose.Schema({
    ip: { type: String, required: true, unique: true },
    reason: { type: String, required: true },
    attack_vector: { type: String },
    blocked_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Blocklist', blocklistSchema);