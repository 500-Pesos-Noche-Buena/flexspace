const mongoose = require('mongoose');

const serviceConfigSchema = new mongoose.Schema({
    mode: { 
        type: String, 
        enum: ['auto', 'manual'], 
        default: 'auto' 
    },
    selectedModel: { 
        type: String, 
        default: 'gemini-2.0-flash' 
    },
    fallbackEnabled: { 
        type: Boolean, 
        default: true 
    },
    temperature: { 
        type: Number, 
        default: 0.3,
        min: 0,
        max: 2 
    }
}, { _id: false });

const aiSettingsSchema = new mongoose.Schema({
    chatbotConfig: {
        type: serviceConfigSchema,
        default: () => ({
            mode: 'auto',
            selectedModel: 'gemini-2.0-flash',
            fallbackEnabled: true,
            temperature: 0.3
        })
    },
    blogConfig: {
        type: serviceConfigSchema,
        default: () => ({
            mode: 'auto',
            selectedModel: 'gemini-2.0-flash',
            fallbackEnabled: true,
            temperature: 0.7
        })
    },
    defaultPriorityList: {
        type: [String],
        default: [
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-1.5-flash',
            'gemini-2.5-flash'
        ]
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('AiSettings', aiSettingsSchema);
