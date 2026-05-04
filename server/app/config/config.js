const config = {
    env: process.env.NODE_ENV || 'development',

    port: Number(process.env.PORT) || 5000,
    apiUrl: process.env.VITE_API_URL,

    mongo: {
        uri: process.env.MONGODB_URI,
        dbName: process.env.MONGODB_DB_NAME,
    },

    app: {
        internalSecret: process.env.INTERNAL_API_KEY
    },

    jwt: {
        secret: process.env.JWT_SECRET,
        accessExpirationMinutes: 30,
    },

    bcrypt: {
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
    },

    email: {
        smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
            from: process.env.SMTP_FROM_EMAIL,
        },
        // Queue configuration
        queue: {
            enabled: process.env.ENABLE_EMAIL_QUEUE === 'true',
            concurrency: parseInt(process.env.QUEUE_CONCURRENCY) || 5,
            attempts: parseInt(process.env.QUEUE_ATTEMPTS) || 3,
            backoffDelay: parseInt(process.env.QUEUE_BACKOFF_DELAY) || 5000,
        }
    },

    redis: {
        // Support both REDIS_URL and individual config
        url: process.env.REDIS_URL,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        
        // Helper method to get connection config
        getConnectionConfig() {
            if (this.url) {
                return { url: this.url };
            }
            return {
                host: this.host,
                port: this.port,
                password: this.password,
            };
        }
    },

    ai: {
        geminiKey: process.env.GEMINI_API_KEY,
    },

    cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        folder: 'coworking',
        transformations: {
            qr_code: [
                { width: 500, height: 500, crop: "limit" },
                { quality: "auto:good", fetch_format: "auto" }
            ],
            space_images: [
                { width: 1200, crop: "limit" },
                { quality: "auto:good", fetch_format: "auto" }
            ],
            thumbnails: [
                { width: 300, height: 300, crop: "thumb" },
                { quality: "auto:good", fetch_format: "auto" }
            ],
            documents: [
                { quality: "auto:good" }
            ]
        }
    }
};

module.exports = config;