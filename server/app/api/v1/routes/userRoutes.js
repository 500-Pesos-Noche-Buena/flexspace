const express = require('express');
const auth = require('@/api/v1/middleware/authMiddleware');
const profileController = require('@/api/v1/controllers/profileController');
const dashboardController = require('@/api/v1/controllers/user/dashboardController');
const spaceController = require('@/api/v1/controllers/user/spaceController');
const bookingController = require('@/api/v1/controllers/user/bookingController');
const redeemController = require('@/api/v1/controllers/user/redeemController');
const reviewController = require('@/api/v1/controllers/user/reviewController');
const userOrderController = require('@/api/v1/controllers/user/orderController');

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
        this.router.get('/districts', auth, (req, res, next) => spaceController.getDistricts(req, res, next));

        // Bookings
        this.router.get('/bookings', auth, (req, res, next) => bookingController.getMyBookings(req, res, next));
        this.router.post('/bookings', auth, (req, res, next) => bookingController.createBooking(req, res, next));
        this.router.post('/bookings/scan', auth, (req, res, next) => bookingController.scanHubQRCode(req, res, next));
        
        // Active booking - FAST endpoint for ChatOrder
this.router.get('/active-booking-fast', auth, (req, res, next) => bookingController.getActiveBookingFast(req, res, next));
        // Voucher routes
        this.router.post('/bookings/:id/preview-voucher', auth, (req, res, next) => bookingController.previewVoucher(req, res, next));
        this.router.post('/bookings/:id/redeem-voucher', auth, (req, res, next) => bookingController.redeemVoucher(req, res, next));
        this.router.post('/vouchers/preview', auth, (req, res, next) => bookingController.previewVoucherForBooking(req, res, next));

        // Redeem points
        this.router.get('/vouchers', auth, (req, res, next) => redeemController.index(req, res, next));
        this.router.post('/vouchers/redeem', auth, (req, res, next) => redeemController.redeem(req, res, next));

        // Review Routes
        this.router.post('/reviews', auth, (req, res, next) => reviewController.submitReview(req, res, next));
        this.router.get('/reviews', auth, (req, res, next) => reviewController.getMyReviews(req, res, next));
        this.router.get('/reviews/check/:bookingId', auth, (req, res, next) => reviewController.checkBookingReviewed(req, res, next));
        this.router.get('/reviews/:id', auth, (req, res, next) => reviewController.getReviewById(req, res, next));
        this.router.put('/reviews/:id', auth, (req, res, next) => reviewController.updateReview(req, res, next));
        this.router.delete('/reviews/:id', auth, (req, res, next) => reviewController.deleteReview(req, res, next));
        this.router.post('/reviews/:id/helpful', auth, (req, res, next) => reviewController.markHelpful(req, res, next));
        this.router.delete('/reviews/:id/helpful', auth, (req, res, next) => reviewController.removeHelpful(req, res, next));

        // Orders
        this.router.get('/orders', auth, (req, res, next) => userOrderController.getMyOrders(req, res, next));
        this.router.get('/orders/:orderId', auth, (req, res, next) => userOrderController.getOrderDetails(req, res, next));
        this.router.get('/orders/by-number/:orderNumber', auth, (req, res, next) => userOrderController.getOrderByNumber(req, res, next));
        this.router.get('/orders/:orderId/status', auth, (req, res, next) => userOrderController.getOrderStatus(req, res, next));
        this.router.post('/orders', auth, (req, res, next) => userOrderController.createOrder(req, res, next));
        this.router.post('/orders/:orderId/cancel', auth, (req, res, next) => userOrderController.cancelOrder(req, res, next));
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new UserRoutes().getRouter();