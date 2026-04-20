// app/api/v1/emails/SpaceRejectionEmail.js
const BaseEmail = require('./BaseEmail');

const SpaceRejectionEmail = ({ name }) => {
    const content = `
        <div style="padding: 0 0 20px 0;">
            <h2 style="color: #DC2626; margin: 0 0 16px 0; font-size: 24px;">Application Update</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 16px 0;">
                Hello ${name},
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 16px 0;">
                Thank you for your interest in becoming a FlexSpace provider.
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 16px 0;">
                After careful review, we regret to inform you that your application has been <strong style="color: #DC2626;">REJECTED</strong> at this time.
            </p>
        </div>
        
        <div style="background-color: #FEF2F2; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #DC2626;">
            <p style="margin: 0 0 8px 0; color: #991B1B; font-size: 14px; font-weight: 600;">Common reasons for rejection:</p>
            <ul style="margin: 0; padding-left: 20px; color: #991B1B; font-size: 13px;">
                <li>Incomplete or invalid requirements</li>
                <li>Business permit issues</li>
                <li>Location not within service area</li>
            </ul>
        </div>
        
        <div style="background-color: #F3E8FF; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #6B21A5; font-size: 14px;">
                📧 <strong>Need clarification?</strong> Contact our support team at <a href="mailto:support@flexspace.com" style="color: #4F46E5; text-decoration: none;">support@flexspace.com</a>
            </p>
        </div>
    `;
    
    return BaseEmail({
        subject: 'Space Provider Application Status',
        header: 'Application Status',
        content: content,
        buttonText: 'Contact Support',
        buttonUrl: 'mailto:support@flexspace.com'
    });
};

module.exports = SpaceRejectionEmail;