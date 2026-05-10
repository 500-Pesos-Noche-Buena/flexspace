const { emailQueue, cloudinaryQueue } = require('@/config/queue');

class QueueController {
    // Get email queue counts
    async getEmailCounts(req, res) {
        try {
            const counts = await emailQueue.getJobCounts();
            res.json({ success: true, data: counts });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Get cloudinary queue counts
    async getCloudinaryCounts(req, res) {
        try {
            const counts = await cloudinaryQueue.getJobCounts();
            res.json({ success: true, data: counts });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Get failed jobs
    async getFailedJobs(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 20;
            
            const emailFailed = await emailQueue.getFailed();
            const cloudinaryFailed = await cloudinaryQueue.getFailed();
            
            const allFailed = [
                ...emailFailed.map(job => ({
                    id: job.id,
                    queue: 'email',
                    failedReason: job.failedReason,
                    attemptsMade: job.attemptsMade,
                    attempts: job.opts.attempts,
                    failedAt: job.failedAt,
                    data: job.data
                })),
                ...cloudinaryFailed.map(job => ({
                    id: job.id,
                    queue: 'cloudinary',
                    failedReason: job.failedReason,
                    attemptsMade: job.attemptsMade,
                    attempts: job.opts.attempts,
                    failedAt: job.failedAt,
                    data: job.data
                }))
            ];
            
            // Sort by failedAt descending and limit
            allFailed.sort((a, b) => new Date(b.failedAt) - new Date(a.failedAt));
            
            res.json({ 
                success: true, 
                data: allFailed.slice(0, limit) 
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Retry a specific job
    async retryJob(req, res) {
        try {
            const { queueName, jobId } = req.params;
            const queue = queueName === 'email' ? emailQueue : cloudinaryQueue;
            
            const job = await queue.getJob(jobId);
            if (!job) {
                return res.status(404).json({ success: false, message: 'Job not found' });
            }
            
            await job.retry();
            res.json({ success: true, message: `Job ${jobId} queued for retry` });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Retry all failed jobs in a queue
    async retryAllFailed(req, res) {
        try {
            const { queueName } = req.params;
            const queue = queueName === 'email' ? emailQueue : cloudinaryQueue;
            
            const failedJobs = await queue.getFailed();
            await Promise.all(failedJobs.map(job => job.retry()));
            
            res.json({ 
                success: true, 
                message: `Retried ${failedJobs.length} failed jobs` 
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Clean completed jobs
    async cleanCompleted(req, res) {
        try {
            const { queueName } = req.params;
            const queue = queueName === 'email' ? emailQueue : cloudinaryQueue;
            
            await queue.clean(0, 'completed');
            res.json({ success: true, message: 'Completed jobs cleaned' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new QueueController();