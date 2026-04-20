// app/api/v1/emails/WelcomeEmail.js
const BaseEmail = require('./BaseEmail');

const WelcomeEmail = ({ name, email, password, role }) => {
    const loginUrl = 'https://flexspace-iloilo.vercel.app/auth/login';
    const idLabel = role === 'space_owner' ? 'Space Owner ID' : 'User ID';
    
    const content = `
        <h2 style="color: #4F46E5; margin-bottom: 16px;">Hello, ${name}</h2>
        <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 16px;">
            Your FlexSpace account has been successfully created. Below are your login details:
        </p>
        
        <div style="background-color: #EEF2FF; border-left: 4px solid #4F46E5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 8px 0;"><strong>Login ID:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px;">${email}</code> <em>or</em> <code style="background: white; padding: 4px 8px; border-radius: 4px;">${email}</code></p>
            <p style="margin: 8px 0;"><strong>Password:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
            <p style="margin: 8px 0;"><strong>Role:</strong> <span style="background: #4F46E5; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${role}</span></p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.5; margin: 16px 0;">
            You can log in here: <a href="${loginUrl}" style="color: #4F46E5; text-decoration: none; font-weight: 600;">${loginUrl}</a>
        </p>
        
        <p style="font-size: 16px; line-height: 1.5; margin: 16px 0;">
            Use either your email or your <strong>${idLabel}</strong> as your Login ID. Please keep your credentials secure.
        </p>
        
        <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #DC2626; font-weight: 600;">⚠️ Important:</p>
            <p style="margin: 8px 0 0; color: #991B1B;">For security reasons, please change your password immediately after your first login.</p>
        </div>
        
        <div style="background-color: #F3E8FF; border-radius: 8px; padding: 20px; margin-top: 20px;">
            <h3 style="color: #6B21A5; margin: 0 0 8px 0;">✨ What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #581C87;">
                <li>Browse available coworking spaces</li>
                <li>Book your first workspace</li>
                <li>Earn points with every booking</li>
                <li>Redeem points for discount vouchers</li>
            </ul>
        </div>
    `;
    
    return BaseEmail({
        subject: 'Welcome to FlexSpace! 🚀',
        header: 'Welcome to FlexSpace',
        content: content,
        buttonText: 'Go to Dashboard',
        buttonUrl: 'https://flexspace-iloilo.vercel.app/dashboard'
    });
};

module.exports = WelcomeEmail;