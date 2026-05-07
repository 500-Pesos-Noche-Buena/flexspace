const { emailQueue, cloudinaryQueue, setupQueueEvents } = require('@/config/queue');
const emailProcessor = require('./emailProcessor');
const cloudinaryProcessor = require('./cloudinaryProcessor');

// Setup event listeners
setupQueueEvents();

// IMPORTANT: Add processors for specific job types
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

// Process ANY email job (fallback)
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

// Process ANY cloudinary job (fallback)
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