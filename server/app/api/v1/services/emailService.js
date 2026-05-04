const nodemailer = require('nodemailer');
const { Queue } = require('bullmq');
const Redis = require('ioredis');
const config = require('@/config/config');

// Email templates (adjust paths as needed)
const WelcomeEmail = require('../emails/WelcomeEmail');
const BookingConfirmationEmail = require('../emails/BookingConfirmationEmail');
const VoucherEmail = require('../emails/VoucherEmail');
const PasswordResetEmail = require('../emails/PasswordResetEmail');
const OTPEmail = require('../emails/OTPEmail');
const PasswordResetConfirmationEmail = require('../emails/PasswordResetConfirmationEmail');
const BookingCompletionEmail = require('../emails/BookingCompletionEmail');
const SpaceApprovalEmail = require('../emails/SpaceApprovalEmail');
const SpaceRejectionEmail = require('../emails/SpaceRejectionEmail');

class EmailService {
    constructor() {
        // Initialize transporter with config
        this.transporter = nodemailer.createTransport(config.email.smtp);
        
        // Verify SMTP connection on startup
        this.verifyConnection();

        // Setup queue using config
        this.useQueue = config.email.queue.enabled && (config.redis.url || config.redis.host);
        this.queue = null;
        
        if (this.useQueue) {
            this.setupQueue();
            console.log('✅ Email queue system initialized');
        } else {
            console.log('📧 Email queue disabled, sending directly');
        }
    }

    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ SMTP connection verified successfully');
        } catch (error) {
            console.error('❌ SMTP connection failed:', error.message);
        }
    }

    setupQueue() {
    let connectionConfig;
    
    if (process.env.REDIS_URL) {
        connectionConfig = { url: process.env.REDIS_URL };
    } else {
        connectionConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD,
        };
    }
    
    // CRITICAL: Do NOT add maxRetriesPerRequest here
    // BullMQ requires it to be undefined/null
    const connection = new Redis(connectionConfig);
    
    connection.on('connect', () => {
        console.log('✅ Redis connected for queue');
        this.useQueue = true;
    });
    
    connection.on('error', (err) => {
        console.error('❌ Redis error, disabling queue:', err.message);
        this.useQueue = false;
    });
    
    this.queue = new Queue('emailQueue', {
        connection,
        defaultJobOptions: {
            attempts: config.email.queue.attempts || 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { age: 3600 },
            removeOnFail: { age: 86400 }
        }
    });
}

    // Helper to send email directly
    async sendDirectEmail(mailOptions, emailType, to) {
        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ ${emailType} sent directly to ${to}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ ${emailType} failed:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // Helper to queue email
    async queueEmail(emailType, data) {
        try {
            const job = await this.queue.add(emailType, data);
            console.log(`📧 ${emailType} queued for ${data.to || data.email}, Job: ${job.id}`);
            return { queued: true, jobId: job.id, success: true };
        } catch (error) {
            console.error(`❌ Failed to queue ${emailType}:`, error.message);
            // Fallback to direct send if queue fails
            console.log(`🔄 Falling back to direct send...`);
            const fallbackMethod = this[`_send${emailType}Direct`];
            if (fallbackMethod) {
                return fallbackMethod.call(this, data);
            }
            return { success: false, error: error.message };
        }
    }

    // ============ WELCOME EMAIL ============
    async sendWelcomeEmail(to, name, email, password, role) {
        const htmlContent = WelcomeEmail({ name, email, password, role });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: 'Welcome to FlexSpace! 🚀',
            html: htmlContent
        };

        if (this.useQueue) {
            return this.queueEmail('welcome', { to, name, email, password, role, mailOptions });
        }
        return this.sendDirectEmail(mailOptions, 'Welcome email', to);
    }

    async _sendWelcomeDirect(data) {
        const { to, name, email, password, role } = data;
        const htmlContent = WelcomeEmail({ name, email, password, role });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: 'Welcome to FlexSpace! 🚀',
            html: htmlContent
        };
        return this.sendDirectEmail(mailOptions, 'Welcome email (fallback)', to);
    }

    // ============ BOOKING CONFIRMATION ============
    async sendBookingConfirmation(to, name, bookingDetails) {
        const htmlContent = BookingConfirmationEmail({ name, booking: bookingDetails });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: `Booking Confirmed - ${bookingDetails.ticket_number}`,
            html: htmlContent
        };

        if (this.useQueue) {
            return this.queueEmail('booking_confirmation', { to, name, bookingDetails, mailOptions });
        }
        return this.sendDirectEmail(mailOptions, 'Booking confirmation', to);
    }

    async _sendBookingConfirmationDirect(data) {
        const { to, name, bookingDetails } = data;
        const htmlContent = BookingConfirmationEmail({ name, booking: bookingDetails });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: `Booking Confirmed - ${bookingDetails.ticket_number}`,
            html: htmlContent
        };
        return this.sendDirectEmail(mailOptions, 'Booking confirmation (fallback)', to);
    }

    // ============ VOUCHER EMAIL ============
    async sendVoucherEmail(to, name, voucherDetails) {
        const htmlContent = VoucherEmail({ name, voucher: voucherDetails });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: 'You got a voucher! 🎉',
            html: htmlContent
        };

        if (this.useQueue) {
            return this.queueEmail('voucher', { to, name, voucherDetails, mailOptions });
        }
        return this.sendDirectEmail(mailOptions, 'Voucher email', to);
    }

    async _sendVoucherDirect(data) {
        const { to, name, voucherDetails } = data;
        const htmlContent = VoucherEmail({ name, voucher: voucherDetails });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: 'You got a voucher! 🎉',
            html: htmlContent
        };
        return this.sendDirectEmail(mailOptions, 'Voucher email (fallback)', to);
    }

    // ============ PASSWORD RESET ============
    async sendPasswordResetEmail(to, name, resetLink) {
        const htmlContent = PasswordResetEmail({ name, resetLink });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: 'Reset Your FlexSpace Password',
            html: htmlContent
        };

        if (this.useQueue) {
            return this.queueEmail('password_reset', { to, name, resetLink, mailOptions });
        }
        return this.sendDirectEmail(mailOptions, 'Password reset', to);
    }

    async _sendPasswordResetDirect(data) {
        const { to, name, resetLink } = data;
        const htmlContent = PasswordResetEmail({ name, resetLink });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: 'Reset Your FlexSpace Password',
            html: htmlContent
        };
        return this.sendDirectEmail(mailOptions, 'Password reset (fallback)', to);
    }

    // ============ OTP EMAIL ============
    async sendOTPEmail(to, name, otp) {
        const htmlContent = OTPEmail({ name, otp });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: 'Password Reset OTP - FlexSpace',
            html: htmlContent
        };

        if (this.useQueue) {
            return this.queueEmail('otp', { to, name, otp, mailOptions });
        }
        return this.sendDirectEmail(mailOptions, 'OTP email', to);
    }

    async _sendOTPDirect(data) {
        const { to, name, otp } = data;
        const htmlContent = OTPEmail({ name, otp });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: 'Password Reset OTP - FlexSpace',
            html: htmlContent
        };
        return this.sendDirectEmail(mailOptions, 'OTP email (fallback)', to);
    }

    // ============ PASSWORD RESET CONFIRMATION ============
    async sendPasswordResetConfirmation(to, name) {
        const htmlContent = PasswordResetConfirmationEmail({ name });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: 'Password Changed Successfully',
            html: htmlContent
        };

        if (this.useQueue) {
            return this.queueEmail('password_reset_confirm', { to, name, mailOptions });
        }
        return this.sendDirectEmail(mailOptions, 'Password reset confirmation', to);
    }

    async _sendPasswordResetConfirmDirect(data) {
        const { to, name } = data;
        const htmlContent = PasswordResetConfirmationEmail({ name });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: 'Password Changed Successfully',
            html: htmlContent
        };
        return this.sendDirectEmail(mailOptions, 'Password reset confirmation (fallback)', to);
    }

    // ============ BOOKING COMPLETION ============
    async sendBookingCompletionEmail(to, name, bookingDetails) {
        const htmlContent = BookingCompletionEmail({ name, booking: bookingDetails });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: `Your Receipt - ${bookingDetails.ticket_number}`,
            html: htmlContent
        };

        if (this.useQueue) {
            return this.queueEmail('booking_completion', { to, name, bookingDetails, mailOptions });
        }
        return this.sendDirectEmail(mailOptions, 'Booking completion', to);
    }

    async _sendBookingCompletionDirect(data) {
        const { to, name, bookingDetails } = data;
        const htmlContent = BookingCompletionEmail({ name, booking: bookingDetails });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: `Your Receipt - ${bookingDetails.ticket_number}`,
            html: htmlContent
        };
        return this.sendDirectEmail(mailOptions, 'Booking completion (fallback)', to);
    }

    // ============ SPACE APPROVAL ============
    async sendSpaceApprovalEmail(to, name, details) {
        const htmlContent = SpaceApprovalEmail({ name, details });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: 'Space Provider Application Approved! 🎉',
            html: htmlContent
        };

        if (this.useQueue) {
            return this.queueEmail('space_approval', { to, name, details, mailOptions });
        }
        return this.sendDirectEmail(mailOptions, 'Space approval', to);
    }

    async _sendSpaceApprovalDirect(data) {
        const { to, name, details } = data;
        const htmlContent = SpaceApprovalEmail({ name, details });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: 'Space Provider Application Approved! 🎉',
            html: htmlContent
        };
        return this.sendDirectEmail(mailOptions, 'Space approval (fallback)', to);
    }

    // ============ SPACE REJECTION ============
    async sendSpaceRejectionEmail(to, name) {
        const htmlContent = SpaceRejectionEmail({ name });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: 'Space Provider Application Status',
            html: htmlContent
        };

        if (this.useQueue) {
            return this.queueEmail('space_rejection', { to, name, mailOptions });
        }
        return this.sendDirectEmail(mailOptions, 'Space rejection', to);
    }

    async _sendSpaceRejectionDirect(data) {
        const { to, name } = data;
        const htmlContent = SpaceRejectionEmail({ name });
        const mailOptions = {
            from: `"FlexSpace" <${config.email.smtp.from}>`,
            to,
            subject: 'Space Provider Application Status',
            html: htmlContent
        };
        return this.sendDirectEmail(mailOptions, 'Space rejection (fallback)', to);
    }

    // Graceful shutdown
    async close() {
        if (this.queue) {
            await this.queue.close();
        }
    }
}

module.exports = new EmailService();