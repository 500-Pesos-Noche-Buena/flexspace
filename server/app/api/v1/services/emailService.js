const nodemailer = require('nodemailer');
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
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async sendWelcomeEmail(to, name, email, password, role) {
        try {
            const htmlContent = WelcomeEmail({ name, email, password, role });

            const info = await this.transporter.sendMail({
                from: `"FlexSpace" <${process.env.SMTP_FROM_EMAIL}>`,
                to,
                subject: 'Welcome to FlexSpace! 🚀',
                html: htmlContent
            });

            console.log(`Welcome email sent to ${to}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    async sendBookingConfirmation(to, name, bookingDetails) {
        try {
            const htmlContent = BookingConfirmationEmail({ name, booking: bookingDetails });

            const info = await this.transporter.sendMail({
                from: `"FlexSpace" <${process.env.SMTP_FROM_EMAIL}>`,
                to,
                subject: `Booking Confirmed - ${bookingDetails.ticket_number}`,
                html: htmlContent
            });

            console.log(`Booking confirmation sent to ${to}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    async sendVoucherEmail(to, name, voucherDetails) {
        try {
            const htmlContent = VoucherEmail({ name, voucher: voucherDetails });

            const info = await this.transporter.sendMail({
                from: `"FlexSpace" <${process.env.SMTP_FROM_EMAIL}>`,
                to,
                subject: 'You got a voucher! 🎉',
                html: htmlContent
            });

            console.log(`Voucher email sent to ${to}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    async sendPasswordResetEmail(to, name, resetLink) {
        try {
            const htmlContent = PasswordResetEmail({ name, resetLink });

            const info = await this.transporter.sendMail({
                from: `"FlexSpace" <${process.env.SMTP_FROM_EMAIL}>`,
                to,
                subject: 'Reset Your FlexSpace Password',
                html: htmlContent
            });

            console.log(`Password reset email sent to ${to}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    async sendOTPEmail(to, name, otp) {
        try {
            const htmlContent = OTPEmail({ name, otp });

            const info = await this.transporter.sendMail({
                from: `"FlexSpace" <${process.env.SMTP_FROM_EMAIL}>`,
                to,
                subject: 'Password Reset OTP - FlexSpace',
                html: htmlContent
            });

            console.log(`OTP email sent to ${to}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    async sendPasswordResetConfirmation(to, name) {
        try {
            const htmlContent = PasswordResetConfirmationEmail({ name });

            const info = await this.transporter.sendMail({
                from: `"FlexSpace" <${process.env.SMTP_FROM_EMAIL}>`,
                to,
                subject: 'Password Changed Successfully',
                html: htmlContent
            });

            console.log(`Password reset confirmation sent to ${to}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    async sendBookingCompletionEmail(to, name, bookingDetails) {
        try {
            const htmlContent = BookingCompletionEmail({ name, booking: bookingDetails });

            const info = await this.transporter.sendMail({
                from: `"FlexSpace" <${process.env.SMTP_FROM_EMAIL}>`,
                to,
                subject: `Your Receipt - ${bookingDetails.ticket_number}`,
                html: htmlContent
            });

            console.log(`Booking completion email sent to ${to}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    async sendSpaceApprovalEmail(to, name, details) {
        try {
            const htmlContent = SpaceApprovalEmail({ name, details });

            const info = await this.transporter.sendMail({
                from: `"FlexSpace" <${process.env.SMTP_FROM_EMAIL}>`,
                to,
                subject: 'Space Provider Application Approved! 🎉',
                html: htmlContent
            });

            console.log(`✅ Space approval email sent to ${to}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    async sendSpaceRejectionEmail(to, name) {
        try {
            const htmlContent = SpaceRejectionEmail({ name });

            const info = await this.transporter.sendMail({
                from: `"FlexSpace" <${process.env.SMTP_FROM_EMAIL}>`,
                to,
                subject: 'Space Provider Application Status',
                html: htmlContent
            });

            console.log(`✅ Space rejection email sent to ${to}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();