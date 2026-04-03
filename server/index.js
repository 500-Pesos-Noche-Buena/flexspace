require('module-alias/register');
const dotenv = require('dotenv');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');

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

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

async function startServer() {
    try {
        await db.connectToMongoDB();
        
        const PORT = process.env.PORT || config.port || 5000;
        const LOCAL_IP = getLocalIp();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ [Server] Status: ONLINE`);
            console.log(`🔗 [Local]:   http://localhost:${PORT}`);
            console.log(`📱 [Network]: http://${LOCAL_IP}:${PORT}  <-- USE THIS ON YOUR PHONE`);
            console.log(`🌍 [Mode]:    ${process.env.NODE_ENV || 'development'}`);
            console.log('-----------------------------------------');

            if (process.env.NODE_ENV === 'production') {
                const siteUrl = process.env.VITE_API_URL; 
                const FIVE_MINUTES = 5 * 60 * 1000;

                if (siteUrl && siteUrl.startsWith('http')) {
                    const baseUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
                    const PING_URL = `${baseUrl}/health`;

                    console.log(`📡 [Keep-Alive]: Monitoring initialized for ${PING_URL}`);

                    setInterval(() => {
                        const protocol = PING_URL.startsWith('https') ? https : http;
                        
                        protocol.get(PING_URL, (res) => {
                            if (res.statusCode === 200) {
                                const now = new Date().toLocaleTimeString('en-US', { 
                                    timeZone: 'Asia/Manila', 
                                    hour12: true 
                                });
                                console.log(`✨ [Keep-Alive]: Heartbeat successful at ${now}`);
                            }
                        }).on('error', (err) => {
                            console.error('❌ [Keep-Alive]: Ping failed:', err.message);
                        });
                    }, FIVE_MINUTES);
                } else {
                    console.warn('⚠️ [Keep-Alive]: VITE_API_URL is missing or invalid.');
                }
            }
        });

    } catch (err) {
        console.error('❌ [Server] Failed to start:', err);
        process.exit(1); 
    }
}

startServer();