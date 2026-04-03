const express = require('express');
// 1. Double check this path and casing!
const authController = require('@/api/v1/controllers/authController');

class AuthRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        console.log('--- 🛡️ Initializing Auth Routes ---');
        
        if (!authController.login) {
            console.error('❌ ERROR: authController.login is undefined! Check your controller exports.');
        }
        
        this.router.post('/login', (req, res, next) => authController.login(req, res, next));
        this.router.post('/register', (req, res, next) => authController.register(req, res, next));
        this.router.post('/logout', (req, res, next) => authController.logout(req, res, next));
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new AuthRoutes().getRouter();