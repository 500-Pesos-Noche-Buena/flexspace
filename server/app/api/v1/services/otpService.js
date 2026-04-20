// app/api/v1/services/otpService.js
const crypto = require('crypto');

class OTPService {
    generateOTP() {
        // Generate 6-digit OTP as string
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        return otp;
    }

    generateResetToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    isOTPExpired(expiryDate) {
        if (!expiryDate) return true;
        return new Date() > new Date(expiryDate);
    }
}

module.exports = new OTPService();