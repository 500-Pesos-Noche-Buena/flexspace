const mongoose = require('mongoose');
const config = require('./config');

const connectToMongoDB = async () => {
    try {
        // Fix the 10s hang by forcing 127.0.0.1
        const uri = config.mongo.uri.replace('localhost', '127.0.0.1');
        const dbName = config.mongo.dbName;
        const connectionString = uri.endsWith('/') ? `${uri}${dbName}` : `${uri}/${dbName}`;

        await mongoose.connect(connectionString, {
            serverSelectionTimeoutMS: 5000, 
        });

        console.log(`[DB-Mongoose] Connected to ${dbName}`);
        return mongoose.connection;
    } catch (error) {
        console.error(`[DB-Mongoose Error]: ${error.message}`);
        throw error; // Let index.js handle the process.exit
    }
};

module.exports = { connectToMongoDB };