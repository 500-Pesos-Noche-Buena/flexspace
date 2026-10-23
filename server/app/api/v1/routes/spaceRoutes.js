const express = require('express');
const auth = require('@/api/v1/middleware/authMiddleware');
const { upload, processUploadedFiles } = require('@/api/v1/utils/upload');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const PaymentController = require('@/api/v1/controllers/space/paymentController');

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
const POSController = require('@/api/v1/controllers/space/posController');
const PublicReviewController = require('@/api/v1/controllers/reviewController');
const TotalOrdersController = require('@/api/v1/controllers/space/totalOrdersController');

class SpaceRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        console.log('--- 🛡️ Initializing Space Routes ---');

        // Public review routes (No auth required)
        this.router.get('/review/space/:spaceId', (req, res) => {
            // Redirect to frontend review page
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/review/space/${req.params.spaceId}`);
        });

        this.router.get('/public/spaces/:spaceId', (req, res, next) => PublicReviewController.getSpaceForReview(req, res, next));
        this.router.post('/public/reviews', (req, res, next) => PublicReviewController.submitReview(req, res, next));

        // ============ PUBLIC ROUTES (No Auth) ============
        this.router.get('/qr/:token', (req, res, next) => BookingController.handleQRRedirect(req, res, next));
        this.router.get('/booking/:id/review', (req, res, next) => BookingController.getBookingForReview(req, res, next));
        this.router.get('/booking/:id/can-review', (req, res, next) => BookingController.canReviewBooking(req, res, next));
        this.router.post('/booking/:id/review', (req, res, next) => BookingController.submitReviewFromQR(req, res, next));

        this.router.post('/payment-webhook', async (req, res, next) => {
            try {
                const crypto = require('crypto');
                const raw = req.rawBody || Buffer.from(JSON.stringify(req.body));
                const sig = req.get('x-paymongo-signature') || req.get('x-paybridge-signature') || req.get('stripe-signature');
                const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.PAYMONGO_WEBHOOK_SECRET || process.env.PAYBRIDGE_WEBHOOK_SECRET;

                if (!sig || !webhookSecret) {
                    return res.status(401).json({ success: false, message: 'Invalid or missing signature' });
                }

                let providedSig = sig;
                if (sig.includes('te=')) {
                    const parts = sig.split(',').reduce((acc, part) => {
                        const [k, v] = part.split('=');
                        if (k && v) acc[k.trim()] = v.trim();
                        return acc;
                    }, {});
                    providedSig = parts.te || parts.li || sig;
                }

                const expected = crypto.createHmac('sha256', webhookSecret).update(raw).digest('hex');
                const expectedBuf = Buffer.from(expected);
                const providedBuf = Buffer.from(providedSig);

                if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
                    return res.status(401).json({ success: false, message: 'Invalid signature' });
                }

                const { event, data } = req.body;
                if (!event || !data) {
                    return res.status(400).json({ success: false, message: 'Invalid webhook payload' });
                }

                if (event === 'payment.succeeded' || event === 'payment_intent.succeeded') {
                    const orderNumber = data.order_number || data.metadata?.order_number;
                    const paymentIntentId = data.payment_intent_id || data.id;
                    const type = data.metadata?.type || 'order';

                    if (orderNumber) {
                        if (type === 'order') {
                            const Order = require('@/api/v1/models/schema/Order');
                            const order = await Order.findOne({ order_number: orderNumber });
                            if (order && order.payment_status !== 'paid') {
                                order.status = 'confirmed';
                                order.payment_status = 'paid';
                                order.payment_intent_id = paymentIntentId;
                                await order.save();
                            }
                        } else {
                            const Booking = require('@/api/v1/models/schema/Booking');
                            const booking = await Booking.findOne({ ticket_number: orderNumber });
                            if (booking && (booking.status === 'pending_payment' || booking.status === 'pending')) {
                                booking.status = 'confirmed';
                                booking.payment_status = 'paid';
                                booking.payment_intent_id = paymentIntentId;
                                await booking.save();
                            }
                        }
                    }
                }

                return res.status(200).json({ success: true });
            } catch (error) {
                console.error('Webhook error:', error);
                return res.status(500).json({ success: false, error: error.message });
            }
        });

        // ============ OWNER / STAFF ROLE GATE ============
        this.router.use(auth, (req, res, next) => {
            if (!req.user || !['space', 'staff', 'admin'].includes(req.user.role)) {
                return next(new (require('@/api/v1/utils/ApiError'))(403, 'Space owner or staff access required.'));
            }
            next();
        });

        const uploadArray = upload.array('images', 10);
        const uploadPanoramas = upload.array('panoramas', 10);
        const uploadSpaceFields = upload.fields([
            { name: 'images', maxCount: 10 },
            { name: 'panoramas', maxCount: 10 },
            { name: 'panorama_images', maxCount: 10 }
        ]);

        // ============ DASHBOARD ============
        this.router.get('/dashboard', auth, (req, res, next) => DashboardController.index(req, res, next));
        this.router.get('/dashboard/occupancy', auth, (req, res, next) => DashboardController.getOccupancyAnalytics(req, res, next));
        this.router.get('/dashboard/peak-hours', auth, (req, res, next) => DashboardController.getPeakHours(req, res, next));
        this.router.get('/dashboard/customer-loyalty', auth, (req, res, next) => DashboardController.getCustomerLoyalty(req, res, next));
        this.router.get('/dashboard/revenue-trend', auth, (req, res, next) => DashboardController.getRevenueTrend(req, res, next));

        // ============ DISTRICTS ============
        this.router.get('/districts/active', auth, (req, res, next) => DistrictController.getActive(req, res, next));

        // ============ SPACE MANAGEMENT ============
        this.router.get('/spaces', auth, (req, res, next) => SpaceController.index(req, res, next));
        this.router.post('/spaces', auth, uploadSpaceFields, processUploadedFiles, (req, res, next) => SpaceController.store(req, res, next));
        this.router.get('/spaces/:id', auth, (req, res, next) => SpaceController.show(req, res, next));
        this.router.post('/spaces/:id/update', auth, uploadSpaceFields, processUploadedFiles, (req, res, next) => SpaceController.update(req, res, next));
        this.router.post('/spaces/:id/delete', auth, (req, res, next) => SpaceController.delete(req, res, next));
        this.router.post('/spaces/:id/add-images', auth, uploadArray, processUploadedFiles, (req, res, next) => SpaceController.addImages(req, res, next));
        this.router.post('/spaces/:id/remove-image', auth, (req, res, next) => SpaceController.removeImage(req, res, next));
        this.router.post('/spaces/:id/set-primary', auth, (req, res, next) => SpaceController.setPrimaryImage(req, res, next));

        // ============ 360° VIRTUAL TOUR & PANORAMAS ============
        this.router.post('/spaces/:id/panoramas', auth, uploadPanoramas, processUploadedFiles, (req, res, next) => SpaceController.uploadPanoramas(req, res, next));
        this.router.post('/spaces/:id/virtual-tour', auth, (req, res, next) => SpaceController.updateVirtualTour(req, res, next));
        this.router.post('/spaces/:id/remove-panorama', auth, (req, res, next) => SpaceController.removePanorama(req, res, next));

        // ============ ROOM MANAGEMENT ============
        this.router.get('/spaces/:spaceId/rooms', auth, (req, res, next) => RoomController.getRooms(req, res, next));
        this.router.get('/spaces/:spaceId/rooms/availability', auth, (req, res, next) => RoomController.getRoomsWithAvailability(req, res, next));
        this.router.post('/spaces/:spaceId/rooms', auth, uploadArray, processUploadedFiles, (req, res, next) => RoomController.createRoom(req, res, next));
        this.router.put('/rooms/:roomId', auth, uploadArray, processUploadedFiles, (req, res, next) => RoomController.updateRoom(req, res, next));
        this.router.post('/rooms/:roomId/update', auth, uploadArray, processUploadedFiles, (req, res, next) => RoomController.updateRoom(req, res, next));
        this.router.post('/rooms/:roomId/add-images', auth, uploadArray, processUploadedFiles, (req, res, next) => RoomController.addImages(req, res, next));
        this.router.post('/rooms/:roomId/remove-image', auth, (req, res, next) => RoomController.removeImage(req, res, next));
        this.router.delete('/rooms/:roomId', auth, (req, res, next) => RoomController.deleteRoom(req, res, next));
        this.router.post('/rooms/:roomId/delete', auth, (req, res, next) => RoomController.deleteRoom(req, res, next));
        this.router.get('/rooms/:roomId/check-availability', auth, (req, res, next) => RoomController.checkRoomAvailability(req, res, next));

        // ============ BOOKINGS ============
        this.router.get('/bookings', auth, (req, res, next) => BookingController.index(req, res, next));
        this.router.get('/bookings/:id/details', auth, (req, res, next) => BookingController.getBookingDetails(req, res, next));
        this.router.get('/bookings/:id/present', auth, (req, res, next) => BookingController.presentQr(req, res, next));
        this.router.post('/bookings/:id/calculate', auth, (req, res, next) => BookingController.calculateBill(req, res, next));
        this.router.post('/bookings/:id/checkout', auth, (req, res, next) => BookingController.checkout(req, res, next));
        this.router.post('/bookings/:id/apply-voucher', auth, (req, res, next) => BookingController.applyVoucher(req, res, next));
        this.router.post('/bookings/:id/:action', auth, (req, res, next) => BookingController.updateStatus(req, res, next));

        this.router.get('/payment-methods', auth, async (req, res, next) => {
            try {
                const userId = req.user?.sub || req.user?._id || req.user?.id;

                // Get the user's payment methods from their profile
                const User = require('@/api/v1/models/schema/User');
                const user = await User.findById(userId).select('payment_methods');

                const paymentMethodsFromUser = user?.payment_methods || ['gcash', 'maya', 'credit_card'];

                // Map to frontend-friendly format
                const methods = paymentMethodsFromUser.map(method => {
                    const config = {
                        gcash: { id: 'gcash', name: 'GCash', value: 'gcash', icon: 'smartphone', color: 'emerald' },
                        maya: { id: 'maya', name: 'Maya', value: 'maya', icon: 'smartphone', color: 'blue' },
                        credit_card: { id: 'credit_card', name: 'Credit/Debit Card', value: 'card', icon: 'credit-card', color: 'purple' },
                        bank_transfer: { id: 'bank_transfer', name: 'Bank Transfer', value: 'bank_transfer', icon: 'landmark', color: 'indigo' },
                        paypal: { id: 'paypal', name: 'PayPal', value: 'paypal', icon: 'wallet', color: 'blue' },
                        cash: { id: 'cash', name: 'Cash', value: 'cash', icon: 'banknote', color: 'amber' }
                    };
                    return config[method] || { id: method, name: method, value: method, icon: 'credit-card', color: 'purple' };
                });

                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    data: methods
                });
            } catch (error) {
                console.error('Get payment methods error:', error);
                next(error);
            }
        });

        // ============ WALK-INS ============
        this.router.get('/walkins', auth, (req, res, next) => WalkinController.index(req, res, next));
        this.router.post('/walkins/store', auth, (req, res, next) => WalkinController.store(req, res, next));
        this.router.get('/walkins/guests', auth, (req, res, next) => WalkinController.guests(req, res, next));
        this.router.post('/walkins/:id/calculate', auth, (req, res, next) => WalkinController.calculateBill(req, res, next));
        this.router.post('/walkins/:id/checkout', auth, (req, res, next) => WalkinController.checkout(req, res, next));
        this.router.get('/walkins/spaces-with-rooms', auth, (req, res, next) => WalkinController.getSpacesWithRooms(req, res, next));

        // ============ EARNINGS ============
        this.router.get('/earnings', auth, (req, res, next) => EarningsController.index(req, res, next));
        this.router.get('/earnings/export/csv', auth, (req, res, next) => EarningsController.exportCSV(req, res, next));
        this.router.get('/earnings/pending-fees', auth, (req, res, next) => PaymentController.getPendingPlatformFees(req, res, next));
        
        // ============ STAFF MANAGEMENT ============
        this.router.get('/staff', auth, (req, res, next) => StaffController.index(req, res, next));
        this.router.post('/staff', auth, (req, res, next) => StaffController.store(req, res, next));
        this.router.put('/staff/:id', auth, (req, res, next) => StaffController.update(req, res, next));
        this.router.post('/staff/:id/toggle', auth, (req, res, next) => StaffController.toggleStatus(req, res, next));
        this.router.delete('/staff/:id', auth, (req, res, next) => StaffController.destroy(req, res, next));

        // ============ VOUCHERS ============
        this.router.get('/vouchers', auth, (req, res, next) => VoucherController.index(req, res, next));
        this.router.post('/vouchers', auth, (req, res, next) => VoucherController.create(req, res, next));
        this.router.post('/vouchers/:id/delete', auth, (req, res, next) => VoucherController.delete(req, res, next));

        // ============ REVIEWS ============
        this.router.get('/reviews', auth, (req, res, next) => ReviewController.getMySpaceReviews(req, res, next));
        this.router.get('/reviews/stats', auth, (req, res, next) => ReviewController.getReviewStats(req, res, next));
        this.router.get('/spaces/:spaceId/reviews', auth, (req, res, next) => ReviewController.getSpaceReviews(req, res, next));
        this.router.post('/reviews/:reviewId/reply', auth, (req, res, next) => ReviewController.replyToReview(req, res, next));
        this.router.put('/reviews/:reviewId/reply', auth, (req, res, next) => ReviewController.updateReply(req, res, next));
        this.router.delete('/reviews/:reviewId/reply', auth, (req, res, next) => ReviewController.deleteReply(req, res, next));
        
        // ✅ NEW ROUTES FOR REVIEW APPROVAL/REJECTION
        this.router.post('/reviews/:reviewId/approve', auth, (req, res, next) => ReviewController.approveReview(req, res, next));
        this.router.post('/reviews/:reviewId/reject', auth, (req, res, next) => ReviewController.rejectReview(req, res, next));

        // ============ POS / PRODUCTS / ORDERS ============
        this.router.get('/products', auth, (req, res, next) => POSController.getProducts(req, res, next));
        this.router.post('/products', auth, (req, res, next) => POSController.createProduct(req, res, next));
        this.router.put('/products/:id', auth, (req, res, next) => POSController.updateProduct(req, res, next));
        this.router.delete('/products/:id', auth, (req, res, next) => POSController.deleteProduct(req, res, next));
        this.router.post('/orders/:orderId/confirm-payment', auth, (req, res, next) => POSController.confirmOnlinePayment(req, res, next));
        this.router.get('/pos/active-sessions', auth, (req, res, next) => POSController.getActiveSessions(req, res, next));
        this.router.get('/orders', auth, (req, res, next) => POSController.getOrders(req, res, next));
        this.router.get('/orders/recent', auth, (req, res, next) => POSController.getRecentOrders(req, res, next));
        this.router.post('/orders', auth, (req, res, next) => POSController.createOrder(req, res, next));
        this.router.put('/orders/:orderId/status', auth, (req, res, next) => POSController.updateOrderStatus(req, res, next));
        this.router.get('/income/stats', auth, (req, res, next) => POSController.getIncomeStats(req, res, next));
        this.router.post('/orders/:orderId/fix-payment', auth, (req, res, next) => POSController.fixOrderPayment(req, res, next));
        this.router.post('/orders/:orderId/settle-pay-later', auth, (req, res, next) => POSController.settlePayLater(req, res, next));
        
        // ========== TOTAL ORDERS ============
        this.router.get('/total-orders', auth, (req, res, next) => TotalOrdersController.getTotalOrders(req, res, next));
        this.router.get('/total-orders/stats', auth, (req, res, next) => TotalOrdersController.getOrderStats(req, res, next));
        this.router.get('/total-orders/:id', auth, (req, res, next) => TotalOrdersController.getOrderById(req, res, next));

        // ============ PAYMENT & QR ============
        this.router.get('/owner/payment-qr', auth, (req, res, next) => PaymentController.getPaymentQR(req, res, next));
        this.router.post('/payment/keys/paymongo', auth, (req, res, next) => PaymentController.savePayMongoKey(req, res, next));
        this.router.post('/payment/create-link', auth, (req, res, next) => PaymentController.createPaymentLink(req, res, next));
        this.router.get('/payment/verify/:paymentIntentId', auth, (req, res, next) => PaymentController.verifyPayment(req, res, next));
        this.router.get('/payment/key-status', auth, (req, res, next) => PaymentController.getPaymentKeyStatus(req, res, next));

        this.router.get('/payment/check-status/:payment_intent_id', auth, (req, res, next) => PaymentController.checkFeePaymentStatus(req, res, next));
        this.router.post('/payment/confirm-fee-payment', auth, (req, res, next) => PaymentController.confirmFeePayment(req, res, next));
        this.router.get('/earnings/pending', auth, (req, res, next) => PaymentController.getPendingPlatformFees(req, res, next));
        this.router.post('/earnings/pay-platform-fees', auth, (req, res, next) => PaymentController.payPlatformFees(req, res, next));
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new SpaceRoutes().getRouter();