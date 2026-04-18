const express = require('express');
const userController = require('@/api/v1/controllers/admin/userController');
const spaceController = require('@/api/v1/controllers/admin/spaceController');
const dashboardController = require('@/api/v1/controllers/admin/dashboardController');
const auth = require('@/api/v1/middleware/authMiddleware');
const settingsController = require('@/api/v1/controllers/admin/settingsController');
const earningController = require('@/api/v1/controllers/admin/earningController');

class AdminRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes = () => {
        console.log('--- 🛡️ Initializing Admin Routes (Arrow Mode) ---');
        
        this.router.get('/dashboard', auth, (req, res, next) => dashboardController.index(req, res, next));

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

        this.router.get('/earnings', (req, res, next) => earningController.index(req, res, next));
        this.router.post('/earnings/collect', (req, res, next) => earningController.collect(req, res, next));
    };

    getRouter = () => this.router;
}

module.exports = new AdminRoutes().getRouter();