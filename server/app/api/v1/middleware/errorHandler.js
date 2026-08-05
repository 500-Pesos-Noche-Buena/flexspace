const ApiError = require('@/api/v1/utils/ApiError');
const logger = require('@/api/v1/utils/logger');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const errorLogService = require('@/api/v1/services/errorLogService');

const errorConverter = (err, req, res, next) => {
    let error = err;

    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
        const message = error.message || 'Internal Server Error';

        error = new ApiError(statusCode, message, false, err.stack);
    }

    next(error);
};

const errorHandler = (err, req, res, next) => {
    let { statusCode, message } = err;

    console.error('--- 🛑 SERVER LOG 🛑 ---');
    console.error(`Status: ${statusCode}`);
    console.error(`Message: ${err.message}`);
    console.error(`Stack: ${err.stack}`);
    console.error('-----------------------');

    // 🔥 LOG ERROR TO DATABASE (Safely catch any logging error)
    if (errorLogService && typeof errorLogService.logBackendError === 'function') {
        errorLogService.logBackendError(err, req).catch((logErr) => {
            console.warn('⚠️ Failed to store backend error log:', logErr.message);
        });
    }

    if (statusCode >= 500 || !err.isOperational) {
        logger.error('Uncaught Exception details:', {
            message: err.message,
            stack: err.stack,
            requestUrl: req ? req.originalUrl : 'N/A',
            method: req ? req.method : 'N/A',
        });
    }

    const response = {
        success: false,
        message: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    };

    res.status(statusCode).json(response);
};

module.exports = {
    errorConverter,
    errorHandler,
};