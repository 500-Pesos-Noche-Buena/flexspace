// config/queue.js - FIXED
const Queue = require('bull');
const config = require('./config');

// Create queues using config.redis
const emailQueue = new Queue('email-queue', {
    redis: config.redis.getConnectionConfig(),
    defaultJobOptions: {
        attempts: config.email.queue.attempts,
        backoff: {
            type: 'exponential',
            delay: config.email.queue.backoffDelay
        },
        removeOnComplete: 100,
        removeOnFail: 500
    }
});

const cloudinaryQueue = new Queue('cloudinary-queue', {
    redis: config.redis.getConnectionConfig(),
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        timeout: 60000,
        removeOnComplete: 100,
        removeOnFail: 500
    }
});

// ✅ FIX: Define setupQueueEvents function
const setupQueueEvents = () => {
    // Basic Error Listeners
    emailQueue.on('error', (error) => console.error('❌ Email queue error:', error));
    cloudinaryQueue.on('error', (error) => console.error('❌ Cloudinary queue error:', error));

    // Detailed failure logging
    cloudinaryQueue.on('failed', (job, err) => {
        console.error(`\n❌ [FAILED JOB] Cloudinary ID: ${job.id}`);
        console.error(`   Reason: ${err.message}`);
        console.error(`   Data:`, JSON.stringify(job.data).substring(0, 200));
        console.error(`-----------------------------------------\n`);
    });

    emailQueue.on('failed', (job, err) => {
        console.error(`❌ [FAILED JOB] Email ID: ${job.id} | Reason: ${err.message}`);
    });

    // Activity logging
    emailQueue.on('completed', (job) => console.log(`✅ Email ${job.id} sent`));
    cloudinaryQueue.on('completed', (job) => console.log(`✅ Cloudinary ${job.id} uploaded`));

    // Stalled jobs
    cloudinaryQueue.on('stalled', (job) => {
        console.warn(`⚠️ [STALLED] Cloudinary job ${job.id} stalled`);
    });

    emailQueue.on('stalled', (job) => {
        console.warn(`⚠️ [STALLED] Email job ${job.id} stalled`);
    });
};

// ✅ Add retryFailedJobs function
const retryFailedJobs = async (queueName = 'cloudinary') => {
    const queue = queueName === 'email' ? emailQueue : cloudinaryQueue;
    const failedJobs = await queue.getFailed();
    
    if (failedJobs.length === 0) {
        console.log(`✨ No failed jobs found in ${queueName} queue.`);
        return;
    }

    console.log(`🔄 Re-running ${failedJobs.length} failed jobs in ${queueName}...`);
    await Promise.all(failedJobs.map(job => job.retry()));
};

// ✅ Export everything
module.exports = { 
    emailQueue, 
    cloudinaryQueue, 
    setupQueueEvents, 
    retryFailedJobs 
};