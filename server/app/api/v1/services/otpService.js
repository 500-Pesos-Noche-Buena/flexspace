// app/api/v1/services/otpService.js
const crypto = require('crypto');

class OTPService {
    generateOTP(length = 6) {
        // Generate cryptographically secure OTP using CSPRNG
        const min = Math.pow(10, length - 1);
        const max = Math.pow(10, length);
        const otp = crypto.randomInt(min, max).toString();
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