// app/api/v1/controllers/passwordController.js
const { HTTP_STATUS } = require('@/utils/constants');
const { User } = require('@/api/v1/models');
const otpService = require('@/api/v1/services/otpService');
const emailService = require('@/api/v1/services/emailService');
const bcrypt = require('bcryptjs');
const ApiError = require('@/utils/ApiError');

class PasswordController {
    // Step 1: Request OTP
forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Email is required');
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
        
        // Verify it was saved
        const savedUser = await User.findOne({ email });
        console.log(`✅ OTP saved for ${email}: ${savedUser.otpCode}`);
        console.log(`📅 Expires at: ${savedUser.otpExpires}`);
        
        // Send OTP via email
        await emailService.sendOTPEmail(user.email, user.name, otp);
        
        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: 'OTP sent to your email'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        next(error);
    }
};
    
  // Step 2: Verify OTP
verifyOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        
        console.log(`🔐 Verifying OTP for email: ${email}, received OTP: ${otp}`);
        
        if (!email || !otp) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Email and OTP are required');
        }
        
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log(`❌ User not found: ${email}`);
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
        }
        
        console.log(`📦 Stored OTP: ${user.otpCode}, Type: ${typeof user.otpCode}`);
        console.log(`📦 Received OTP: ${otp}, Type: ${typeof otp}`);
        console.log(`📅 Stored Expiry: ${user.otpExpires}`);
        console.log(`🕐 Current Time: ${new Date()}`);
        
        // Check if OTP exists
        if (!user.otpCode) {
            console.log(`❌ No OTP found for user`);
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No OTP request found. Please request a new OTP.');
        }
        
        // Compare as strings (trim and convert both to strings)
        const storedOTP = user.otpCode.toString().trim();
        const receivedOTP = otp.toString().trim();
        
        console.log(`🔍 Comparing: "${storedOTP}" === "${receivedOTP}"`);
        
        if (storedOTP !== receivedOTP) {
            console.log(`❌ OTP mismatch`);
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid OTP');
        }
        
        // Check expiry
        if (otpService.isOTPExpired(user.otpExpires)) {
            console.log(`❌ OTP expired`);
            user.otpCode = null;
            user.otpExpires = null;
            await user.save();
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'OTP has expired');
        }
        
        console.log(`✅ OTP verified successfully`);
        
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
        console.error('Verify OTP error:', error);
        next(error);
    }
};
    
    // Step 3: Reset Password
    resetPassword = async (req, res, next) => {
        try {
            const { resetToken, newPassword } = req.body;
            
            if (!resetToken || !newPassword) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Reset token and new password are required');
            }
            
            if (newPassword.length < 6) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Password must be at least 6 characters');
            }
            
            const user = await User.findOne({
                resetPasswordToken: resetToken,
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
            console.error('Reset password error:', error);
            next(error);
        }
    };
}

module.exports = new PasswordController();