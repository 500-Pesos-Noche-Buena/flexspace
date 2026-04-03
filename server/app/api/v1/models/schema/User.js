const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    isActive: { type: Boolean, default: true },
    status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
    business_permit: { type: String },
    dti_sec_reg: { type: String }
}, { 
    timestamps: true,
    collection: 'users' 
});

module.exports = mongoose.model('User', userSchema);