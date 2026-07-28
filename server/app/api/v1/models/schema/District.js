const mongoose = require('mongoose');
const { logsActivity } = require('@/api/v1/utils/logsActivity');

// Helper to generate slug from name
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const districtSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        unique: true 
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

// Auto-generate slug before save if not provided
districtSchema.pre('save', function(next) {
    if (!this.slug && this.name) {
        this.slug = generateSlug(this.name);
    }
    next();
});

districtSchema.plugin(logsActivity, { modelName: 'District' });

module.exports = mongoose.model('District', districtSchema);