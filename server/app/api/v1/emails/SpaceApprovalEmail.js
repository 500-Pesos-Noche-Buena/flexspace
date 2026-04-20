// app/api/v1/emails/SpaceApprovalEmail.js
const BaseEmail = require('./BaseEmail');

const SpaceApprovalEmail = ({ name, details }) => {
    const content = `
        <div style="padding: 0 0 20px 0;">
            <h2 style="color: #4F46E5; margin: 0 0 16px 0; font-size: 24px;">Congratulations, ${name} 🎉</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 16px 0;">
                Your space provider application has been <strong style="color: #10B981;">APPROVED</strong>!
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 24px 0;">
                You can now log in to your space owner dashboard and start managing your coworking space.
            </p>
        </div>
        
        <div style="background-color: #ECFDF5; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #10B981;">
            <p style="margin: 0 0 8px 0; color: #065F46; font-size: 14px; font-weight: 600;">What you can do now:</p>
            <ul style="margin: 0; padding-left: 20px; color: #065F46; font-size: 13px;">
                <li>List your coworking spaces</li>
                <li>Manage bookings and walk-ins</li>
                <li>Track earnings and revenue</li>
                <li>Create discount vouchers</li>
                <li>Invite staff members</li>
            </ul>
        </div>
        
        <div style="background-color: #EEF2FF; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #1E3A8A; font-size: 14px;">
                💡 <strong>Quick Tip:</strong> Complete your space profile to attract more customers!
            </p>
        </div>
    `;
    
    return BaseEmail({
        subject: 'Space Provider Application Approved! 🎉',
        header: 'Application Approved!',
        content: content,
        buttonText: 'Go to Dashboard',
        buttonUrl: details.loginUrl
    });
};

module.exports = SpaceApprovalEmail;