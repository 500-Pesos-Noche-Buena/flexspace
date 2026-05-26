const express = require('express');
const passport = require('@/config/passport');
const authController = require('@/api/v1/controllers/authController');
const profileController = require('@/api/v1/controllers/profileController');
const { upload, processUploadedFiles } = require('@/api/v1/utils/upload');
const auth = require('@/api/v1/middleware/authMiddleware');
const passwordController = require('@/api/v1/controllers/passwordController');
const antiDdos = require('@/api/v1/middleware/antiDdos');

class AuthRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes = () => {
        console.log('--- 🛡️ Initializing Auth Routes (Google OAuth + JWT) ---');
        
        // --- PUBLIC ROUTES ---
        this.router.post('/login', 
            antiDdos.strictLimiter,
            antiDdos.gatekeeper,
            authController.login
        );
        
        this.router.post('/logout', auth, authController.logout);
        
        this.router.post('/register', 
            upload.fields([
                { name: 'business_permit', maxCount: 1 },
                { name: 'dti_sec_reg', maxCount: 1 }
            ]),
            processUploadedFiles,
            antiDdos.strictLimiter,
            antiDdos.gatekeeper,
            authController.register
        );

        // ============ GOOGLE OAUTH ROUTES ============
        this.router.get('/google',
            passport.authenticate('google', { scope: ['profile', 'email'], session: false })
        );
        
        this.router.get('/google/callback',
            passport.authenticate('google', { failureRedirect: '/login', session: false }),
            (req, res, next) => authController.googleCallback(req, res, next)
        );

        // Profile routes
        this.router.get('/profile', auth, profileController.getProfile);
        this.router.get('/recent-activity', auth, profileController.getRecentActivity);
        this.router.put('/profile/update', auth, profileController.updateProfile);
        this.router.put('/profile/update-password', auth, profileController.updatePassword);
        
        // QR Code upload - REMOVED processUploadedFiles (handles directly in controller)
        this.router.put('/profile/payment-qr', 
            auth, 
            upload.single('qr_code'),  // Only multer, no queue processing
            profileController.updatePaymentQR
        );
        
        // Payment methods
        this.router.put('/profile/payment-methods', auth, profileController.updatePaymentMethods);
        this.router.get('/profile/payment-details', auth, profileController.getPaymentDetails);

        // Password reset routes
        this.router.post('/forgot-password', passwordController.forgotPassword);
        this.router.post('/verify-otp', passwordController.verifyOTP);
        this.router.post('/reset-password', passwordController.resetPassword);
    };

    getRouter() {
        return this.router;
    }
}

module.exports = new AuthRoutes().getRouter();