// controllers/admin/paymentController.js
const axios = require('axios');
const { User } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

const PAYBRIDGE_API_URL = process.env.PAYBRIDGE_API_URL || 'https://paybridge-ph.vercel.app/api/v1';
const PAYBRIDGE_MASTER_KEY = process.env.PAYBRIDGE_MASTER_KEY;

class AdminPaymentController {
    
    // Get payment key status for platform (admin)
    getPaymentKeyStatus = async (req, res, next) => {
        try {
            const Settings = require('@/api/v1/models/schema/Settings');
            const platformKey = await Settings.findOne({ key: 'platform_paymongo_key' });
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: { 
                    has_paymongo_key: !!platformKey?.value,
                    has_paybridge_key: true,
                    message: platformKey?.value 
                        ? 'Platform payment gateway is configured'
                        : 'No platform payment gateway configured'
                }
            });
        } catch (error) {
            console.error('Get payment key status error:', error);
            next(error);
        }
    };
    
    // Save platform PayMongo key (for admin/platform)
    savePayMongoKey = async (req, res, next) => {
        try {
            const { secret_key } = req.body;
            
            if (!secret_key) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Secret key is required');
            }
            
            if (!secret_key.startsWith('sk_')) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid PayMongo secret key format. Must start with "sk_"');
            }
            
            // Encrypt the key via PayBridge
            const encryptRes = await axios.post(`${PAYBRIDGE_API_URL}/encrypt`, {
                secret_key: secret_key
            }, {
                headers: { 'X-PayBridge-Master-Key': PAYBRIDGE_MASTER_KEY }
            });
            
            const Settings = require('@/api/v1/models/schema/Settings');
            
            // Find and update or create new settings record
            let settings = await Settings.findOne({ key: 'platform_paymongo_key' });
            
            if (settings) {
                // Update existing
                settings.value = encryptRes.data.encrypted_key;
                settings.label = 'Platform PayMongo Secret Key (Encrypted)';
                await settings.save();
            } else {
                // Create new
                settings = await Settings.create({
                    key: 'platform_paymongo_key',
                    value: encryptRes.data.encrypted_key,
                    label: 'Platform PayMongo Secret Key (Encrypted)'
                });
            }
            
            return res.status(HTTP_STATUS.OK).json({ 
                success: true, 
                message: 'Platform payment key saved and encrypted successfully!' 
            });
            
        } catch (error) {
            console.error('Save payment key error:', error);
            next(error);
        }
    };
}

module.exports = new AdminPaymentController();