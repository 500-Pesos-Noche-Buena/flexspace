require('module-alias/register');

// --- FORCE PHILIPPINES TIMEZONE ---
process.env.TZ = 'Asia/Manila';
// ----------------------------------

const dotenv = require('dotenv');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');

if (process.env.NODE_ENV === 'production') {
    dotenv.config();
    console.log('-----------------------------------------');
    console.log('🚀 [Env] Mode: PRODUCTION');
    console.log(`⏰ [TZ]: ${process.env.TZ} (Forced)`);
    console.log('📌 Source: System Environment Variables');
    console.log('-----------------------------------------');
} else {
    dotenv.config({
        path: path.resolve(__dirname, '.env'),
    });
    console.log('-----------------------------------------');
    console.log('🛠️ [Env] Mode: DEVELOPMENT');
    console.log(`⏰ [TZ]: ${process.env.TZ} (Forced)`);
    console.log('📌 Source: .env file');
    console.log('-----------------------------------------');
}

const config = require('./app/config/config');
const db = require('./app/config/mongodb');
const app = require('./app');

// 🔥 IMPORT YOUR QUEUE SYSTEM (THIS IS THE MISSING PART!)
const { setupQueueEvents, retryFailedJobs, cloudinaryQueue } = require('./app/config/queue');

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

        // 🔥 INITIALIZE QUEUE LISTENERS (Now you'll see WHY they failed!)
        setupQueueEvents();

        // 🔥 RETRY EXISTING FAILED JOBS (Like Laravel's php artisan queue:retry all)
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔄 [Queue]: Checking for failed jobs to retry...');

            // Get and log all failed jobs with their errors
            const failedCloudinaryJobs = await cloudinaryQueue.getFailed();
            if (failedCloudinaryJobs.length > 0) {
                console.log(`\n📋 Found ${failedCloudinaryJobs.length} failed Cloudinary jobs:`);
                failedCloudinaryJobs.forEach(job => {
                    console.log(`   Job ${job.id}: ${job.failedReason}`);
                });
                console.log('🔄 Retrying all failed jobs now...\n');
                await retryFailedJobs('cloudinary');
            }

            await retryFailedJobs('email');
        }

        const PORT = process.env.PORT || config.port || 5000;
        const LOCAL_IP = getLocalIp();

        const server = app.listen(PORT, '0.0.0.0', () => {
            const serverTime = new Date().toString();
            console.log(`✅ [Server] Status: ONLINE`);
            console.log(`📅 [Time]: ${serverTime}`);
            console.log(`🔗 [Local]: http://localhost:${PORT}`);
            console.log(`📱 [Network]: http://${LOCAL_IP}:${PORT}`);
            console.log(`🌍 [Mode]: ${process.env.NODE_ENV || 'development'}`);
            console.log('-----------------------------------------');

            if (process.env.NODE_ENV === 'production') {
                const BACKEND_URL = process.env.RENDER_EXTERNAL_URL ||
                    process.env.BACKEND_URL ||
                    `http://localhost:${PORT}`;

                const cleanBackendUrl = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
                const PING_URL = `${cleanBackendUrl}/ping`;

                const ONE_MINUTE = 60 * 1000;

                console.log(`📡 [Keep-Alive]: Monitoring initialized`);
                console.log(`🎯 [Target]: ${PING_URL}`);
                console.log(`⏱️ [Interval]: Every 1 minute`);
                console.log('-----------------------------------------');

                const ping = () => {
                    const protocol = cleanBackendUrl.startsWith('https') ? https : http;

                    protocol.get(PING_URL, (res) => {
                        const now = new Date().toLocaleTimeString('en-US', {
                            timeZone: 'Asia/Manila',
                            hour12: true
                        });

                        if (res.statusCode === 200) {
                            console.log(`💓 [Keep-Alive]: Heartbeat successful at ${now}`);
                        } else {
                            console.log(`⚠️ [Keep-Alive]: Ping responded with ${res.statusCode} at ${now}`);
                        }
                    }).on('error', (err) => {
                        console.error(`❌ [Keep-Alive]: Ping failed at ${new Date().toLocaleTimeString()}:`, err.message);
                    });
                };

                ping();

                const intervalId = setInterval(ping, ONE_MINUTE);

                const gracefulShutdown = () => {
                    console.log('🛑 [Keep-Alive]: Stopping keep-alive pings...');
                    clearInterval(intervalId);
                    server.close(() => {
                        console.log('✅ [Server]: Gracefully shut down');
                        process.exit(0);
                    });
                };

                process.on('SIGTERM', gracefulShutdown);
                process.on('SIGINT', gracefulShutdown);
            }
        });

    } catch (err) {
        console.error('❌ [Server] Failed to start:', err);
        process.exit(1);
    }
}

startServer();