const axios = require('axios');

const PAYBRIDGE_API_URL = process.env.PAYBRIDGE_API_URL || 'https://paybridge-ph.vercel.app/api/v1';
const PAYBRIDGE_MASTER_KEY = process.env.PAYBRIDGE_MASTER_KEY;

class PayBridgeService {
    
    // Encrypt a secret key using PayBridge
    async encryptSecretKey(secretKey) {
        try {
            const response = await axios.post(`${PAYBRIDGE_API_URL}/encrypt`, {
                secret_key: secretKey
            }, {
                headers: {
                    'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            return response.data.encrypted_key;
        } catch (error) {
            console.error('Encryption error:', error.response?.data || error.message);
            throw new Error('Failed to encrypt secret key');
        }
    }
    
    // Create PayMongo checkout session
    async createPayMongoCheckout(encryptedSecretKey, amount, successUrl, paymentMethod = 'gcash') {
        try {
            const response = await axios.post(`${PAYBRIDGE_API_URL}/paymongo`, {
                amount: parseFloat(amount),
                success_url: successUrl,
                payment_method: paymentMethod
            }, {
                headers: {
                    'X-Encrypted-Secret': encryptedSecretKey,
                    'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            return response.data;
        } catch (error) {
            console.error('PayMongo checkout error:', error.response?.data || error.message);
            throw new Error('Failed to create payment link');
        }
    }
    
    // Verify payment status
    async verifyPayment(paymentIntentId, encryptedSecretKey) {
        try {
            const response = await axios.get(`${PAYBRIDGE_API_URL}/paymongo/verify/${paymentIntentId}`, {
                headers: {
                    'X-Encrypted-Secret': encryptedSecretKey,
                    'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY
                }
            });
            
            return response.data;
        } catch (error) {
            console.error('Verification error:', error.response?.data || error.message);
            return { is_paid: false };
        }
    }
}

module.exports = new PayBridgeService();