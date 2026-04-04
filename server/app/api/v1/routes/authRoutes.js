const express = require('express');
const authController = require('@/api/v1/controllers/authController');
const profileController = require('@/api/v1/controllers/profileController');
const upload = require('@/utils/upload');
const auth = require('@/api/v1/middleware/authMiddleware');

class AuthRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes = () => {
        console.log('--- 🛡️ Initializing Auth Routes (Profile Enabled) ---');
        
        // --- PUBLIC ROUTES ---
        this.router.post('/login', (req, res, next) => authController.login(req, res, next));
        this.router.post('/logout', (req, res, next) => authController.logout(req, res, next));

        this.router.post('/register', 
            upload.fields([
                { name: 'business_permit', maxCount: 1 },
                { name: 'dti_sec_reg', maxCount: 1 }
            ]), 
            (req, res, next) => authController.register(req, res, next)
        );

        this.router.get('/profile', auth, (req, res, next) => profileController.getProfile(req, res, next));
        this.router.post('/profile/update', auth, (req, res, next) => profileController.updateProfile(req, res, next));
    };

    getRouter() {
        return this.router;
    }
}

module.exports = new AuthRoutes().getRouter();