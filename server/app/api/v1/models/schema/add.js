// removeExtraFields.js
const mongoose = require('mongoose');
const User = require('./User'); // adjust path to your user.js

async function connectDB() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect('mongodb://localhost:27017/co_working');
        console.log('MongoDB connected');
    }
}

async function cleanupUsers() {
    await connectDB();

    // Remove fields from users that are NOT space owners
    const result = await User.updateMany(
        { role: { $ne: 'space' } }, // everything except space
        {
            $unset: {
                status: "",
                business_permit: "",
                dti_sec_reg: ""
            }
        }
    );

    console.log(`Users matched (non-space): ${result.matchedCount}`);
    console.log(`Users modified: ${result.modifiedCount}`);

    mongoose.disconnect();
}

cleanupUsers()
    .then(() => console.log('Cleanup completed successfully.'))
    .catch(err => {
        console.error('Cleanup failed:', err);
        mongoose.disconnect();
    });