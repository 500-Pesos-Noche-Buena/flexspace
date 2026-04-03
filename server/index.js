require('module-alias/register');
const dotenv = require('dotenv');
const path = require('path');

if (process.env.NODE_ENV === 'production') {
    dotenv.config();
    console.log('[Env] Production mode: Using system environment variables.');
} else {
    dotenv.config({
        path: path.resolve(__dirname, '.env'),
    });
    console.log('[Env] Development mode: Loading variables from .env file.');
}

const config = require('./app/config/config'); 
const db = require('./app/config/mongodb'); 

const app = require('./server');

async function startServer() {
    try {
        await db.connectToMongoDB();
        
        app.listen(config.port, () => {
            console.log(`[Server] Running on http://localhost:${config.port}`);
            console.log(`[Server] Mode: ${config.env}`);
        });

    } catch (err) {
        console.error('❌ Server failed to start:', err);
        process.exit(1); 
    }
}

startServer();

// const bcrypt = require('bcrypt');
// bcrypt.hash("123123", 10).then(hash => {
//     console.log("-----------------------------------------");
//     console.log("COPY THIS HASH FOR PASSWORD '123123':");
//     console.log(hash);
//     console.log("-----------------------------------------");
// });