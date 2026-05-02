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
};

module.exports = config;