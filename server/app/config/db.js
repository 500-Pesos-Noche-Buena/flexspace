const mongodb = require('./mongodb');
const config = require('@/config/config');

console.log(`[DB] Initializing MongoDB connection for: ${config.mongo.dbName}`);

module.exports = mongodb;