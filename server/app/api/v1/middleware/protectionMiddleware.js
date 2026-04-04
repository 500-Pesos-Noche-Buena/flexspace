const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');
const config = require('@/config/config');

class ProtectionMiddleware {
    async handle(req, res, next) {
        const appFingerprint = req.headers['x-app-fingerprint'];

        const expectedSecret = config?.app?.internalSecret || 'iloilo_work_2026_secure';

        if (!appFingerprint || appFingerprint !== expectedSecret) {
            return next(new ApiError(
                HTTP_STATUS.FORBIDDEN, 
                "Access Denied: Direct API access is prohibited.", 
                true
            ));
        }

        next();
    }
}

const protectionMiddleware = new ProtectionMiddleware();
module.exports = protectionMiddleware.handle.bind(protectionMiddleware);