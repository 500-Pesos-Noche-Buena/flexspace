// app.js - COMPLETE FIXED VERSION
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
const { captureRequest } = require('@/api/v1/utils/logsActivity');
const autoLogger = require('@/api/v1/middleware/autoLogger');

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
        
        let emailConnected = false;
        let cloudinaryConnected = false;
        
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
        
        await new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (emailConnected && cloudinaryConnected) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);
            
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
        
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            console.log('\n⚠️ Bull queue not installed. Email and uploads will run synchronously.');
        } else if (error.message?.includes('Redis')) {
            console.log('\n⚠️ Redis not available. Queue workers disabled.');
        } else {
            console.warn('\n⚠️ Queue workers not started:', error.message);
        }
    }
};

// Initialize queues
initQueues();

// ============ MIDDLEWARE SETUP ==========

// 1. Morgan - Logging (FIRST)
app.use(morgan('dev'));

// 2. CORS - Configured properly for Vercel + Render
const allowedOrigins = [
    // Local development
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000',
    /^http:\/\/localhost(:\d+)?$/,
    
    // Vercel production URLs
    'https://flexspace-iloilo.vercel.app',
    /^https:\/\/.*\.vercel\.app$/,
    
    // Render backend (for API calls from itself)
    'https://flexspace-z079.onrender.com',
    /^https:\/\/.*\.onrender\.com$/,
    
    // Any 192.168.x.x — local WiFi
    /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
    // Any 10.x.x.x
    /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
];

// Log allowed origins in production
if (process.env.NODE_ENV === 'production') {
    console.log('🔒 CORS Allowed Origins:');
    allowedOrigins.forEach(origin => {
        if (typeof origin === 'string') {
            console.log(`  - ${origin}`);
        } else {
            console.log(`  - ${origin.toString()}`);
        }
    });
}

// CORS middleware - this handles OPTIONS preflight automatically
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, postman)
            if (!origin) {
                return callback(null, true);
            }

            // Check if origin is allowed
            const isAllowed = allowedOrigins.some(pattern => {
                if (typeof pattern === 'string') {
                    return pattern === origin;
                }
                // Regex pattern
                return pattern.test(origin);
            });

            if (isAllowed) {
                callback(null, true);
            } else {
                console.log(`❌ CORS blocked: ${origin}`);
                callback(new Error(`CORS blocked: ${origin}`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'x-app-fingerprint',
            'accept',
            'origin',
            'x-requested-with'
        ],
        exposedHeaders: ['Content-Range', 'X-Content-Range'],
        maxAge: 86400 // 24 hours
    })
);

// 3. Body parsers - SINGLE instance with proper limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 4. Anti-DDoS (only in production)
const ENABLE_DDOS = process.env.NODE_ENV === 'production';
if (ENABLE_DDOS) {
    console.log('🛡️ Anti-DDoS protection enabled');
    app.use(antiDdos.detectAttack);
    app.use(antiDdos.gatekeeper);
    app.use(antiDdos.globalLimiter);
    app.use(antiDdos.responseMonitor);
} else {
    console.log('🔧 Anti-DDoS protection disabled for development');
}

// ============ STATIC FILES ==========
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ============ HEALTH ROUTES ==========

// Maintenance status
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

// Anti-DDoS status
app.get('/api/v1/health/antiddos-status', (req, res) => {
    res.json(antiDdos.getStatus());
});

// Health check
app.get('/health', (req, res) => {
    const now = new Date();
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
        memory: process.memoryUsage().rss / 1024 / 1024,
        workersStarted,
        emailQueueReady,
        cloudinaryQueueReady,
        queues: {
            email: emailQueueReady ? 'ready' : 'offline',
            cloudinary: cloudinaryQueueReady ? 'ready' : 'offline'
        }
    });
});

// Simple ping for keep-alive
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'FlexSpace API is running',
        version: 'v1',
        status: 'online',
        timestamp: new Date().toISOString(),
    });
});

// ============ API ROUTES ==========
app.use(captureRequest);
app.use(autoLogger);
app.use('/api/v1', routes);

// ============ ERROR HANDLING ==========

// 404 handler
app.use((req, res, next) => {
    next(new ApiError(HTTP_STATUS.NOT_FOUND, `Route ${req.method} ${req.originalUrl} not found`));
});

// Error converters
app.use(errorConverter);
app.use(errorHandler);

module.exports = app;