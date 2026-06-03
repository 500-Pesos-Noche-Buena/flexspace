// controllers/space/paymentController.js
const axios = require('axios');
const { User, Order } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

const PAYBRIDGE_API_URL = process.env.PAYBRIDGE_API_URL || 'https://paybridge-ph.vercel.app/api/v1';
const PAYBRIDGE_MASTER_KEY = process.env.PAYBRIDGE_MASTER_KEY;

class PaymentController {
    getOwnerId = async (req) => {
        const userId = req.user?.sub || req.user?._id || req.user?.id;
        if (req.user?.role === 'staff') {
            const staffRecord = await User.findById(userId).select('parent_id');
            return staffRecord?.parent_id || userId;
        }
        return userId;
    };

    getPaymentQR = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const owner = await User.findById(ownerId).select('business_payment_qr name email');
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    business_payment_qr: owner?.business_payment_qr || null,
                    business_name: owner?.name || null
                }
            });
        } catch (error) {
            next(error);
        }
    };

    savePayMongoKey = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const { secret_key } = req.body;
            if (!secret_key) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Secret key is required');

            const encryptRes = await axios.post(`${PAYBRIDGE_API_URL}/encrypt`, { secret_key }, {
                headers: { 'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY }
            });
            await User.findByIdAndUpdate(ownerId, { encrypted_paymongo_key: encryptRes.data.encrypted_key });
            return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Payment key saved successfully' });
        } catch (error) {
            next(error);
        }
    };

    createPaymentLink = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const { amount, order_number, customer_name, payment_method = 'gcash' } = req.body;

            if (!order_number) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Order number is required');

            const user = await User.findById(ownerId).select('encrypted_paymongo_key');
            if (!user?.encrypted_paymongo_key) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No payment gateway configured');

            const Order = require('@/api/v1/models/schema/Order');
            const Booking = require('@/api/v1/models/schema/Booking');
            const existingOrder = await Order.findOne({ order_number });
            const existingBooking = existingOrder ? null : await Booking.findOne({ ticket_number: order_number });
            const recordType = existingOrder ? 'order' : 'booking';

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const successUrl = `${frontendUrl}/payment/success?order_id=${order_number}&amount=${amount}&type=${recordType}`;

            const response = await axios.post(`${PAYBRIDGE_API_URL}/paymongo`, {
                amount: parseFloat(amount),
                success_url: successUrl,
                payment_method,
                metadata: { order_number, customer_name, type: recordType }
            }, {
                headers: {
                    'X-Encrypted-Secret': user.encrypted_paymongo_key,
                    'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY
                }
            });

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    checkout_url: response.data.checkout_url,
                    payment_intent_id: response.data.payment_intent_id
                }
            });
        } catch (error) {
            console.error('Create payment link error:', error);
            next(error);
        }
    };

    verifyPayment = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const { paymentIntentId } = req.params;
            const user = await User.findById(ownerId).select('encrypted_paymongo_key');
            const response = await axios.get(`${PAYBRIDGE_API_URL}/paymongo/verify/${paymentIntentId}`, {
                headers: {
                    'X-Encrypted-Secret': user.encrypted_paymongo_key,
                    'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY
                }
            });
            return res.status(HTTP_STATUS.OK).json({ success: true, data: response.data });
        } catch (error) {
            next(error);
        }
    };

    getPaymentKeyStatus = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const user = await User.findById(ownerId).select('encrypted_paymongo_key');
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: { has_paymongo_key: !!user?.encrypted_paymongo_key }
            });
        } catch (error) {
            next(error);
        }
    };

    getPendingPlatformFees = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const Earnings = require('@/api/v1/models/schema/Earnings');
            const currentMonth = new Date().toISOString().slice(0, 7);

            const pendingEarnings = await Earnings.find({
                owner_id: ownerId,
                month: currentMonth,
                fee_status: 'pending'
            });

            const totalPending = pendingEarnings.reduce((sum, e) => sum + e.platform_fee, 0);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    total_pending: totalPending,
                    month: currentMonth,
                    has_pending: totalPending > 0,
                    details: pendingEarnings
                }
            });
        } catch (error) {
            next(error);
        }
    };

   payPlatformFees = async (req, res, next) => {
    try {
        const ownerId = await this.getOwnerId(req);
        const { amount, month } = req.body;

        // Get platform key from cache instead of DB query
        let platformKey = await this.getCachedPlatformKey();
        if (!platformKey) {
            const Settings = require('@/api/v1/models/schema/Settings');
            const setting = await Settings.findOne({ key: 'platform_paymongo_key' });
            platformKey = setting?.value;
            await this.cachePlatformKey(platformKey);
        }

        if (!platformKey) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Platform payment gateway not configured.');
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Add timeout to axios call
        const response = await axios.post(`${PAYBRIDGE_API_URL}/paymongo`, {
            amount: parseFloat(amount),
            success_url: `${frontendUrl}/payment/success?type=fee_payment&owner_id=${ownerId}&month=${month}`,
            payment_method: 'gcash',
            metadata: {
                type: 'fee_payment',
                owner_id: ownerId,
                month,
                amount,
                payment_for: 'platform_fees'
            }
        }, {
            headers: {
                'X-Encrypted-Secret': platformKey,
                'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY
            },
            timeout: 10000 // 10 second timeout
        });

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            data: {
                checkout_url: response.data.checkout_url,
                payment_intent_id: response.data.payment_intent_id,
                amount,
                month
            }
        });
    } catch (error) {
        console.error('Pay platform fees error:', error);
        // Return error immediately, don't hang
        next(error);
    }
};

