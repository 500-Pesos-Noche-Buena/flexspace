const jwt = require('jsonwebtoken');
const config = require('@/config/config');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');

class AuthMiddleware {
    async handle(req, res, next) {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized access. Please log in.", true));
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            req.user = decoded;
            next();
        } catch (error) {
            next(new ApiError(HTTP_STATUS.UNAUTHORIZED, `Invalid token: ${error.message}`));
        }
    }
}

const authMiddleware = new AuthMiddleware();
module.exports = authMiddleware.handle.bind(authMiddleware);