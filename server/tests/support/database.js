const mongoose = require('mongoose');
exports.connect = async t => {
    const base = process.env.MONGODB_DB_NAME;
    if (!base || !/(^|_)test($|_)/i.test(base)) throw new Error('Use a test database name in .env.test');
    const dbName = `${base}_run_${Date.now()}_${process.pid}`;
    try { await mongoose.connect(process.env.MONGODB_URI.replace('localhost','127.0.0.1'), { dbName, serverSelectionTimeoutMS: 5000, autoIndex: false }); }
    catch(error) { await mongoose.disconnect(); throw error; }
    t.after(async () => { if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
    await Promise.all(Object.values(mongoose.models).map(model => model.createCollection()));
};
