// app/api/v1/controllers/passwordController.js
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const { User } = require('@/api/v1/models');
const otpService = require('@/api/v1/services/otpService');
const emailService = require('@/api/v1/services/emailService');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const ApiError = require('@/api/v1/utils/ApiError');

class PasswordController {
    // Step 1: Request OTP
    forgotPassword = async (req, res, next) => {
        try {
            if (typeof req.body?.email !== 'string') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Valid email is required');
            }

            const email = req.body.email.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Valid email format is required');
            }

            const user = await User.findOne({ email });

            if (!user) {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    message: 'If your email is registered, you will receive an OTP'
                });
            }

            // Generate OTP as string
            const otp = otpService.generateOTP();
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            user.otpCode = otp.toString();
            user.otpExpires = otpExpires;
            await user.save();

            // Send OTP via email
            await emailService.sendOTPEmail(user.email, user.name, otp);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'OTP sent to your email'
            });
        } catch (error) {
            next(error);
        }
    };

    // Step 2: Verify OTP
    verifyOTP = async (req, res, next) => {
        try {
            if (typeof req.body?.email !== 'string' || (typeof req.body?.otp !== 'string' && typeof req.body?.otp !== 'number')) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Email and OTP are required');
            }

            const email = req.body.email.trim().toLowerCase();
            const otp = String(req.body.otp).trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!email || !emailRegex.test(email) || !/^\d{6,8}$/.test(otp)) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid email or OTP format');
            }

            const user = await User.findOne({ email });

            if (!user) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
            }

            // Check if OTP exists
            if (!user.otpCode) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No OTP request found. Please request a new OTP.');
            }

            // Compare as strings
            const storedOTP = String(user.otpCode).trim();
            const receivedOTP = otp;

            const storedBuf = Buffer.from(storedOTP);
            const receivedBuf = Buffer.from(receivedOTP);
            const isMatch = storedBuf.length === receivedBuf.length && crypto.timingSafeEqual(storedBuf, receivedBuf);

            if (!isMatch) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid OTP');
            }

            // Check expiry
            if (otpService.isOTPExpired(user.otpExpires)) {
                user.otpCode = null;
                user.otpExpires = null;
                await user.save();
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'OTP has expired');
            }

            // Generate reset token
            const resetToken = otpService.generateResetToken();
            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            user.otpCode = null;
            user.otpExpires = null;
            await user.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'OTP verified successfully',
                resetToken: resetToken
            });
        } catch (error) {
            next(error);
        }
    };

    // Step 3: Reset Password
    resetPassword = async (req, res, next) => {
        try {
            const { resetToken, newPassword } = req.body;

            if (typeof resetToken !== 'string' || typeof newPassword !== 'string') {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Reset token and new password are required');
            }

            const cleanToken = resetToken.trim();
            if (!cleanToken) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Reset token is required');
            }

            if (newPassword.length < 6) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Password must be at least 6 characters');
            }

            const user = await User.findOne({
                resetPasswordToken: cleanToken,
                resetPasswordExpires: { $gt: new Date() }
            });

            if (!user) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid or expired reset token');
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();

            // Send confirmation email
            await emailService.sendPasswordResetConfirmation(user.email, user.name);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Password reset successfully'
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new PasswordController();