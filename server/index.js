require('module-alias/register');
const dotenv = require('dotenv');
const path = require('path');
const https = require('https');
const http = require('http');

if (process.env.NODE_ENV === 'production') {
    dotenv.config();
    console.log('-----------------------------------------');
    console.log('🚀 [Env] Mode: PRODUCTION');
    console.log('📌 Source: System Environment Variables');
    console.log('-----------------------------------------');
} else {
    dotenv.config({
        path: path.resolve(__dirname, '.env'),
    });
    console.log('-----------------------------------------');
    console.log('🛠️ [Env] Mode: DEVELOPMENT');
    console.log('📌 Source: .env file');
    console.log('-----------------------------------------');
}

const config = require('./app/config/config'); 
const db = require('./app/config/mongodb'); 
const app = require('./server');

async function startServer() {
    try {
        await db.connectToMongoDB();
        
        const PORT = process.env.PORT || config.port || 5000;

        app.listen(PORT, () => {
            console.log(`✅ [Server] Status: ONLINE`);
            console.log(`🔗 [Server] URL: http://localhost:${PORT}`);
            console.log(`🌍 [Server] Mode: ${process.env.NODE_ENV || 'development'}`);
            console.log('-----------------------------------------');

            if (process.env.NODE_ENV === 'production') {
                const siteUrl = process.env.VITE_API_URL; 
                const FIVE_MINUTES = 5 * 60 * 1000;

                if (siteUrl && siteUrl.startsWith('http')) {
                    console.log(`📡 [Keep-Alive]: Auto-pinging ${siteUrl}/health`);

                    setInterval(() => {
                        const protocol = siteUrl.startsWith('https') ? https : http;
                        
                        protocol.get(`${siteUrl}/health`, (res) => {
                            if (res.statusCode === 200) {
                                console.log(`✨ [Keep-Alive]: Heartbeat OK (${new Date().toLocaleTimeString()})`);
                            }
                        }).on('error', (err) => {
                            console.error('❌ [Keep-Alive]: Internal Ping failed:', err.message);
                        });
                    }, FIVE_MINUTES);
                } else {
                    console.warn('⚠️ [Keep-Alive]: Skipping ping. VITE_API_URL is not set in Render Dashboard.');
                }
            }
        });

    } catch (err) {
        console.error('❌ [Server] Failed to start:', err);
        process.exit(1); 
    }
}

startServer();