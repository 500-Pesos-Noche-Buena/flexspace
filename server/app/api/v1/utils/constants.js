const HTTP_STATUS = {
    // 2xx Success
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,

    // 4xx Client Errors
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422, // Often used for validation errors

    // 5xx Server Errors
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
};

const ERROR_MESSAGES = {
    INVALID_CREDENTIALS: 'Email or password incorrect.',
    TOKEN_EXPIRED: 'Access token expired.',
    MISSING_FIELDS: 'Required fields are missing.',
    RESOURCE_NOT_FOUND: 'The requested resource was not found.',
    
    ACCESS_DENIED: 'Access Forbidden. Insufficient privileges.',
    INVALID_TOKEN: 'Invalid authentication token.',
    USER_NOT_FOUND: 'User associated with token not found or disabled.',
};

module.exports = {
    HTTP_STATUS,
    ERROR_MESSAGES,
};