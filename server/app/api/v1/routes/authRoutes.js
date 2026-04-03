const express = require('express');
const authController = require('@/api/v1/controllers/authController');

class AuthRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.post('/login', authController.login);
        this.router.post('/register', authController.register);
        this.router.post('/logout', authController.logout);
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new AuthRoutes().getRouter();