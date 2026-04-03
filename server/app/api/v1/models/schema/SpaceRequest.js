const mongoose = require('mongoose');

const spaceRequestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    business_permit: { type: String, default: null },
    dti_sec_reg: { type: String, default: null },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('SpaceRequest', spaceRequestSchema);