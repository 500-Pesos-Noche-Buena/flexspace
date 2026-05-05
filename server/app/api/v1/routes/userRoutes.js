const express = require('express');
const auth = require('@/api/v1/middleware/authMiddleware');
const profileController = require('@/api/v1/controllers/profileController');
const dashboardController = require('@/api/v1/controllers/user/dashboardController');
const spaceController = require('@/api/v1/controllers/user/spaceController');
const bookingController = require('@/api/v1/controllers/user/bookingController');
const redeemController = require('@/api/v1/controllers/user/redeemController');
const reviewController = require('@/api/v1/controllers/user/reviewController');

class UserRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        console.log('--- 🛡️ Initializing User Routes ---');

        // Profile
        this.router.get('/profile', auth, (req, res, next) => profileController.getProfile(req, res, next));
        
        // Dashboard & Spaces
        this.router.get('/dashboard', auth, (req, res, next) => dashboardController.getUserDashboard(req, res, next));
        this.router.get('/spaces', auth, (req, res, next) => spaceController.getAllSpaces(req, res, next));
        
        // Bookings
        this.router.get('/bookings', auth, (req, res, next) => bookingController.getMyBookings(req, res, next));
        this.router.post('/bookings', auth, (req, res, next) => bookingController.createBooking(req, res, next));
        this.router.post('/bookings/scan', auth, (req, res, next) => bookingController.scanHubQRCode(req, res, next));

        // Voucher routes for existing bookings (pending_payment)
        this.router.post('/bookings/:id/preview-voucher', auth, (req, res, next) => bookingController.previewVoucher(req, res, next));
        this.router.post('/bookings/:id/redeem-voucher', auth, (req, res, next) => bookingController.redeemVoucher(req, res, next));

        // Preview voucher during booking creation
        this.router.post('/vouchers/preview', auth, (req, res, next) => bookingController.previewVoucherForBooking(req, res, next));

        // Redeem points for vouchers
        this.router.get('/vouchers', auth, (req, res, next) => redeemController.index(req, res, next));
        this.router.post('/vouchers/redeem', auth, (req, res, next) => redeemController.redeem(req, res, next));

        // ========== REVIEW ROUTES ==========
        // Submit a review
        this.router.post('/reviews', auth, (req, res, next) => reviewController.submitReview(req, res, next));
        
        // Get user's reviews
        this.router.get('/reviews', auth, (req, res, next) => reviewController.getMyReviews(req, res, next));
        
        // Check if booking has been reviewed
        this.router.get('/reviews/check/:bookingId', auth, (req, res, next) => reviewController.checkBookingReviewed(req, res, next));
        
        // Get single review
        this.router.get('/reviews/:id', auth, (req, res, next) => reviewController.getReviewById(req, res, next));
        
        // Update review
        this.router.put('/reviews/:id', auth, (req, res, next) => reviewController.updateReview(req, res, next));
        
        // Delete review
        this.router.delete('/reviews/:id', auth, (req, res, next) => reviewController.deleteReview(req, res, next));
        
        // Mark review as helpful
        this.router.post('/reviews/:id/helpful', auth, (req, res, next) => reviewController.markHelpful(req, res, next));
        
        // Remove helpful mark
        this.router.delete('/reviews/:id/helpful', auth, (req, res, next) => reviewController.removeHelpful(req, res, next));
    }   

    getRouter() {
        return this.router;
    }
}

module.exports = new UserRoutes().getRouter();