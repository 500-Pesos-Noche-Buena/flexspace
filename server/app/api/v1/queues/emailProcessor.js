const emailService = require('@/api/v1/services/emailService');

const emailProcessor = async (job) => {
    const { type, data } = job.data;
    
    console.log(`📧 Processing email job: ${type} for ${data.email}`);
    
    try {
        switch (type) {
            case 'welcome':
                await emailService.sendWelcomeEmail(
                    data.email,
                    data.name,
                    data.email,
                    data.password,
                    data.role
                );
                break;
                
            case 'booking_confirmation':
                await emailService.sendBookingConfirmation(
                    data.email,
                    data.name,
                    data.bookingDetails
                );
                break;
                
            case 'booking_completion':
                await emailService.sendBookingCompletionEmail(
                    data.email,
                    data.name,
                    data.bookingDetails
                );
                break;
                
            case 'password_reset':
                await emailService.sendPasswordResetEmail(
                    data.email,
                    data.name,
                    data.resetToken
                );
                break;
                
            default:
                console.log(`Unknown email type: ${type}`);
        }
        
        console.log(`✅ Email sent successfully: ${type} to ${data.email}`);
        return { success: true, type };
        
    } catch (error) {
        console.error(`❌ Email failed: ${type} to ${data.email}`, error);
        throw error;
    }
};

module.exports = emailProcessor;