// app/api/v1/emails/PasswordResetEmail.js
const BaseEmail = require('./BaseEmail');

const PasswordResetEmail = ({ name, resetLink }) => {
    const content = `
        <h2 style="color: #4F46E5; margin-bottom: 16px;">Password Reset Request</h2>
        <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 16px;">
            Hello ${name},
        </p>
        <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 16px;">
            We received a request to reset your password. Click the button below to create a new password:
        </p>
        
        <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #991B1B; font-size: 14px;">
                ⚠️ If you didn't request this, please ignore this email. Your password will remain unchanged.
            </p>
        </div>
        
        <p style="font-size: 14px; color: #6B7280; margin-top: 20px;">
            This link will expire in 1 hour.
        </p>
    `;
    
    return BaseEmail({
        subject: 'Reset Your FlexSpace Password',
        header: 'Reset Password',
        content: content,
        buttonText: 'Reset Password',
        buttonUrl: resetLink
    });
};

module.exports = PasswordResetEmail;