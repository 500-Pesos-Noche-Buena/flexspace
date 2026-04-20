// app/api/v1/emails/VoucherEmail.js
const BaseEmail = require('./BaseEmail');

const VoucherEmail = ({ name, voucher }) => {
    const content = `
        <h2 style="color: #4F46E5; margin-bottom: 16px;">You Got a Voucher, ${name} 🎉</h2>
        <p style="font-size: 16px; line-height: 1.5; color: #4a4a4a; margin-bottom: 24px;">
            Great news! Here's your discount voucher for your next booking.
        </p>
        
        <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 16px; padding: 30px; text-align: center; margin: 20px 0;">
            <p style="font-size: 12px; color: #92400E; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Voucher Code</p>
            <p style="font-size: 36px; font-weight: bold; letter-spacing: 4px; color: #92400E; margin: 8px 0; font-family: monospace;">${voucher.code}</p>
            <p style="font-size: 32px; font-weight: bold; color: #92400E; margin: 16px 0;">₱${voucher.discount} OFF</p>
            <div style="background-color: white; border-radius: 8px; padding: 12px; margin-top: 16px;">
                <p style="margin: 0; color: #78350F;">📅 Valid until: ${voucher.expires}</p>
                ${voucher.min_spend ? `<p style="margin: 8px 0 0; color: #78350F;">💰 Minimum spend: ₱${voucher.min_spend}</p>` : ''}
            </div>
        </div>
        
        <div style="background-color: #ECFDF5; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #065F46; font-size: 14px;">
                🎯 <strong>How to use:</strong> Apply this voucher code at checkout to enjoy your discount!
            </p>
        </div>
    `;
    
    return BaseEmail({
        subject: 'You Got a FlexSpace Voucher! 🎫',
        header: 'Voucher Reward',
        content: content,
        buttonText: 'Book Now',
        buttonUrl: 'https://flexspace-iloilo.vercel.app/user/space'
    });
};

module.exports = VoucherEmail;