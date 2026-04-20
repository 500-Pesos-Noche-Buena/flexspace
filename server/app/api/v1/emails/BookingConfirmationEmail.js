// app/api/v1/emails/BookingConfirmationEmail.js
const BaseEmail = require('./BaseEmail');

const BookingConfirmationEmail = ({ name, booking }) => {
    // Format date properly
    const formattedDate = booking.date || 'Date not specified';
    const formattedTime = booking.time || 'Time not specified';
    
    const content = `
        <div style="padding: 0 0 20px 0;">
            <h2 style="color: #4F46E5; margin: 0 0 16px 0; font-size: 24px;">Booking Confirmed, ${name}! ✅</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 8px 0;">
                Your workspace booking has been confirmed. Here are your booking details:
            </p>
        </div>
        
        <!-- Booking Details Card -->
        <div style="background-color: #F8FAFC; border-radius: 16px; padding: 24px; margin: 20px 0; border: 1px solid #E2E8F0;">
            <!-- Ticket Number -->
            <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #E2E8F0;">
                <p style="font-size: 12px; color: #64748B; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Ticket Number</p>
                <p style="font-size: 18px; font-weight: 700; color: #1a1a1a; margin: 0; font-family: monospace;">${booking.ticket_number}</p>
            </div>
            
            <!-- Space Name -->
            <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #E2E8F0;">
                <p style="font-size: 12px; color: #64748B; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Space</p>
                <p style="font-size: 18px; font-weight: 700; color: #1a1a1a; margin: 0;">${booking.space_name}</p>
            </div>
            
            <!-- Date -->
            <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #E2E8F0;">
                <p style="font-size: 12px; color: #64748B; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
                <p style="font-size: 16px; font-weight: 500; color: #1a1a1a; margin: 0;">${formattedDate}</p>
            </div>
            
            <!-- Time -->
            <div style="margin-bottom: 16px;">
                <p style="font-size: 12px; color: #64748B; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Time</p>
                <p style="font-size: 16px; font-weight: 500; color: #1a1a1a; margin: 0;">${formattedTime}</p>
            </div>
            
            ${booking.total_amount ? `
            <!-- Total Amount -->
            <div style="background-color: #DCFCE7; border-radius: 12px; padding: 16px; margin-top: 20px; text-align: center;">
                <p style="font-size: 12px; color: #166534; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Total Amount</p>
                <p style="font-size: 24px; font-weight: 700; color: #166534; margin: 0;">₱${booking.total_amount.toFixed(2)}</p>
            </div>
            ` : ''}
        </div>
        
        <!-- Open Time Notice -->
        ${booking.is_open_time ? `
        <div style="background-color: #EEF2FF; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #4F46E5;">
            <p style="margin: 0; color: #1E3A8A; font-size: 14px; line-height: 1.5;">
                🕐 <strong>Open Time Booking:</strong> You can check in anytime during the day. Just scan the QR code at the hub entrance when you arrive.
            </p>
        </div>
        ` : `
        <div style="background-color: #EEF2FF; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #4F46E5;">
            <p style="margin: 0; color: #1E3A8A; font-size: 14px; line-height: 1.5;">
                🕐 <strong>Important:</strong> You have a 1-hour grace period from your scheduled start time. Please check in on time to avoid cancellation.
            </p>
        </div>
        `}
        
        <!-- QR Code Notice -->
        <div style="background-color: #FEF3C7; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.5;">
                📱 <strong>Check-in Instructions:</strong> Present this QR code at the hub entrance to check in. You can find your QR code in the FlexSpace app under "My Bookings".
            </p>
        </div>
        
        <!-- Help Section -->
        <div style="background-color: #F3E8FF; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; color: #6B21A5; font-size: 14px; font-weight: 600;">Need help?</p>
            <p style="margin: 0; color: #6B21A5; font-size: 13px; line-height: 1.5;">
                Contact our support team at <a href="mailto:flexspace260@gmail.com" style="color: #4F46E5; text-decoration: none;">flexspace260@gmail.com</a>
            </p>
        </div>
    `;
    
    return BaseEmail({
        subject: `Booking Confirmed - ${booking.ticket_number}`,
        header: 'Booking Confirmed! 🎉',
        content: content,
        buttonText: 'View My Bookings',
        buttonUrl: 'https://flexspace-iloilo.vercel.app/user/bookings'
    });
};

module.exports = BookingConfirmationEmail;