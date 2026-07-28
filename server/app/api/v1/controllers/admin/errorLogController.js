const ErrorLog = require('@/api/v1/models/schema/ErrorLog');
const errorLogService = require('@/api/v1/services/errorLogService');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class ErrorLogController {
    /**
     * Get all error logs
     */
    index = async (req, res, next) => {
        try {
            const filters = req.query;
            const result = await errorLogService.getErrorLogs(filters);
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get error statistics
     */
    stats = async (req, res, next) => {
        try {
            const stats = await errorLogService.getErrorStats();
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get single error log
     */
    show = async (req, res, next) => {
        try {
            const { id } = req.params;
            const log = await ErrorLog.findById(id)
                .populate('user_id', 'name email')
                .populate('resolved_by', 'name email');
            
            if (!log) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Error log not found'
                });
            }
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: log
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Resolve an error log
     */
    resolve = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const userId = req.user?._id || req.user?.id || req.user?.sub;
            
            const log = await errorLogService.resolveError(id, userId, notes);
            
            if (!log) {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Error log not found'
                });
            }
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Error marked as resolved',
                data: log
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Log frontend error (public endpoint)
     */
    logFrontend = async (req, res, next) => {
        try {
            const errorData = req.body;
            const user = req.user || null;
            
            await errorLogService.logFrontendError(errorData, req, user);
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Error logged successfully'
            });
        } catch (error) {
            console.error('Failed to log frontend error:', error);
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Error logged successfully'
            });
        }
    };

    /**
     * Clean up old error logs
     */
    cleanup = async (req, res, next) => {
        try {
            const { days = 30 } = req.query;
            const deleted = await errorLogService.deleteOldLogs(parseInt(days));
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `Deleted ${deleted} old error logs`,
                data: { deleted }
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new ErrorLogController();