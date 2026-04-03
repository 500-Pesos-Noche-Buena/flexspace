const ApiError = require('@/utils/ApiError');
const logger = require('@/utils/logger');
const { HTTP_STATUS } = require('@/utils/constants'); 

const errorConverter = (err, req, res, next) => {
    let error = err;

    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
        const message = error.message || 'Internal Server Error';

        error = new ApiError(statusCode, message, false); 
    }

    next(error);
};

const errorHandler = (err, req, res, next) => {
    let { statusCode, message } = err;

    if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR || !err.isOperational) {
        logger.error('Uncaught Exception or 5xx Error:', {
            code: err.code || statusCode, 
            requestUrl: req.originalUrl,
            method: req.method,
            ip: req.ip,
            user: req.user ? req.user.id : 'Guest'
        });
    }

    if (process.env.NODE_ENV === 'production') {
        if (!err.isOperational) {
            statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
            message = 'Internal Server Error';
        }
    }

    const response = {
        code: statusCode,
        message,
    };

    res.status(statusCode).send(response);
};

module.exports = {
    errorConverter,
    errorHandler,
};