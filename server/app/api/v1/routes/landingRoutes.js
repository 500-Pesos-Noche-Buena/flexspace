const express = require('express');
const landingController = require('@/api/v1/controllers/landingController');
const roomController = require('@/api/v1/controllers/space/roomController');
const protect = require('@/api/v1/middleware/protectionMiddleware');

class LandingRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        console.log('--- 🛡️ Initializing Landing Routes ---');

        // Existing routes
        this.router.get('/spaces/:spaceId/rooms', (req, res, next) =>
            roomController.getPublicRoomsBySpace(req, res, next)
        );

        this.router.get('/rooms/:roomId/availability', (req, res, next) =>
            roomController.checkRoomAvailability(req, res, next)
        );

        this.router.get('/spaces/:id/availability', (req, res, next) =>
            landingController.getSpaceAvailability(req, res, next)
        );

        this.router.get('/explorer', protect, (req, res, next) =>
            landingController.getExplorerData(req, res, next)
        );

        this.router.get('/space/:id', protect, (req, res, next) =>
            landingController.getSpaceDetails(req, res, next)
        );

        this.router.get('/stats', protect, (req, res, next) =>
            landingController.getPublicStats(req, res, next)
        );

        this.router.get('/reviews', protect, (req, res, next) =>
            landingController.getCustomerReviews(req, res, next)
        );

        this.router.post('/reviews/:reviewId/like', (req, res, next) =>
            landingController.publicLikeReview(req, res, next)
        );

        // Products endpoint
        this.router.get('/products', async (req, res, next) => {
            try {
                const { Product } = require('@/api/v1/models');
                const products = await Product.find({ is_available: true }).lean();
                return res.status(200).json({ success: true, data: products });
            } catch (error) {
                next(error);
            }
        });

        // ============ PAYMENT ENDPOINTS ============
        this.router.post('/payment/create-link', (req, res, next) =>
            landingController.createPaymentLink(req, res, next)
        );

        this.router.get('/payment/verify/:paymentIntentId', (req, res, next) =>
            landingController.verifyPayment(req, res, next)
        );

        this.router.post('/orders/:orderId/confirm-payment', (req, res, next) =>
            landingController.confirmOrderPayment(req, res, next)
        );

        this.router.get('/payment/status/:orderId', (req, res, next) =>
            landingController.getPaymentStatus(req, res, next)
        );
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new LandingRoutes().getRouter();