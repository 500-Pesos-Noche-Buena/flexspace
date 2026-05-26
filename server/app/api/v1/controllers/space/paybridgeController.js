const axios = require('axios');
const { User } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

const PAYBRIDGE_API_URL = process.env.PAYBRIDGE_API_URL || 'https://paybridge-ph.vercel.app/api/v1';
const PAYBRIDGE_MASTER_KEY = process.env.PAYBRIDGE_MASTER_KEY;

class PayBridgeController {
    
    getOwnerId = async (req) => {
        const userId = req.user?.sub || req.user?._id || req.user?.id;
        if (req.user?.role === 'staff') {
            const staffRecord = await User.findById(userId).select('parent_id');
            return staffRecord?.parent_id || userId;
        }
        return userId;
    };

    // Encrypt a secret key using PayBridge API
    encryptSecretKey = async (secretKey) => {
        try {
            console.log('🔐 Encrypting secret key via PayBridge...');
            const response = await axios.post(`${PAYBRIDGE_API_URL}/encrypt`, {
                secret_key: secretKey
            }, {
                headers: {
                    'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.data || !response.data.encrypted_key) {
                throw new Error('Encryption failed - no encrypted key returned');
            }
            
            console.log('✅ Secret key encrypted successfully');
            return response.data.encrypted_key;
        } catch (error) {
            console.error('Encryption error:', error.response?.data || error.message);
            throw new Error('Failed to encrypt secret key: ' + (error.response?.data?.message || error.message));
        }
    };

    // Decrypt an encrypted key using PayBridge API (for verification)
    decryptSecretKey = async (encryptedKey) => {
        try {
            console.log('🔓 Decrypting secret key via PayBridge...');
            const response = await axios.post(`${PAYBRIDGE_API_URL}/decrypt`, {
                encrypted_key: encryptedKey
            }, {
                headers: {
                    'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            return response.data.secret_key;
        } catch (error) {
            console.error('Decryption error:', error.response?.data || error.message);
            throw new Error('Failed to decrypt secret key');
        }
    };

    // Save/Update PayMongo secret key (encrypted via PayBridge)
    savePayMongoKey = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const { secret_key } = req.body;
            
            if (!secret_key) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Secret key is required');
            }
            
            const encryptedKey = await this.encryptSecretKey(secret_key);
            
            await User.findByIdAndUpdate(ownerId, {
                encrypted_paymongo_key: encryptedKey
            });
            
            console.log('✅ PayMongo key saved and encrypted for user:', ownerId);
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Payment key saved and encrypted successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    // Create PayMongo checkout session using encrypted key
    createPayMongoCheckout = async (encryptedSecretKey, amount, successUrl, orderNumber, customerName, paymentMethod = 'gcash') => {
        try {
            console.log('💰 Creating PayMongo checkout via PayBridge...');
            
            const response = await axios.post(`${PAYBRIDGE_API_URL}/paymongo`, {
                amount: parseFloat(amount),
                success_url: successUrl,
                payment_method: paymentMethod,
                metadata: {
                    order_number: orderNumber,
                    customer_name: customerName
                }
            }, {
                headers: {
                    'X-Encrypted-Secret': encryptedSecretKey,
                    'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ PayMongo checkout created');
            return response.data;
        } catch (error) {
            console.error('PayMongo checkout error:', error.response?.data || error.message);
            throw new Error('Failed to create payment link: ' + (error.response?.data?.message || error.message));
        }
    };

    // Create payment link for order (ONLY returns payment link, does NOT update order)
    createPaymentLink = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const { amount, order_number, customer_name, payment_method = 'gcash' } = req.body;
            
            if (!amount || !order_number) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Amount and order number are required');
            }
            
            const user = await User.findById(ownerId).select('encrypted_paymongo_key name email');
            
            if (!user || !user.encrypted_paymongo_key) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No payment gateway configured. Please add your PayMongo secret key in settings.');
            }
            
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const successUrl = `${frontendUrl}/payment/success?order_id=${order_number}&amount=${amount}`;
            
            const payment = await this.createPayMongoCheckout(
                user.encrypted_paymongo_key,
                amount,
                successUrl,
                order_number,
                customer_name || 'Walk-in Customer',
                payment_method
            );
            
            // ONLY return payment link - NO order status updates here
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    checkout_url: payment.checkout_url,
                    payment_intent_id: payment.payment_intent_id
                }
            });
        } catch (error) {
            next(error);
        }
    };

    // Verify payment status (ONLY verifies, does NOT update order)
    verifyPayment = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const { paymentIntentId } = req.params;
            
            if (!paymentIntentId) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Payment intent ID is required');
            }
            
            const user = await User.findById(ownerId).select('encrypted_paymongo_key');
            
            if (!user || !user.encrypted_paymongo_key) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No payment gateway configured');
            }
            
            const response = await axios.get(`${PAYBRIDGE_API_URL}/paymongo/verify/${paymentIntentId}`, {
                headers: {
                    'X-Encrypted-Secret': user.encrypted_paymongo_key,
                    'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY
                }
            });
            
            // ONLY return verification result - NO order status updates here
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: response.data
            });
        } catch (error) {
            console.error('Verification error:', error.response?.data || error.message);
            next(error);
        }
    };

    // Get encrypted key status
    getPaymentKeyStatus = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const user = await User.findById(ownerId).select('encrypted_paymongo_key');
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    has_paymongo_key: !!user?.encrypted_paymongo_key
                }
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new PayBridgeController();