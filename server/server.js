const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const routes = require('@/api/v1/routes/routes'); 
const { errorConverter, errorHandler } = require('@/api/v1/middleware/errorHandler');
const ApiError = require('@/api/v1/utils/ApiError');
const path = require('path');
const app = express();
const os = require('os');
const antiDdos = require('@/api/v1/middleware/antiDdos');

// ============ QUEUE INITIALIZATION ==========
let workersStarted = false;
let emailQueueReady = false;
let cloudinaryQueueReady = false;
let emailQueue = null;
let cloudinaryQueue = null;

const initQueues = async () => {
    try {
        const { emailQueue: eq, cloudinaryQueue: cq } = require('@/api/v1/queues/worker');
        emailQueue = eq;
        cloudinaryQueue = cq;
        
        // Track connection status
        let emailConnected = false;
        let cloudinaryConnected = false;
        
        // Set up event listeners first
        emailQueue.client.on('ready', () => {
            emailConnected = true;
            emailQueueReady = true;
            console.log('✅ Email queue connected to Redis');
        });
        
        cloudinaryQueue.client.on('ready', () => {
            cloudinaryConnected = true;
            cloudinaryQueueReady = true;
            console.log('✅ Cloudinary queue connected to Redis');
        });
        
        emailQueue.client.on('error', (err) => {
            console.error('❌ Email queue Redis error:', err.message);
        });
        
        cloudinaryQueue.client.on('error', (err) => {
            console.error('❌ Cloudinary queue Redis error:', err.message);
        });
        
        // Wait for connections (or timeout after 15 seconds)
        await new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (emailConnected && cloudinaryConnected) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);
            
            // Timeout after 15 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                console.log('⚠️ Queue connection timeout (15s), continuing with available connections...');
                resolve();
            }, 15000);
        });
        
        workersStarted = emailQueueReady || cloudinaryQueueReady;
        
        console.log('\n🚀 ========== QUEUE WORKERS ==========');
        console.log(`📧 Email Queue: ${emailQueueReady ? '✅ READY' : '❌ OFFLINE'}`);
        console.log(`☁️ Cloudinary Queue: ${cloudinaryQueueReady ? '✅ READY' : '❌ OFFLINE'}`);
        console.log('====================================\n');
        
        // Log queue stats after connections are established
        if (emailQueueReady || cloudinaryQueueReady) {
            setTimeout(async () => {
                try {
                    const emailCounts = emailQueueReady ? await emailQueue.getJobCounts() : null;
                    const cloudinaryCounts = cloudinaryQueueReady ? await cloudinaryQueue.getJobCounts() : null;
                    
                    console.log('📊 ========== QUEUE STATUS ==========');
                    if (emailCounts) {
                        console.log(`📧 Email: waiting:${emailCounts.waiting || 0} active:${emailCounts.active || 0} completed:${emailCounts.completed || 0} failed:${emailCounts.failed || 0}`);
                    }
                    if (cloudinaryCounts) {
                        console.log(`☁️ Cloudinary: waiting:${cloudinaryCounts.waiting || 0} active:${cloudinaryCounts.active || 0} completed:${cloudinaryCounts.completed || 0} failed:${cloudinaryCounts.failed || 0}`);
                    }
                    console.log('====================================\n');
                } catch (err) {
                    // Silent fail for stats
                }
            }, 2000);
        }
        
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            console.log('\n⚠️ Bull queue not installed. Email and uploads will run synchronously.');
            console.log('   To enable queues: npm install bull ioredis\n');
        } else if (error.message?.includes('Redis')) {
            console.log('\n⚠️ Redis not available. Queue workers disabled.');
            console.log('   To enable queues: docker run -d --name redis -p 6379:6379 redis\n');
        } else {
            console.warn('\n⚠️ Queue workers not started:', error.message);
        }
    }
};

// Initialize queues (don't block server startup)
initQueues();

const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
};
const NETWORK_URL = `http://${getLocalIp()}:5173`;

const ALLOWED_ORIGIN = process.env.VITE_API_URL || NETWORK_URL;

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);
app.use(antiDdos.detectAttack);
app.use(antiDdos.gatekeeper);
app.use(antiDdos.globalLimiter);
app.use(antiDdos.responseMonitor);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);

            const allowed = [
                ALLOWED_ORIGIN,
                // Production frontend
                process.env.VITE_API_URL,
                // Any localhost (any port)
                /^http:\/\/localhost(:\d+)?$/,
                // Any 192.168.x.x — local WiFi
                /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
                // Any 10.x.x.x
                /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
                // Any public IP (x.x.x.x)
                /^http:\/\/\d+\.\d+\.\d+\.\d+(:\d+)?$/
            ].filter(Boolean);

            const isAllowed = allowed.some(p =>
                p instanceof RegExp ? p.test(origin) : p === origin
            );

            isAllowed ? callback(null, true) : callback(new Error(`CORS blocked: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-app-fingerprint', 'accept'],
    })
);

app.get('/api/v1/maintenance/status', async (req, res) => {
    try {
        const { Settings } = require('@/api/v1/models');
        const maintenanceMode = await Settings.findOne({ key: 'maintenance_mode' });
        const maintenanceMessage = await Settings.findOne({ key: 'maintenance_message' });
        
        res.json({
            success: true,
            maintenance: maintenanceMode?.value === true, 
            message: maintenanceMessage?.value || 'System is under maintenance. Please check back later.'
        });
    } catch (error) {
        console.error('Maintenance status error:', error);
        res.json({ success: true, maintenance: false });
    }
});

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.get('/api/v1/health/antiddos-status', (req, res) => {
    res.json(antiDdos.getStatus());
});
app.get('/health', (req, res) => {
    const now = new Date();
    
    // Force Philippines timezone for display
    const timeString = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    
    const dateString = now.toLocaleDateString('en-US', {
        timeZone: 'Asia/Manila',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    
    res.status(200).json({
        success: true,
        status: 'online',
        message: 'FlexSpace API - System Online',
        timestamp: `${dateString} | ${timeString}`,
        uptime: process.uptime(),
        memory: process.memoryUsage().rss / 1024 / 1024 // MB
    });
});

app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

app.use('/api/v1', routes);

app.use((req, res, next) => {
    next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
});
app.use(errorConverter);
app.use(errorHandler);

module.exports = app;