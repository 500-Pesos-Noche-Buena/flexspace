const mongoose = require('mongoose');
const { logsActivity } = require('@/api/v1/utils/logsActivity');
const districtSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    slug: { 
        type: String, 
        required: true, 
        unique: true 
    },
    active: { 
        type: Boolean, 
        default: true 
    }
}, { 
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at' 
    } 
});

districtSchema.plugin(logsActivity, { modelName: 'District' });


module.exports = mongoose.model('District', districtSchema);