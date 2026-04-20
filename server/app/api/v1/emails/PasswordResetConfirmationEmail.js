// app/api/v1/emails/PasswordResetConfirmationEmail.js
const BaseEmail = require('./BaseEmail');

const PasswordResetConfirmationEmail = ({ name }) => {
    const content = `
        <h2 style="color: #4F46E5; margin-bottom: 16px;">Password Changed Successfully!</h2>
        <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 16px;">
            Hello ${name},
        </p>
        <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 16px;">
            Your FlexSpace password has been successfully changed.
        </p>
        
        <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #065F46; font-size: 14px;">
                ✅ If you made this change, you can now log in with your new password.
            </p>
        </div>
        
        <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #991B1B; font-size: 14px;">
                ⚠️ If you did not change your password, please contact support immediately.
            </p>
        </div>
    `;
    
    return BaseEmail({
        subject: 'Password Changed Successfully',
        header: 'Password Updated',
        content: content,
        buttonText: 'Login to FlexSpace',
        buttonUrl: 'https://flexspace-iloilo.vercel.app/auth/login'
    });
};

module.exports = PasswordResetConfirmationEmail;