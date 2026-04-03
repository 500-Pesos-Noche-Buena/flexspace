const express = require('express');
const auth = require('@/api/v1/middleware/authMiddleware');
const upload = require('@/utils/upload'); // Ensure this utility is configured for your Linux path

// Controllers
const DashboardController = require('@/api/v1/controllers/space/dashboardController');
const DistrictController = require('@/api/v1/controllers/space/districtController');
const SpaceController = require('@/api/v1/controllers/space/spaceController');
// const BookingController = require('@/api/v1/controllers/space/bookingController');
// const WalkinController = require('@/api/v1/controllers/space/walkinController');

class SpaceRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        // --- DASHBOARD ---
        this.router.get('/dashboard', auth, DashboardController.index);

        // --- DISTRICTS ---
        this.router.get('/districts/active', auth, DistrictController.getActive);

     // --- SPACE LISTINGS MANAGEMENT ---

        // ✅ FIX: Added arrow function to preserve 'this'
        this.router.get('/spaces', auth, (req, res, next) => SpaceController.index(req, res, next));

        // ✅ This one was already correct
        this.router.post('/spaces', auth, upload.single('image'), (req, res, next) => SpaceController.store(req, res, next));

        // ✅ FIX: Added arrow function
        this.router.post('/spaces/:id/update', auth, upload.single('image'), (req, res, next) => SpaceController.update(req, res, next));

        // ✅ FIX: Added arrow function
        this.router.post('/spaces/:id/delete', auth, (req, res, next) => SpaceController.delete(req, res, next));

        /* // --- BOOKINGS (Uncomment when controllers are ready) ---
        this.router.get('/bookings', auth, BookingController.index);
        this.router.get('/bookings/:id/present', auth, BookingController.presentQr);
        this.router.post('/bookings/:id/status', auth, BookingController.updateStatus);

        // --- WALK-INS ---
        this.router.get('/walkins', auth, WalkinController.index);
        this.router.post('/walkins/store', auth, WalkinController.store);
        this.router.post('/walkins/:id/checkout', auth, WalkinController.checkout);
        */
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new SpaceRoutes().getRouter();