// app/api/v1/controllers/emailController.js
const { HTTP_STATUS } = require('@/utils/constants');
const emailService = require('@/api/v1/services/emailService');

class EmailController {
    sendWelcome = async (req, res, next) => {
        try {
            const { email, name, password, role } = req.body;
            
            if (!email || !name) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    success: false, 
                    error: 'Email and name are required' 
                });
            }
            
            const result = await emailService.sendWelcomeEmail(
                email, 
                name, 
                email,  // login ID (email)
                password || 'FlexSpace2026', // default password if not provided
                role || 'user'
            );
            
            if (result.success) {
                return res.status(HTTP_STATUS.OK).json({ 
                    success: true, 
                    message: 'Welcome email sent successfully',
                    messageId: result.messageId
                });
            } else {
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
                    success: false, 
                    error: result.error 
                });
            }
        } catch (error) {
            console.error('Send welcome email error:', error);
            next(error);
        }
    };

    sendBookingConfirmation = async (req, res, next) => {
        try {
            const { email, name, booking } = req.body;
            
            if (!email || !booking) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    success: false, 
                    error: 'Email and booking details are required' 
                });
            }
            
            const result = await emailService.sendBookingConfirmation(email, name || 'User', booking);
            
            if (result.success) {
                return res.status(HTTP_STATUS.OK).json({ 
                    success: true, 
                    message: 'Booking confirmation sent successfully',
                    messageId: result.messageId
                });
            } else {
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
                    success: false, 
                    error: result.error 
                });
            }
        } catch (error) {
            console.error('Send booking confirmation error:', error);
            next(error);
        }
    };

    sendVoucher = async (req, res, next) => {
        try {
            const { email, name, voucher } = req.body;
            
            if (!email || !voucher) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    success: false, 
                    error: 'Email and voucher details are required' 
                });
            }
            
            const result = await emailService.sendVoucherEmail(email, name || 'User', voucher);
            
            if (result.success) {
                return res.status(HTTP_STATUS.OK).json({ 
                    success: true, 
                    message: 'Voucher email sent successfully',
                    messageId: result.messageId
                });
            } else {
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
                    success: false, 
                    error: result.error 
                });
            }
        } catch (error) {
            console.error('Send voucher email error:', error);
            next(error);
        }
    };
}

module.exports = new EmailController();