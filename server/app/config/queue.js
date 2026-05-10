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
        timeout: 60000, // Increased to 60s for Iloilo upload speeds
        removeOnComplete: 100,
        removeOnFail: 500
    }
});

/**
 * The "Artisan Retry" equivalent for Node.js
 * Call this to move jobs from 'failed' back to 'waiting'
 */
const retryFailedJobs = async (queueName = 'cloudinary') => {
    const queue = queueName === 'email' ? emailQueue : cloudinaryQueue;
    const failedJobs = await queue.getFailed();
    
    if (failedJobs.length === 0) {
        console.log(`✨ No failed jobs found in ${queueName} queue.`);
        return;
    }

    console.log(`re-running ${failedJobs.length} failed jobs in ${queueName}...`);
    await Promise.all(failedJobs.map(job => job.retry()));
};

// Optional: Add queue monitoring
const setupQueueEvents = () => {
    // Basic Error Listeners
    emailQueue.on('error', (error) => console.error('Email queue error:', error));
    cloudinaryQueue.on('error', (error) => console.error('Cloudinary queue error:', error));

    // DETAILED FAILURE LOGGING (This shows you the actual error)
    cloudinaryQueue.on('failed', (job, err) => {
        console.error(`\n❌ [FAILED JOB] Cloudinary ID: ${job.id}`);
        console.error(`   Reason: ${err.message}`); 
        console.error(`   Data:`, job.data); // Shows which file/params failed
        console.error(`-----------------------------------------\n`);
    });

    emailQueue.on('failed', (job, err) => {
        console.error(`❌ [FAILED JOB] Email ID: ${job.id} | Reason: ${err.message}`);
    });

    // Activity logging
    emailQueue.on('completed', (job) => console.log(`✅ Email ${job.id} sent`));
    cloudinaryQueue.on('completed', (job) => console.log(`✅ Cloudinary ${job.id} uploaded`));
};

module.exports = { 
    emailQueue, 
    cloudinaryQueue, 
    setupQueueEvents, 
    retryFailedJobs // Exported for use in your controller or console
};