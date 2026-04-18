const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { HTTP_STATUS } = require('@/utils/constants');
const routes = require('@/api/v1/routes/routes'); 
const { errorConverter, errorHandler } = require('@/api/v1/middleware/errorHandler');
const ApiError = require('@/utils/ApiError');
const path = require('path');
const app = express();
const os = require('os');

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
app.set('trust proxy', true);

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

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Health endpoint - no auth required, lightweight response
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