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

    ai: {
        geminiKey: process.env.GEMINI_API_KEY,
    },

    cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        folder: 'coworking', // Default folder for all uploads
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