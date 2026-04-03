const express = require('express');
const auth = require('@/api/v1/middleware/authMiddleware');
const userController = require('@/api/v1/controllers/userController');

class AuthRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.get('/profile', auth, userController.getProfile);
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new AuthRoutes().getRouter();