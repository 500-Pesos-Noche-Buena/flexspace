const express = require('express');
const authController = require('@/api/v1/controllers/authController');
const profileController = require('@/api/v1/controllers/profileController');
const { upload, processUploadedFiles } = require('@/api/v1/utils/upload');
const auth = require('@/api/v1/middleware/authMiddleware');
const passwordController = require('@/api/v1/controllers/passwordController');

class AuthRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes = () => {
        console.log('--- 🛡️ Initializing Auth Routes (Profile + Payment Enabled) ---');
        
        // --- PUBLIC ROUTES ---
        this.router.post('/login', authController.login);
        this.router.post('/logout', authController.logout);
        this.router.post('/register', 
            upload.fields([
                { name: 'business_permit', maxCount: 1 },
                { name: 'dti_sec_reg', maxCount: 1 }
            ]),
            processUploadedFiles, 
            authController.register
        );

        this.router.get('/profile', auth, profileController.getProfile);
        this.router.put('/profile/update', auth, profileController.updateProfile);
        this.router.put('/profile/update-password', auth, profileController.updatePassword);
        
        this.router.put('/profile/payment-qr', 
            auth, 
            upload.single('qr_code'),
            processUploadedFiles,   
            profileController.updatePaymentQR
        );
        
        this.router.put('/profile/payment-methods', auth, profileController.updatePaymentMethods);
        this.router.get('/profile/payment-details', auth, profileController.getPaymentDetails);

        // --- PASSWORD RESET ROUTES (Public) ---
        this.router.post('/forgot-password', passwordController.forgotPassword);
        this.router.post('/verify-otp', passwordController.verifyOTP);
        this.router.post('/reset-password', passwordController.resetPassword);
    };

    getRouter() {
        return this.router;
    }
}

module.exports = new AuthRoutes().getRouter();