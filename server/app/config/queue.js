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
        timeout: 30000,
        removeOnComplete: 100,
        removeOnFail: 500
    }
});

// Optional: Add queue monitoring
const setupQueueEvents = () => {
    emailQueue.on('error', (error) => {
        console.error('Email queue error:', error);
    });

    cloudinaryQueue.on('error', (error) => {
        console.error('Cloudinary queue error:', error);
    });

    emailQueue.on('waiting', (jobId) => {
        console.log(`Email job ${jobId} is waiting`);
    });

    cloudinaryQueue.on('waiting', (jobId) => {
        console.log(`Cloudinary job ${jobId} is waiting`);
    });
};

module.exports = { emailQueue, cloudinaryQueue, setupQueueEvents };