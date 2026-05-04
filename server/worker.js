// server/worker.js
require('module-alias/register');

const config = require('@/config/config');

console.log('🚀 Email Worker Starting...');
console.log(`📧 Queue enabled: ${config.email?.queue?.enabled || false}`);

// If queue is disabled, just idle (don't crash)
if (!config.email?.queue?.enabled) {
    console.log('📧 Email queue is DISABLED. Worker running in IDLE mode.');
    console.log('💡 To enable queue:');
    console.log('   1. Set ENABLE_EMAIL_QUEUE=true in .env');
    console.log('   2. Start Redis server or use Render Redis');
    console.log('');
    console.log('✅ Worker is idle. Press Ctrl+C to stop.');
    
    // Keep process alive but do nothing
    setInterval(() => {}, 1000);
    return;
}

// Only load BullMQ if queue is enabled
const { Worker } = require('bullmq');
const Redis = require('ioredis');
const emailService = require('@/services/emailService');

// Configure Redis connection - CRITICAL: no maxRetriesPerRequest
let connectionConfig;
if (config.redis?.url) {
    connectionConfig = { url: config.redis.url };
} else {
    connectionConfig = {
        host: config.redis?.host || 'localhost',
        port: config.redis?.port || 6379,
        password: config.redis?.password,
    };
}

// DO NOT add maxRetriesPerRequest - BullMQ requires it to be null
const connection = new Redis(connectionConfig);

connection.on('connect', () => {
    console.log('✅ Redis connected successfully');
});

connection.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
    if (err.code === 'ECONNREFUSED') {
        console.error('');
        console.error('⚠️  Redis is not running!');
        console.error('   For local dev: sudo systemctl start redis-server');
        console.error('   Or disable queue: ENABLE_EMAIL_QUEUE=false');
        console.error('');
    }
    process.exit(1);
});

// Map queue job types
const emailHandlers = {
    'welcome': (data) => emailService._sendWelcomeDirect(data),
    'booking_confirmation': (data) => emailService._sendBookingConfirmationDirect(data),
    'voucher': (data) => emailService._sendVoucherDirect(data),
    'password_reset': (data) => emailService._sendPasswordResetDirect(data),
    'otp': (data) => emailService._sendOTPDirect(data),
    'password_reset_confirm': (data) => emailService._sendPasswordResetConfirmDirect(data),
    'booking_completion': (data) => emailService._sendBookingCompletionDirect(data),
    'space_approval': (data) => emailService._sendSpaceApprovalDirect(data),
    'space_rejection': (data) => emailService._sendSpaceRejectionDirect(data)
};

connection.on('ready', () => {
    const worker = new Worker('emailQueue', async (job) => {
        console.log(`📧 Processing ${job.name} - Attempt ${job.attemptsMade + 1}`);
        const handler = emailHandlers[job.name];
        if (!handler) throw new Error(`Unknown email type: ${job.name}`);
        
        const result = await handler(job.data);
        if (!result.success) throw new Error(result.error);
        
        console.log(`✅ ${job.name} sent successfully`);
        return result;
    }, { 
        connection, 
        concurrency: config.email.queue.concurrency || 5
    });
    
    worker.on('completed', (job) => console.log(`🎉 Job ${job.id} completed`));
    worker.on('failed', (job, err) => console.error(`❌ Job failed: ${err.message}`));
    
    console.log('✅ Email worker is running and waiting for jobs...');
});