class ApiError extends Error {
    /**
     * @param {number} statusCode - HTTP status code (e.g., 400, 404, 500)
     * @param {string} message - The error message
     * @param {boolean} isOperational - True for errors we expect
     */
    constructor(statusCode, message, isOperational) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
    }
}

module.exports = ApiError;