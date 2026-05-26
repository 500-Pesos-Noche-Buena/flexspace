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

        // Public products endpoint
        this.router.get('/products', async (req, res, next) => {
            try {
                const Product = require('@/api/v1/models/schema/Product');
                let products = await Product.find({ is_available: true, stock: { $gt: 0 } })
                    .select('name price category stock image description')
                    .sort({ category: 1, name: 1 })
                    .limit(100);

                if (!products || products.length === 0) {
                    const sampleProducts = [
                        { _id: '1', name: '☕ Espresso', price: 80, category: 'beverage', stock: 50 },
                        { _id: '2', name: '☕ Cappuccino', price: 120, category: 'beverage', stock: 50 },
                        { _id: '3', name: '☕ Latte', price: 130, category: 'beverage', stock: 50 },
                        { _id: '4', name: '🥪 Club Sandwich', price: 180, category: 'food', stock: 25 },
                        { _id: '5', name: '🍟 French Fries', price: 90, category: 'snacks', stock: 40 },
                        { _id: '6', name: '🍪 Cookies', price: 50, category: 'snacks', stock: 60 },
                        { _id: '7', name: '💧 Mineral Water', price: 30, category: 'beverage', stock: 100 },
                    ];
                    return res.status(200).json({ success: true, data: sampleProducts });
                }

                return res.status(200).json({ success: true, data: products });
            } catch (error) {
                const sampleProducts = [
                    { _id: '1', name: 'Espresso', price: 80, category: 'beverage', stock: 50 },
                    { _id: '2', name: 'Cappuccino', price: 120, category: 'beverage', stock: 50 },
                    { _id: '3', name: 'Latte', price: 130, category: 'beverage', stock: 50 },
                    { _id: '4', name: 'Club Sandwich', price: 180, category: 'food', stock: 25 },
                    { _id: '5', name: 'French Fries', price: 90, category: 'snacks', stock: 40 },
                    { _id: '6', name: 'Cookies', price: 50, category: 'snacks', stock: 60 },
                    { _id: '7', name: 'Mineral Water', price: 30, category: 'beverage', stock: 100 },
                ];
                return res.status(200).json({ success: true, data: sampleProducts });
            }
        });

        // PUBLIC PAYMENT ENDPOINTS
        this.router.post('/payment/create-link', async (req, res, next) => {
            try {
                const axios = require('axios');
                const { amount, order_number, customer_name, payment_method = 'gcash' } = req.body;

                const PAYBRIDGE_API_URL = process.env.PAYBRIDGE_API_URL || 'https://paybridge-ph.vercel.app/api/v1';
                const PAYBRIDGE_MASTER_KEY = process.env.PAYBRIDGE_MASTER_KEY;

                const User = require('@/api/v1/models/schema/User');
                const Space = require('@/api/v1/models/schema/Space');

                const firstSpace = await Space.findOne({ status: 'Open Now' }).populate('user_id');
                if (!firstSpace || !firstSpace.user_id || !firstSpace.user_id.encrypted_paymongo_key) {
                    return res.status(400).json({
                        success: false,
                        message: 'Payment gateway not configured. Please contact support.'
                    });
                }

                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                const successUrl = `${frontendUrl}/payment/success?order_id=${order_number}&amount=${amount}`;

                const response = await axios.post(`${PAYBRIDGE_API_URL}/paymongo`, {
                    amount: parseFloat(amount),
                    success_url: successUrl,
                    payment_method: payment_method,
                    metadata: { order_number, customer_name }
                }, {
                    headers: {
                        'X-Encrypted-Secret': firstSpace.user_id.encrypted_paymongo_key,
                        'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY,
                        'Content-Type': 'application/json'
                    }
                });

                return res.status(200).json({
                    success: true,
                    data: {
                        checkout_url: response.data.checkout_url,
                        payment_intent_id: response.data.payment_intent_id
                    }
                });
            } catch (error) {
                console.error('Payment link error:', error.response?.data || error.message);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create payment link'
                });
            }
        });

        this.router.get('/payment/verify/:paymentIntentId', async (req, res, next) => {
            try {
                const axios = require('axios');
                const { paymentIntentId } = req.params;

                const PAYBRIDGE_API_URL = process.env.PAYBRIDGE_API_URL || 'https://paybridge-ph.vercel.app/api/v1';
                const PAYBRIDGE_MASTER_KEY = process.env.PAYBRIDGE_MASTER_KEY;

                const User = require('@/api/v1/models/schema/User');
                const Space = require('@/api/v1/models/schema/Space');

                const firstSpace = await Space.findOne({ status: 'Open Now' }).populate('user_id');
                if (!firstSpace || !firstSpace.user_id || !firstSpace.user_id.encrypted_paymongo_key) {
                    return res.status(400).json({
                        success: false,
                        message: 'Payment gateway not configured'
                    });
                }

                const response = await axios.get(`${PAYBRIDGE_API_URL}/paymongo/verify/${paymentIntentId}`, {
                    headers: {
                        'X-Encrypted-Secret': firstSpace.user_id.encrypted_paymongo_key,
                        'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY
                    }
                });

                return res.status(200).json({
                    success: true,
                    data: response.data
                });
            } catch (error) {
                console.error('Payment verification error:', error.response?.data || error.message);
                return res.status(500).json({
                    success: false,
                    message: 'Verification failed',
                    data: { is_paid: false }
                });
            }
        });

        this.router.post('/orders/:orderId/confirm-payment', async (req, res, next) => {
            try {
                const Order = require('@/api/v1/models/schema/Order');
                const { orderId } = req.params;
                const { payment_intent_id } = req.body;

                const order = await Order.findOne({ order_number: orderId });

                if (!order) {
                    return res.status(404).json({ success: false, message: 'Order not found' });
                }

                order.status = 'confirmed';
                order.payment_status = 'paid';
                order.payment_intent_id = payment_intent_id;
                await order.save();

                return res.status(200).json({
                    success: true,
                    message: 'Payment confirmed. Order is now being prepared.',
                    data: order
                });
            } catch (error) {
                console.error('Confirm payment error:', error);
                next(error);
            }
        });

        // Add this to landingRoutes.js
        this.router.get('/payment/status/:orderId', async (req, res, next) => {
            try {
                const Order = require('@/api/v1/models/schema/Order');
                const { orderId } = req.params;

                const order = await Order.findOne({ order_number: orderId });

                if (!order) {
                    return res.status(404).json({
                        success: false,
                        message: 'Order not found'
                    });
                }

                return res.status(200).json({
                    success: true,
                    data: {
                        is_paid: order.status === 'confirmed' || order.status === 'completed',
                        status: order.status,
                        payment_status: order.payment_status
                    }
                });
            } catch (error) {
                console.error('Payment status error:', error);
                next(error);
            }
        });
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new LandingRoutes().getRouter();