// Add caching helper methods
async getCachedPlatformKey() {
    if (this.platformKeyCache && this.platformKeyCache.expiry > Date.now()) {
        return this.platformKeyCache.key;
    }
    return null;
}

async cachePlatformKey(key) {
    this.platformKeyCache = {
        key,
        expiry: Date.now() + 300000 // 5 minutes cache
    };
}

    confirmFeePayment = async (req, res, next) => {
        try {
            const { owner_id, month, payment_intent_id } = req.body;
            const Earnings = require('@/api/v1/models/schema/Earnings');

            const result = await Earnings.updateMany(
                { owner_id, month, fee_status: 'pending' },
                {
                    fee_status: 'collected',
                    collected_at: new Date(),
                    payment_intent_id,
                    notes: `Payment confirmed on ${new Date().toLocaleString()}`
                }
            );

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `Successfully marked ${result.modifiedCount} fees as paid`,
                data: { updatedCount: result.modifiedCount }
            });
        } catch (error) {
            next(error);
        }
    };

    checkFeePaymentStatus = async (req, res, next) => {
        try {
            const { payment_intent_id } = req.params;
            const { owner_id, month } = req.query;

            // ✅ Check DB first — fastest path
            if (owner_id && month) {
                const Earnings = require('@/api/v1/models/schema/Earnings');
                const [collectedCount, pendingCount] = await Promise.all([
                    Earnings.countDocuments({ owner_id, month, fee_status: 'collected' }),
                    Earnings.countDocuments({ owner_id, month, fee_status: 'pending' })
                ]);

                if (collectedCount > 0 && pendingCount === 0) {
                    return res.status(HTTP_STATUS.OK).json({
                        success: true,
                        data: { is_paid: true, payment_intent_id, message: 'Fees already collected' }
                    });
                }
            }

            // Fallback: verify with PayBridge
            const Settings = require('@/api/v1/models/schema/Settings');
            const platformKey = await Settings.findOne({ key: 'platform_paymongo_key' });

            if (!platformKey?.value) {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    data: { is_paid: false, message: 'Platform gateway not configured' }
                });
            }

            const response = await axios.get(`${PAYBRIDGE_API_URL}/paymongo/verify/${payment_intent_id}`, {
                headers: {
                    'X-Encrypted-Secret': platformKey.value,
                    'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY
                }
            });

            const isPaid = response.data?.is_paid === true;

            if (isPaid) {
                const Earnings = require('@/api/v1/models/schema/Earnings');
                const updateQuery = (owner_id && month)
                    ? { owner_id, month, fee_status: 'pending' }
                    : { payment_intent_id, fee_status: 'pending' };

                const result = await Earnings.updateMany(updateQuery, {
                    fee_status: 'collected',
                    collected_at: new Date(),
                    payment_intent_id,
                    notes: `Auto-collected via status check on ${new Date().toLocaleString()}`
                });

                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    data: { is_paid: true, payment_intent_id, updated_count: result.modifiedCount }
                });
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: { is_paid: false, payment_intent_id }
            });
        } catch (error) {
            console.error('Check fee payment status error:', error);
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: { is_paid: false, error: error.message }
            });
        }
    };

    handlePaymentWebhook = async (req, res, next) => {
        try {
            const { event, data } = req.body;

            if (event === 'payment.succeeded' || event === 'payment_intent.succeeded') {
                const metadata = data.metadata;
                const paymentIntentId = data.id || data.payment_intent_id;

                if (metadata?.type === 'fee_payment') {
                    const Earnings = require('@/api/v1/models/schema/Earnings');
                    const result = await Earnings.updateMany(
                        { owner_id: metadata.owner_id, month: metadata.month, fee_status: 'pending' },
                        {
                            fee_status: 'collected',
                            collected_at: new Date(),
                            payment_intent_id: paymentIntentId,
                            notes: `Auto-collected via webhook on ${new Date().toLocaleString()}`
                        }
                    );
                    return res.status(200).json({ success: true, message: `Updated ${result.modifiedCount} records` });
                }

                if (metadata?.type === 'order' || metadata?.type === 'booking') {
                    const orderNumber = metadata.order_number;
                    if (metadata.type === 'order') {
                        const Order = require('@/api/v1/models/schema/Order');
                        const order = await Order.findOne({ order_number: orderNumber });
                        if (order && order.status === 'pending_payment') {
                            order.status = 'confirmed';
                            order.payment_status = 'paid';
                            order.payment_intent_id = paymentIntentId;
                            await order.save();
                        }
                    } else {
                        const Booking = require('@/api/v1/models/schema/Booking');
                        const booking = await Booking.findOne({ ticket_number: orderNumber });
                        if (booking && booking.status === 'pending_payment') {
                            booking.status = 'confirmed';
                            booking.payment_status = 'paid';
                            await booking.save();
                        }
                    }
                }
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Webhook error:', error);
            return res.status(200).json({ success: false, error: error.message });
        }
    };

    markFeesAsCollected = async (req, res, next) => {
        try {
            const { owner_id, month, payment_intent_id } = req.body;
            const Earnings = require('@/api/v1/models/schema/Earnings');
            const result = await Earnings.updateMany(
                { owner_id, month, fee_status: 'pending' },
                {
                    fee_status: 'collected',
                    collected_at: new Date(),
                    payment_intent_id,
                    notes: `Manually marked as collected on ${new Date().toLocaleString()}`
                }
            );
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `Marked ${result.modifiedCount} fees as collected`,
                data: { updatedCount: result.modifiedCount }
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new PaymentController();