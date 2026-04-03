const express = require('express');
const userController = require('@/api/v1/controllers/admin/userController');
const spaceController = require('@/api/v1/controllers/admin/spaceController'); // 👈 New
const dashboardController = require('@/api/v1/controllers/admin/dashboardController');
const auth = require('@/api/v1/middleware/authMiddleware');

class AdminRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.get('/dashboard', auth, dashboardController.index);

        // Standard User Management
        this.router.get('/users', auth, userController.index);
        this.router.post('/users/:id/toggle', auth, userController.toggleStatus);
        this.router.delete('/users/:id', auth, userController.destroy);
        this.router.put('/users/:id', auth, userController.update);

        // ✅ Space Management Section
        this.router.get('/space/management', auth, spaceController.index);
        this.router.post('/space/management/:id/toggle', auth, spaceController.toggleStatus);
        
        // ✅ Space Applications Section
        this.router.get('/space/requests', auth, spaceController.requests);
        this.router.post('/space/requests/:id/approve', auth, spaceController.approve);
        this.router.post('/space/requests/:id/reject', auth, spaceController.reject);
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new AdminRoutes().getRouter();