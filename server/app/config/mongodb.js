const mongoose = require('mongoose');
const config = require('./config');

const connectToMongoDB = async () => {
    try {
        // Use environment variable MONGO_URI first (production or cloud)
        let uri = process.env.MONGO_URI;

        // Fallback to local dev URI from config if MONGO_URI is missing
        if (!uri) {
            uri = config.mongo.uri;
            // Only replace localhost with 127.0.0.1 for local dev
            if (process.env.NODE_ENV !== 'production') {
                uri = uri.replace('localhost', '127.0.0.1');
            }
        }

        const dbName = config.mongo.dbName || 'test';

        // Keep URI query parameters intact and select the database separately.
        await mongoose.connect(uri, {
            dbName,
            serverSelectionTimeoutMS: 5000,
        });

        console.log(`[DB-Mongoose] Connected to ${dbName}`);
        return mongoose.connection;
    } catch (error) {
        console.error(`[DB-Mongoose Error]: ${error.message}`);

        // For production/deploy, do NOT crash if no DB is available
        if (process.env.NODE_ENV === 'production') {
            console.warn('[DB-Mongoose] Proceeding without DB connection in production.');
            return null;
        }

        // For dev/local, throw so you can debug
        throw error;
    }
};

module.exports = { connectToMongoDB };
