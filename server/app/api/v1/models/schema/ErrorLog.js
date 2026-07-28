const mongoose = require('mongoose');
const { logsActivity } = require('@/api/v1/utils/logsActivity');

const errorLogSchema = new mongoose.Schema({
    // Error details
    error_type: { 
        type: String, 
        enum: ['backend', 'frontend', 'database', 'api', 'validation', 'auth', 'payment', 'email', 'server'],
        default: 'backend'
    },
    error_message: { 
        type: String, 
        required: true 
    },
    error_stack: { 
        type: String 
    },
    error_code: { 
        type: String 
    },
    
    // Request context
    method: { 
        type: String 
    },
    url: { 
        type: String 
    },
    ip: { 
        type: String 
    },
    user_agent: { 
        type: String 
    },
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null 
    },
    
    // Request body/params (sanitized)
    request_data: { 
        type: mongoose.Schema.Types.Mixed 
    },
    
    // Response status
    status_code: { 
        type: Number 
    },
    
    // Frontend errors
    browser: { 
        type: String 
    },
    browser_version: { 
        type: String 
    },
    os: { 
        type: String 
    },
    os_version: { 
        type: String 
    },
    device_type: { 
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown']
    },
    
    // Additional context
    component_name: { 
        type: String 
    },
    action_name: { 
        type: String 
    },
    tags: { 
        type: [String], 
        default: [] 
    },
    
    // Resolution
    resolved: { 
        type: Boolean, 
        default: false 
    },
    resolved_at: { 
        type: Date 
    },
    resolved_by: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null 
    },
    resolution_notes: { 
        type: String 
    },
    
    // Severity
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    }
}, { 
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at' 
    } 
});

// Indexes for faster queries
errorLogSchema.index({ created_at: -1 });
errorLogSchema.index({ error_type: 1 });
errorLogSchema.index({ resolved: 1 });
errorLogSchema.index({ severity: 1 });
errorLogSchema.index({ error_message: 'text' });

errorLogSchema.plugin(logsActivity, { modelName: 'ErrorLog' });

module.exports = mongoose.model('ErrorLog', errorLogSchema);