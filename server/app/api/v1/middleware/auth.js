const auth = require('./authMiddleware');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

/**
 * Role-based access control middleware helper.
 * @param {string[]} roles Allowed roles (e.g. ['admin', 'space', 'staff'])
 */
const requireRole = (roles = []) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return next(new ApiError(HTTP_STATUS.FORBIDDEN, 'Forbidden: Insufficient privileges.'));
    }
    next();
};

module.exports = {
    auth,
    requireRole
};
