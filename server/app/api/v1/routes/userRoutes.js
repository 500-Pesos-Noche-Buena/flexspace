const express = require('express');
const auth = require('@/api/v1/middleware/authMiddleware');
const profileController = require('@/api/v1/controllers/profileController');
const dashboardController = require('@/api/v1/controllers/user/dashboardController');
const spaceController = require('@/api/v1/controllers/user/spaceController');
const bookingController = require('@/api/v1/controllers/user/bookingController');

class UserRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        console.log('--- 🛡️ Initializing User Routes ---');

        this.router.get('/profile', auth, profileController.getProfile);
        
        this.router.get('/dashboard', auth, dashboardController.getUserDashboard);
        this.router.get('/spaces', auth, spaceController.getAllSpaces);
        
        this.router.get('/bookings', auth, bookingController.getMyBookings); 
        this.router.post('/bookings', auth, bookingController.createBooking);
        this.router.post('/bookings/scan', auth, bookingController.scanHubQRCode);

    }

    getRouter() {
        return this.router;
    }
}

module.exports = new UserRoutes().getRouter();