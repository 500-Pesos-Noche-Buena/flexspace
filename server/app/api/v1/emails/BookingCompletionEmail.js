// app/api/v1/emails/BookingCompletionEmail.js
const BaseEmail = require('./BaseEmail');

const BookingCompletionEmail = ({ name, booking }) => {
    const content = `
        <div style="padding: 0 0 20px 0;">
            <h2 style="color: #4F46E5; margin: 0 0 16px 0; font-size: 24px;">Session Completed! 🎉</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 16px 0;">
                Hello ${name},
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 24px 0;">
                Your session at <strong>${booking.space_name}</strong> has been successfully completed. Here's your receipt:
            </p>
        </div>
        
        <!-- Receipt Card -->
        <div style="background-color: #F8FAFC; border-radius: 16px; padding: 24px; margin: 20px 0; border: 1px solid #E2E8F0;">
            <!-- Header with Icon -->
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); width: 60px; height: 60px; border-radius: 30px; display: inline-flex; align-items: center; justify-content: center;">
                    <span style="font-size: 30px;">🧾</span>
                </div>
                <h3 style="margin: 12px 0 4px 0; color: #1a1a1a; font-size: 18px;">Payment Receipt</h3>
                <p style="margin: 0; color: #6B7280; font-size: 12px;">Receipt #: ${booking.receipt_number}</p>
            </div>
            
            <!-- Divider -->
            <div style="height: 1px; background-color: #E2E8F0; margin: 0 0 20px 0;"></div>
            
            <!-- Booking Details -->
            <div style="margin-bottom: 20px;">
                <div style="margin-bottom: 16px;">
                    <p style="font-size: 12px; color: #64748B; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Ticket Number</p>
                    <p style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0;">${booking.ticket_number}</p>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <p style="font-size: 12px; color: #64748B; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Space</p>
                    <p style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0;">${booking.space_name}</p>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <p style="font-size: 12px; color: #64748B; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
                    <p style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0;">${booking.date}</p>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <p style="font-size: 12px; color: #64748B; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Time</p>
                    <p style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0;">${booking.time}</p>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <p style="font-size: 12px; color: #64748B; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Payment Method</p>
                    <p style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0;">${booking.payment_method}</p>
                </div>
            </div>
            
            <!-- Divider -->
            <div style="height: 1px; background-color: #E2E8F0; margin: 0 0 20px 0;"></div>
            
            <!-- Price Breakdown -->
            <div style="background-color: #EEF2FF; border-radius: 12px; padding: 20px;">
                ${booking.original_amount && booking.original_amount > booking.total_amount ? `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="color: #64748B; font-size: 14px;">Subtotal</span>
                    <span style="color: #6B7280; text-decoration: line-through; font-size: 14px;">₱${booking.original_amount.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #C7D2FE;">
                    <span style="color: #64748B; font-size: 14px;">Voucher Discount</span>
                    <span style="color: #10B981; font-weight: 600; font-size: 14px;">-₱${booking.discount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: ${booking.original_amount && booking.original_amount > booking.total_amount ? '0' : '0'};">
                    <span style="font-weight: 700; color: #1a1a1a; font-size: 16px;">Total Paid</span>
                    <span style="font-weight: 700; font-size: 24px; color: #4F46E5;">₱${booking.total_amount.toFixed(2)}</span>
                </div>
            </div>
        </div>
        
        <!-- Points Earned Card -->
        <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 16px; padding: 24px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; color: #92400E; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">🎉 Points Earned</p>
            <p style="margin: 12px 0; font-size: 36px; font-weight: 800; color: #92400E;">${booking.points_earned} points</p>
            <p style="margin: 0; color: #92400E; font-size: 13px;">= ₱${booking.points_earned} value on your next booking!</p>
        </div>
        
        <!-- Pro Tip -->
        <div style="background-color: #ECFDF5; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #10B981;">
            <p style="margin: 0; color: #065F46; font-size: 13px; line-height: 1.5;">
                💡 <strong>Pro Tip:</strong> Collect more points to unlock bigger discounts on your future bookings!
            </p>
        </div>

    `;
    
    return BaseEmail({
        subject: `Your Receipt - ${booking.ticket_number}`,
        header: 'Session Complete! 🎉',
        content: content,
        buttonText: 'View My Bookings',
        buttonUrl: 'https://flexspace-iloilo.vercel.app/user/bookings'
    });
};

module.exports = BookingCompletionEmail;