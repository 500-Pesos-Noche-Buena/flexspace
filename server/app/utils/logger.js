const logger = {
    info: (message, meta) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[INFO] ${message}`, meta || '');
        }
    },
    warn: (message, meta) => {
        console.warn(`[WARN] ${message}`, meta || '');
    },
    error: (message, meta) => {
        console.error(`[ERROR] ${message}`, meta || '');
    },
};

module.exports = logger;