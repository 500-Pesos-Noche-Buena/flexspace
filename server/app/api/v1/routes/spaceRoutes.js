const express = require('express');
const auth = require('@/api/v1/middleware/authMiddleware');
const upload = require('@/utils/upload');

// Controllers
const DashboardController = require('@/api/v1/controllers/space/dashboardController');
const DistrictController = require('@/api/v1/controllers/space/districtController');
const SpaceController = require('@/api/v1/controllers/space/spaceController');
const BookingController = require('@/api/v1/controllers/space/bookingController');
const WalkinController = require('@/api/v1/controllers/space/walkinController');
const EarningsController = require('@/api/v1/controllers/space/earningController');


class SpaceRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        console.log('--- 🛡️ Initializing Space Routes ---');

        this.router.get('/dashboard', auth, (req, res, next) => DashboardController.index(req, res, next));

        this.router.get('/districts/active', auth, (req, res, next) => DistrictController.getActive(req, res, next));

        this.router.get('/spaces', auth, (req, res, next) => SpaceController.index(req, res, next));
        this.router.post('/spaces', auth, upload.single('image'), (req, res, next) => SpaceController.store(req, res, next));
        this.router.post('/spaces/:id/update', auth, upload.single('image'), (req, res, next) => SpaceController.update(req, res, next));
        this.router.post('/spaces/:id/delete', auth, (req, res, next) => SpaceController.delete(req, res, next));

        this.router.get('/bookings', auth, (req, res, next) => BookingController.index(req, res, next));
        this.router.get('/bookings/:id/present', auth, (req, res, next) => BookingController.presentQr(req, res, next));
        this.router.post('/bookings/:id/:action', auth, (req, res, next) => BookingController.updateStatus(req, res, next));

        this.router.get('/walkins', auth, (req, res, next) => WalkinController.index(req, res, next));
        this.router.post('/walkins/store', auth, (req, res, next) => WalkinController.store(req, res, next));
        this.router.post('/walkins/:id/checkout', auth, (req, res, next) => WalkinController.checkout(req, res, next));

        this.router.get('/earnings', auth, (req, res, next) => EarningsController.index(req, res, next));
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new SpaceRoutes().getRouter();