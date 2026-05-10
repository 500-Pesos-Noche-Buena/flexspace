const express = require('express');
const path = require('path');
const userController = require('@/api/v1/controllers/admin/userController');
const spaceController = require('@/api/v1/controllers/admin/spaceController');
const dashboardController = require('@/api/v1/controllers/admin/dashboardController');
const auth = require('@/api/v1/middleware/authMiddleware');
const queueAuth = require('@/api/v1/middleware/queueMiddleware');
const settingsController = require('@/api/v1/controllers/admin/settingsController');
const earningController = require('@/api/v1/controllers/admin/earningController');
const voucherController = require('@/api/v1/controllers/admin/voucherController');
const insightsController = require('@/api/v1/controllers/admin/insightsController');
const queueController = require('@/api/v1/controllers/admin/queueController');
const logsController = require('@/api/v1/controllers/admin/logsController');

const districtController = require('@/api/v1/controllers/admin/location/districtController');

const { ActivityLog } = require('@/api/v1/models');

// ========== QUEUE DASHBOARD IMPORTS ==========
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { emailQueue, cloudinaryQueue } = require('@/config/queue');

class AdminRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeQueueDashboard();
        this.initializeRoutes();
    }

    initializeQueueDashboard = () => {
        const serverAdapter = new ExpressAdapter();

        serverAdapter.setBasePath('/api/v1/admin/queues');

        createBullBoard({
            queues: [
                new BullAdapter(emailQueue),
                new BullAdapter(cloudinaryQueue)
            ],
            serverAdapter: serverAdapter,
        });

        this.router.use('/queues', queueAuth);
        this.router.use('/queues', serverAdapter.getRouter());

        console.log('📊 Queue Dashboard initialized at /api/v1/admin/queues');
        console.log('   - Protected with JWT Admin auth ✅');
        console.log('   - Email Queue: ✅');
        console.log('   - Cloudinary Queue: ✅');
    };

    initializeRoutes = () => {
        console.log('--- 🛡️ Initializing Admin Routes (Arrow Mode) ---');

        this.router.get('/dashboard', auth, (req, res, next) => dashboardController.index(req, res, next));
        this.router.get('/dashboard/occupancy', auth, (req, res, next) => dashboardController.getPlatformOccupancy(req, res, next));
        this.router.get('/dashboard/revenue-trend', auth, (req, res, next) => dashboardController.getPlatformRevenueTrend(req, res, next));
        this.router.get('/dashboard/top-spaces', auth, (req, res, next) => dashboardController.getTopSpaces(req, res, next));
        this.router.get('/dashboard/user-growth', auth, (req, res, next) => dashboardController.getUserGrowth(req, res, next));

        this.router.get('/users', auth, (req, res, next) => userController.index(req, res, next));
        this.router.post('/users/:id/toggle', auth, (req, res, next) => userController.toggleStatus(req, res, next));
        this.router.put('/users/:id', auth, (req, res, next) => userController.update(req, res, next));
        this.router.delete('/users/:id', auth, (req, res, next) => userController.destroy(req, res, next));

        this.router.get('/space/management', auth, (req, res, next) => spaceController.index(req, res, next));
        this.router.post('/space/management/:id/toggle', auth, (req, res, next) => spaceController.toggleStatus(req, res, next));
        this.router.put('/space/management/:id', auth, (req, res, next) => spaceController.update(req, res, next));
        this.router.delete('/space/management/:id', auth, (req, res, next) => spaceController.destroy(req, res, next));

        this.router.get('/space/requests', auth, (req, res, next) => spaceController.requests(req, res, next));
        this.router.post('/space/requests/:id/approve', auth, (req, res, next) => spaceController.approve(req, res, next));
        this.router.post('/space/requests/:id/reject', auth, (req, res, next) => spaceController.reject(req, res, next));

        this.router.put('/settings', auth, (req, res, next) => settingsController.update(req, res, next));
        this.router.get('/settings', auth, (req, res, next) => settingsController.index(req, res, next));

        this.router.get('/earnings', auth, (req, res, next) => earningController.index(req, res, next));
        this.router.post('/earnings/collect', auth, (req, res, next) => earningController.collect(req, res, next));

        this.router.get('/vouchers', auth, (req, res, next) => voucherController.index(req, res, next));
        this.router.post('/vouchers', auth, (req, res, next) => voucherController.create(req, res, next));
        this.router.post('/vouchers/:id/delete', auth, (req, res, next) => voucherController.delete(req, res, next));

        this.router.get('/insights', auth, (req, res, next) => insightsController.getStats(req, res, next));
        this.router.put('/analytics', auth, (req, res, next) => insightsController.updateStats(req, res, next));

        this.router.get('/queue/email/counts', auth, (req, res, next) => queueController.getEmailCounts(req, res, next));
        this.router.get('/queue/cloudinary/counts', auth, (req, res, next) => queueController.getCloudinaryCounts(req, res, next));
        this.router.get('/queue/failed-jobs', auth, (req, res, next) => queueController.getFailedJobs(req, res, next));
        this.router.get('/queue/:queueName/retry/:jobId', auth, (req, res, next) => queueController.retryJob(req, res, next));
        this.router.get('/queue/:queueName/retry-all', auth, (req, res, next) => queueController.retryAllFailed(req, res, next));
        this.router.get('/queue/:queueName/clean-completed', auth, (req, res, next) => queueController.cleanCompleted(req, res, next));

        this.router.get('/activity-logs', auth, (req, res, next) => logsController.getActivityLogs(req, res, next));
        this.router.get('/activity-logs/stats', auth, (req, res, next) => logsController.getStats(req, res, next));
        this.router.get('/activity-logs/recent', auth, (req, res, next) => logsController.getRecentActivity(req, res, next));
        this.router.get('/activity-logs/export', auth, (req, res, next) => logsController.exportLogs(req, res, next));
        this.router.delete('/activity-logs/cleanup', auth, (req, res, next) => logsController.cleanupOldLogs(req, res, next));


        this.router.get('/locations/districts', auth, (req, res, next) => districtController.index(req, res, next));
        this.router.post('/locations/districts', auth, (req, res, next) => districtController.store(req, res, next));
        this.router.put('/locations/districts/:id', auth, (req, res, next) => districtController.update(req, res, next));
        this.router.delete('/locations/districts/:id', auth, (req, res, next) => districtController.destroy(req, res, next));
    };

    getRouter = () => this.router;
}

module.exports = new AdminRoutes().getRouter();