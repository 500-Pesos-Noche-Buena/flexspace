const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const config = require('@/config/config');

class ProtectionMiddleware {
    async handle(req, res, next) {
        const appFingerprint = req.headers['x-app-fingerprint'];

        const expectedSecret = config?.app?.internalSecret;

        if (!expectedSecret || !appFingerprint || appFingerprint !== expectedSecret) {
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