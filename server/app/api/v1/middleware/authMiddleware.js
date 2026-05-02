const jwt = require('jsonwebtoken');
const config = require('@/config/config');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class AuthMiddleware {
    /**
     * Middleware to verify JWT.
     * Exported as an arrow function to maintain scope.
     */
    handle = async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            console.log('--- Auth Header Received ---', authHeader); // 🕵️‍♂️ DEBUG 1

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                console.error('Missing or Malformed Header');
                return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized."));
            }

            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, config.jwt.secret);

            console.log('--- Token Decoded Successfully ---', decoded); // 🕵️‍♂️ DEBUG 2

            req.user = decoded;
            next();
        } catch (error) {
            console.error('JWT Verification Failed:', error.message); // 🕵️‍♂️ DEBUG 3
            next(new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid token"));
        }
    }
}

module.exports = new AuthMiddleware().handle;