const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    key:   { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    label: { type: String, default: null }, 
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Settings', settingsSchema);