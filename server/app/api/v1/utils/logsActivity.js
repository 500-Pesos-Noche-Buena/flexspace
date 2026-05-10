const mongoose = require('mongoose');

/**
 * Laravel-style LogsActivity Trait for Mongoose
 * Automatically logs when a model is created, updated, or deleted
 */
const logsActivity = (schema, options = {}) => {
    const modelName = options.modelName || schema.constructor.modelName;
    
    // Lazy load ActivityLog to avoid circular dependency
    const getActivityLog = () => {
        try {
            return mongoose.model('ActivityLog');
        } catch (err) {
            console.error(`ActivityLog model not found for ${modelName}:`, err.message);
            return null;
        }
    };
    
    // Get request info from async context
    const getRequestInfo = () => {
        try {
            const req = global.currentRequest;
            if (req && req.user) {
                return {
                    userId: req.user._id,
                    userName: req.user.name,
                    userEmail: req.user.email,
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    userAgent: req.headers['user-agent'],
                    url: req.originalUrl,
                    method: req.method
                };
            }
        } catch (err) {}
        
        return {
            userId: null,
            userName: 'SYSTEM',
            userEmail: 'system@flexspace.com',
            ipAddress: '127.0.0.1',
            userAgent: 'CLI/Seeder',
            url: 'CONSOLE',
            method: 'CLI'
        };
    };

    // Helper to get document name/identifier
    const getDocumentIdentifier = (doc) => {
        if (doc.name) return doc.name;
        if (doc.title) return doc.title;
        return doc._id;
    };

    // Helper to get user type label
    const getUserTypeLabel = (doc) => {
        if (modelName !== 'User') return modelName;
        
        switch (doc.role) {
            case 'admin':
                return 'Admin';
            case 'staff':
                return 'Staff Member';
            case 'space':
                return 'Space Owner';
            case 'user':
                return 'Customer';
            default:
                return 'User';
        }
    };

    // Log after save (BOTH create AND update via save())
    schema.post('save', async function(doc) {
        if (options.skipLog) return;
        
        const ActivityLogModel = getActivityLog();
        if (!ActivityLogModel) return;
        
        const requestInfo = getRequestInfo();
        const isNew = this.isNew;
        const docIdentifier = getDocumentIdentifier(doc);
        const userTypeLabel = getUserTypeLabel(doc);
        
        try {
            if (isNew) {
                // CREATE operation
                await ActivityLogModel.create({
                    type: `${modelName.toLowerCase()}_create`,
                    description: `${userTypeLabel} created: ${docIdentifier}`,
                    status: 'success',
                    userId: requestInfo.userId,
                    userName: requestInfo.userName,
                    userEmail: requestInfo.userEmail,
                    ipAddress: requestInfo.ipAddress,
                    userAgent: requestInfo.userAgent,
                    details: {
                        action: 'CREATE',
                        model: modelName,
                        role: doc.role,
                        data: doc.toObject(),
                        url: requestInfo.url,
                        method: requestInfo.method
                    }
                });
                console.log(`📝 [${modelName}] CREATE logged: ${docIdentifier} (${userTypeLabel})`);
            } else {
                // UPDATE operation (via save() on existing document)
                await ActivityLogModel.create({
                    type: `${modelName.toLowerCase()}_update`,
                    description: `${userTypeLabel} updated: ${docIdentifier} by ${requestInfo.userName || 'SYSTEM'}`,
                    status: 'success',
                    userId: requestInfo.userId,
                    userName: requestInfo.userName,
                    userEmail: requestInfo.userEmail,
                    ipAddress: requestInfo.ipAddress,
                    userAgent: requestInfo.userAgent,
                    details: {
                        action: 'UPDATE',
                        model: modelName,
                        role: doc.role,
                        documentId: doc._id,
                        documentName: docIdentifier,
                        url: requestInfo.url,
                        method: requestInfo.method
                    }
                });
                console.log(`📝 [${modelName}] UPDATE logged via save(): ${docIdentifier} (${userTypeLabel})`);
            }
        } catch (err) {
            console.error(`Failed to log ${modelName} ${isNew ? 'creation' : 'update'}:`, err);
        }
    });

    // Log after findOneAndUpdate
    schema.post('findOneAndUpdate', async function(doc) {
        if (options.skipLog || !doc) return;
        
        const ActivityLogModel = getActivityLog();
        if (!ActivityLogModel) return;
        
        const requestInfo = getRequestInfo();
        const update = this.getUpdate();
        const docIdentifier = getDocumentIdentifier(doc);
        const userTypeLabel = getUserTypeLabel(doc);
        
        try {
            await ActivityLogModel.create({
                type: `${modelName.toLowerCase()}_update`,
                description: `${userTypeLabel} updated: ${docIdentifier} by ${requestInfo.userName || 'SYSTEM'}`,
                status: 'success',
                userId: requestInfo.userId,
                userName: requestInfo.userName,
                userEmail: requestInfo.userEmail,
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
                details: {
                    action: 'UPDATE',
                    model: modelName,
                    role: doc.role,
                    documentId: doc._id,
                    documentName: docIdentifier,
                    changes: update,
                    url: requestInfo.url,
                    method: requestInfo.method
                }
            });
            console.log(`📝 [${modelName}] UPDATE logged via findOneAndUpdate: ${docIdentifier} (${userTypeLabel})`);
        } catch (err) {
            console.error(`Failed to log ${modelName} update:`, err);
        }
    });

    // Log after delete
    schema.post('findOneAndDelete', async function(doc) {
        if (options.skipLog || !doc) return;
        
        const ActivityLogModel = getActivityLog();
        if (!ActivityLogModel) return;
        
        const requestInfo = getRequestInfo();
        const docIdentifier = getDocumentIdentifier(doc);
        const userTypeLabel = getUserTypeLabel(doc);
        
        try {
            await ActivityLogModel.create({
                type: `${modelName.toLowerCase()}_delete`,
                description: `${userTypeLabel} deleted: ${docIdentifier} by ${requestInfo.userName || 'SYSTEM'}`,
                status: 'success',
                userId: requestInfo.userId,
                userName: requestInfo.userName,
                userEmail: requestInfo.userEmail,
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
                details: {
                    action: 'DELETE',
                    model: modelName,
                    role: doc.role,
                    deletedData: doc.toObject(),
                    url: requestInfo.url,
                    method: requestInfo.method
                }
            });
            console.log(`📝 [${modelName}] DELETE logged: ${docIdentifier} (${userTypeLabel})`);
        } catch (err) {
            console.error(`Failed to log ${modelName} deletion:`, err);
        }
    });
};

// Middleware to capture current request globally
const captureRequest = (req, res, next) => {
    global.currentRequest = req;
    next();
};

module.exports = { logsActivity, captureRequest };