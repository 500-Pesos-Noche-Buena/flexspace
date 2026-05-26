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
            if (!secret_key) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Secret key is required');
            }
            const encryptRes = await axios.post(`${PAYBRIDGE_API_URL}/encrypt`, {
                secret_key: secret_key
            }, {
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
            const user = await User.findById(ownerId).select('encrypted_paymongo_key');
            if (!user?.encrypted_paymongo_key) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No payment gateway configured');
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
}

module.exports = new PaymentController();