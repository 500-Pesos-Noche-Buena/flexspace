const emailService = require('@/api/v1/services/emailService');

const emailProcessor = async (job) => {
    const { type, data } = job.data;
    
    console.log(`📧 Processing email job: ${type} for ${data.email}`);
    
    try {
        let result;
        switch (type) {
            case 'welcome':
                result = await emailService.sendWelcomeEmail(
                    data.email,
                    data.name,
                    data.email,
                    data.password,
                    data.role
                );
                break;
                
            case 'booking_confirmation':
                result = await emailService.sendBookingConfirmation(
                    data.email,
                    data.name,
                    data.bookingDetails
                );
                break;
                
            case 'booking_completion':
                result = await emailService.sendBookingCompletionEmail(
                    data.email,
                    data.name,
                    data.bookingDetails
                );
                break;
                
            case 'password_reset':
                result = await emailService.sendPasswordResetEmail(
                    data.email,
                    data.name,
                    data.resetToken
                );
                break;
                
            default:
                throw new Error(`Unknown email type: ${type}`);
        }
        
        if (result?.success === false) {
            throw new Error(result.error || 'Email delivery failed');
        }

        console.log(`✅ Email sent successfully: ${type} to ${data.email}`);
        return { success: true, type };
        
    } catch (error) {
        console.error(`❌ Email failed: ${type} to ${data.email}`, error);
        throw error;
    }
};

module.exports = emailProcessor;