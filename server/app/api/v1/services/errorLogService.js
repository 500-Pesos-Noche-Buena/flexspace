const ErrorLog = require('@/api/v1/models/schema/ErrorLog');

class ErrorLogService {
    /**
     * Log a backend error
     */
    async logBackendError(error, req = null, user = null) {
        try {
            // Determine severity
            let severity = 'medium';
            if (error.statusCode >= 500) severity = 'critical';
            else if (error.statusCode >= 400) severity = 'high';
            else if (error.statusCode >= 300) severity = 'low';

            const logData = {
                error_type: 'backend',
                error_message: error.message || 'Unknown error',
                error_stack: error.stack || null,
                error_code: error.code || null,
                status_code: error.statusCode || 500,
                method: req?.method,
                url: req?.originalUrl || req?.url,
                ip: req?.ip || req?.connection?.remoteAddress,
                user_agent: req?.headers?.['user-agent'],
                user_id: user?._id || req?.user?._id || null,
                request_data: this.sanitizeRequestData(req?.body),
                tags: ['backend', 'server'],
                severity: severity
            };

            const log = await ErrorLog.create(logData);
            console.log(`📝 Error logged: ${logData.error_message} (${logData.severity})`);
            return log;
        } catch (err) {
            console.error('Failed to log error:', err);
            return null;
        }
    }

    /**
     * Log a frontend error
     */
    async logFrontendError(errorData, req = null, user = null) {
        try {
            const logData = {
                error_type: 'frontend',
                error_message: errorData.message || 'Unknown frontend error',
                error_stack: errorData.stack || null,
                error_code: errorData.code || null,
                method: req?.method || 'GET',
                url: req?.originalUrl || req?.url || errorData.url || 'unknown',
                ip: req?.ip || req?.connection?.remoteAddress,
                user_agent: req?.headers?.['user-agent'] || errorData.userAgent,
                user_id: user?._id || req?.user?._id || null,
                browser: errorData.browser,
                browser_version: errorData.browserVersion,
                os: errorData.os,
                os_version: errorData.osVersion,
                device_type: errorData.deviceType || 'unknown',
                component_name: errorData.componentName,
                action_name: errorData.actionName,
                request_data: errorData.context || null,
                tags: ['frontend', ...(errorData.tags || [])],
                severity: errorData.severity || 'medium'
            };

            const log = await ErrorLog.create(logData);
            console.log(`📝 Frontend error logged: ${logData.error_message}`);
            return log;
        } catch (err) {
            console.error('Failed to log frontend error:', err);
            return null;
        }
    }

    /**
     * Sanitize request data
     */
    sanitizeRequestData(data) {
        if (!data) return null;
        
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'api_key'];
        const sanitized = { ...data };
        
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '***REDACTED***';
            }
        }
        
        return sanitized;
    }

    /**
     * Get error logs with filtering
     */
    async getErrorLogs(filters = {}) {
        const {
            error_type,
            resolved,
            severity,
            search,
            from_date,
            to_date,
            page = 1,
            limit = 50,
            sort_by = 'created_at',
            sort_order = 'desc'
        } = filters;

        const query = {};

        if (error_type) query.error_type = error_type;
        if (severity) query.severity = severity;
        if (resolved !== undefined && resolved !== '') {
            query.resolved = resolved === 'true' || resolved === true;
        }
        if (search) {
            query.$text = { $search: search };
        }
        if (from_date || to_date) {
            query.created_at = {};
            if (from_date) query.created_at.$gte = new Date(from_date);
            if (to_date) query.created_at.$lte = new Date(to_date);
        }

        const sort = {};
        sort[sort_by] = sort_order === 'desc' ? -1 : 1;

        const [logs, total] = await Promise.all([
            ErrorLog.find(query)
                .populate('user_id', 'name email')
                .populate('resolved_by', 'name email')
                .sort(sort)
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit)),
            ErrorLog.countDocuments(query)
        ]);

        return {
            logs,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
        };
    }

    /**
     * Get error statistics
     */
    async getErrorStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const [total, todayCount, weekCount, unresolved, byType, bySeverity, recent] = await Promise.all([
            ErrorLog.countDocuments(),
            ErrorLog.countDocuments({ created_at: { $gte: today } }),
            ErrorLog.countDocuments({ created_at: { $gte: weekAgo } }),
            ErrorLog.countDocuments({ resolved: false }),
            ErrorLog.aggregate([
                { $group: { _id: '$error_type', count: { $sum: 1 } } }
            ]),
            ErrorLog.aggregate([
                { $group: { _id: '$severity', count: { $sum: 1 } } }
            ]),
            ErrorLog.find({ resolved: false })
                .sort({ created_at: -1 })
                .limit(5)
                .select('error_message error_type severity created_at')
        ]);

        return {
            total,
            today: todayCount,
            week: weekCount,
            unresolved,
            by_type: byType,
            by_severity: bySeverity,
            recent_unresolved: recent
        };
    }

    /**
     * Resolve an error
     */
    async resolveError(logId, userId, notes = '') {
        const log = await ErrorLog.findByIdAndUpdate(
            logId,
            {
                resolved: true,
                resolved_at: new Date(),
                resolved_by: userId,
                resolution_notes: notes
            },
            { new: true }
        );
        return log;
    }

    /**
     * Delete old resolved error logs
     */
    async deleteOldLogs(days = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        const result = await ErrorLog.deleteMany({
            created_at: { $lt: cutoff },
            resolved: true
        });
        
        return result.deletedCount;
    }
}

module.exports = new ErrorLogService();