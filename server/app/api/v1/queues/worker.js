// queues/worker.js - FIXED
const { emailQueue, cloudinaryQueue } = require('@/config/queue');

// ✅ Define setupQueueEvents here if not exported
const setupQueueEvents = () => {
    // Basic Error Listeners
    emailQueue.on('error', (error) => console.error('❌ Email queue error:', error));
    cloudinaryQueue.on('error', (error) => console.error('❌ Cloudinary queue error:', error));

    cloudinaryQueue.on('failed', (job, err) => {
        console.error(`\n❌ [FAILED JOB] Cloudinary ID: ${job.id}`);
        console.error(`   Reason: ${err.message}`);
        console.error(`   Data:`, JSON.stringify(job.data).substring(0, 200));
        console.error(`-----------------------------------------\n`);
    });

    emailQueue.on('failed', (job, err) => {
        console.error(`❌ [FAILED JOB] Email ID: ${job.id} | Reason: ${err.message}`);
    });

    emailQueue.on('completed', (job) => console.log(`✅ Email ${job.id} sent`));
    cloudinaryQueue.on('completed', (job) => console.log(`✅ Cloudinary ${job.id} uploaded`));
};

// ✅ Call setupQueueEvents
setupQueueEvents();

// Import processors
const emailProcessor = require('./emailProcessor');
const cloudinaryProcessor = require('./cloudinaryProcessor');

// Email processors
emailQueue.process('welcome-email', async (job) => {
    console.log(`Processing email job ${job.id}:`, job.data.type);
    return await emailProcessor(job);
});

emailQueue.process('booking_confirmation', async (job) => {
    console.log(`Processing email job ${job.id}:`, job.data.type);
    return await emailProcessor(job);
});

emailQueue.process('booking_completion', async (job) => {
    console.log(`Processing email job ${job.id}:`, job.data.type);
    return await emailProcessor(job);
});

emailQueue.process('password_reset', async (job) => {
    console.log(`Processing email job ${job.id}:`, job.data.type);
    return await emailProcessor(job);
});

// Fallback for any email job
emailQueue.process('*', async (job) => {
    console.log(`Processing email job ${job.id} (fallback):`, job.data.type);
    return await emailProcessor(job);
});

// Cloudinary processors
cloudinaryQueue.process('upload', async (job) => {
    console.log(`Processing cloudinary job ${job.id}:`, job.data.action);
    return await cloudinaryProcessor(job);
});

cloudinaryQueue.process('delete', async (job) => {
    console.log(`Processing cloudinary job ${job.id}:`, job.data.action);
    return await cloudinaryProcessor(job);
});

// Fallback for any cloudinary job
cloudinaryQueue.process('*', async (job) => {
    console.log(`Processing cloudinary job ${job.id} (fallback):`, job.data.action);
    return await cloudinaryProcessor(job);
});

// Event handlers for email queue
emailQueue.on('completed', (job, result) => {
    console.log(`✅ Email job ${job.id} completed: ${result?.type || 'unknown'}`);
});

emailQueue.on('failed', (job, err) => {
    console.error(`❌ Email job ${job.id} failed:`, err.message);
});

// Event handlers for cloudinary queue
cloudinaryQueue.on('completed', (job, result) => {
    console.log(`✅ Cloudinary job ${job.id} completed`);
});

cloudinaryQueue.on('failed', (job, err) => {
    console.error(`❌ Cloudinary job ${job.id} failed:`, err.message);
});

console.log('🚀 Queue workers started');
console.log('   - Email queue processor ready (types: welcome-email, booking_confirmation, booking_completion, password_reset)');
console.log('   - Cloudinary queue processor ready (types: upload, delete)');

module.exports = { emailQueue, cloudinaryQueue };