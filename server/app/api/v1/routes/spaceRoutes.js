const express = require('express');
const auth = require('@/api/v1/middleware/authMiddleware');
const { upload, processUploadedFiles } = require('@/api/v1/utils/upload');

// Controllers
const DashboardController = require('@/api/v1/controllers/space/dashboardController');
const DistrictController = require('@/api/v1/controllers/space/districtController');
const SpaceController = require('@/api/v1/controllers/space/spaceController');
const BookingController = require('@/api/v1/controllers/space/bookingController');
const WalkinController = require('@/api/v1/controllers/space/walkinController');
const EarningsController = require('@/api/v1/controllers/space/earningController');
const StaffController = require('@/api/v1/controllers/space/staffController');
const VoucherController = require('@/api/v1/controllers/space/voucherController');
const ReviewController = require('@/api/v1/controllers/space/reviewController');
const RoomController = require('@/api/v1/controllers/space/roomController');

class SpaceRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        console.log('--- 🛡️ Initializing Space Routes ---');

        // ============================================
        // PUBLIC ROUTES (No Authentication Required)
        // ============================================
        this.router.get('/qr/:token', (req, res, next) => BookingController.handleQRRedirect(req, res, next));
        this.router.get('/booking/:id/review', (req, res, next) => BookingController.getBookingForReview(req, res, next));
        this.router.get('/booking/:id/can-review', (req, res, next) => BookingController.canReviewBooking(req, res, next));
        this.router.post('/booking/:id/review', (req, res, next) => BookingController.submitReviewFromQR(req, res, next));

        const uploadArray = upload.array('images', 10);
        const uploadSingle = upload.single('image');

        // Dashboard
        this.router.get('/dashboard', auth, (req, res, next) => DashboardController.index(req, res, next));
        this.router.get('/dashboard/occupancy', auth, (req, res, next) => DashboardController.getOccupancyAnalytics(req, res, next));
        this.router.get('/dashboard/peak-hours', auth, (req, res, next) => DashboardController.getPeakHours(req, res, next));
        this.router.get('/dashboard/customer-loyalty', auth, (req, res, next) => DashboardController.getCustomerLoyalty(req, res, next));
        this.router.get('/dashboard/revenue-trend', auth, (req, res, next) => DashboardController.getRevenueTrend(req, res, next));

        // Districts
        this.router.get('/districts/active', auth, (req, res, next) => DistrictController.getActive(req, res, next));

        // ============================================
        // SPACE MANAGEMENT ROUTES
        // ============================================
        this.router.get('/spaces', auth, (req, res, next) => SpaceController.index(req, res, next));
        
        this.router.post('/spaces', 
            auth, 
            uploadArray, 
            processUploadedFiles,
            (req, res, next) => SpaceController.store(req, res, next)
        );
        
        this.router.post('/spaces/:id/update', 
            auth, 
            uploadArray, 
            processUploadedFiles,
            (req, res, next) => SpaceController.update(req, res, next)
        );
        
        this.router.post('/spaces/:id/delete', auth, (req, res, next) => SpaceController.delete(req, res, next));
        
        this.router.post('/spaces/:id/add-images', 
            auth, 
            uploadArray, 
            processUploadedFiles,
            (req, res, next) => SpaceController.addImages(req, res, next)
        );
        
        this.router.post('/spaces/:id/remove-image', auth, (req, res, next) => SpaceController.removeImage(req, res, next));
        this.router.post('/spaces/:id/set-primary', auth, (req, res, next) => SpaceController.setPrimaryImage(req, res, next));

        // ============================================
        // ROOM MANAGEMENT ROUTES (FIXED)
        // ============================================
        // Get all rooms for a specific space
        this.router.get('/spaces/:spaceId/rooms', auth, (req, res, next) => RoomController.getRooms(req, res, next));
        
        // Create a new room under a space
        this.router.post('/spaces/:spaceId/rooms', auth, (req, res, next) => RoomController.createRoom(req, res, next));
        
        // Update a room
        this.router.put('/rooms/:roomId', auth, (req, res, next) => RoomController.updateRoom(req, res, next));
        
        // Delete a room
        this.router.delete('/rooms/:roomId', auth, (req, res, next) => RoomController.deleteRoom(req, res, next));
        
        // Alternative: POST method for delete (if your frontend prefers POST)
        this.router.post('/rooms/:roomId/delete', auth, (req, res, next) => RoomController.deleteRoom(req, res, next));

        // ============================================
        // BOOKING ROUTES
        // ============================================
        this.router.get('/bookings', auth, (req, res, next) => BookingController.index(req, res, next));
        this.router.get('/bookings/:id/present', auth, (req, res, next) => BookingController.presentQr(req, res, next));
        
        // Checkout flow
        this.router.post('/bookings/:id/calculate', auth, (req, res, next) => BookingController.calculateBill(req, res, next));
        this.router.post('/bookings/:id/checkout', auth, (req, res, next) => BookingController.checkout(req, res, next));
        this.router.post('/bookings/:id/apply-voucher', auth, (req, res, next) => BookingController.applyVoucher(req, res, next));
        
        // Generic status actions (MUST be last)
        this.router.post('/bookings/:id/:action', auth, (req, res, next) => BookingController.updateStatus(req, res, next));

        // ============================================
        // WALK-IN ROUTES
        // ============================================
        this.router.get('/walkins', auth, (req, res, next) => WalkinController.index(req, res, next));
        this.router.post('/walkins/store', auth, (req, res, next) => WalkinController.store(req, res, next));
        this.router.get('/walkins/guests', auth, (req, res, next) => WalkinController.guests(req, res, next));
        this.router.post('/walkins/:id/calculate', auth, (req, res, next) => WalkinController.calculateBill(req, res, next));
        this.router.post('/walkins/:id/checkout', auth, (req, res, next) => WalkinController.checkout(req, res, next));
        
        // ============================================
        // EARNINGS ROUTES
        // ============================================
        this.router.get('/earnings', auth, (req, res, next) => EarningsController.index(req, res, next));
        this.router.get('/earnings/export/csv', auth, (req, res, next) => EarningsController.exportCSV(req, res, next));

        // ============================================
        // STAFF MANAGEMENT ROUTES
        // ============================================
        this.router.get('/staff', auth, (req, res, next) => StaffController.index(req, res, next));
        this.router.post('/staff', auth, (req, res, next) => StaffController.store(req, res, next));
        this.router.put('/staff/:id', auth, (req, res, next) => StaffController.update(req, res, next));
        this.router.post('/staff/:id/toggle', auth, (req, res, next) => StaffController.toggleStatus(req, res, next));
        this.router.delete('/staff/:id', auth, (req, res, next) => StaffController.destroy(req, res, next));

        // ============================================
        // VOUCHER MANAGEMENT ROUTES
        // ============================================
        this.router.get('/vouchers', auth, (req, res, next) => VoucherController.index(req, res, next));
        this.router.post('/vouchers', auth, (req, res, next) => VoucherController.create(req, res, next));
        this.router.post('/vouchers/:id/delete', auth, (req, res, next) => VoucherController.delete(req, res, next));

        // ============================================
        // REVIEW ROUTES (Space Owner)
        // ============================================
        // Get all reviews for owner's spaces
        this.router.get('/reviews', auth, (req, res, next) => ReviewController.getMySpaceReviews(req, res, next));
        
        // Get review statistics
        this.router.get('/reviews/stats', auth, (req, res, next) => ReviewController.getReviewStats(req, res, next));
        
        // Get reviews for a specific space (owned by user)
        this.router.get('/spaces/:spaceId/reviews', auth, (req, res, next) => ReviewController.getSpaceReviews(req, res, next));
        
        // Reply to a review
        this.router.post('/reviews/:reviewId/reply', auth, (req, res, next) => ReviewController.replyToReview(req, res, next));
        
        // Update reply
        this.router.put('/reviews/:reviewId/reply', auth, (req, res, next) => ReviewController.updateReply(req, res, next));
        
        // Delete reply
        this.router.delete('/reviews/:reviewId/reply', auth, (req, res, next) => ReviewController.deleteReply(req, res, next));
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new SpaceRoutes().getRouter();