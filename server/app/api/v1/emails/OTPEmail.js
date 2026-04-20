// app/api/v1/emails/OTPEmail.js
const BaseEmail = require('./BaseEmail');

const OTPEmail = ({ name, otp }) => {
    const content = `
        <h2 style="color: #4F46E5; margin-bottom: 16px;">Password Reset Request</h2>
        <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 16px;">
            Hello ${name},
        </p>
        <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 16px;">
            We received a request to reset your password. Use the OTP code below to verify your identity:
        </p>
        
        <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 16px; padding: 30px; text-align: center; margin: 20px 0;">
            <p style="font-size: 12px; color: #92400E; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Your OTP Code</p>
            <p style="font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #92400E; margin: 16px 0; font-family: monospace;">${otp}</p>
            <p style="font-size: 12px; color: #92400E; margin: 0;">This code expires in 10 minutes</p>
        </div>
        
        <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #991B1B; font-size: 14px;">
                ⚠️ If you didn't request this, please ignore this email. Your password will remain unchanged.
            </p>
        </div>
    `;
    
    return BaseEmail({
        subject: 'Password Reset OTP - FlexSpace',
        header: 'Verify Your Identity',
        content: content,
        buttonText: null,
        buttonUrl: null
    });
};

module.exports = OTPEmail;