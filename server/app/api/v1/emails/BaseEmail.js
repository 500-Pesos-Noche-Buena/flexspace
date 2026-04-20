// app/api/v1/emails/BaseEmail.js
const BaseEmail = ({ subject, header, content, buttonText, buttonUrl }) => {
    const currentYear = new Date().getFullYear();
    
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                @media only screen and (max-width: 600px) {
                    .container { width: 100% !important; }
                    .content { padding: 20px !important; }
                }
            </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; background-color: #f7f7f7;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td align="center" style="padding: 20px 0;">
                        <table role="presentation" class="container" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 30px; text-align: center;">
                                    <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">${header}</h1>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td class="content" style="padding: 40px; background-color: #ffffff;">
                                    ${content}
                                    
                                    ${buttonText && buttonUrl ? `
                                    <div style="text-align: center; margin: 35px 0 20px;">
                                        <a href="${buttonUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; transition: transform 0.2s;">
                                            ${buttonText}
                                        </a>
                                    </div>
                                    ` : ''}
                                
    
                                    <!-- Help Section -->
                                    <div style="background-color: #F3E8FF; border-radius: 12px; padding: 20px; margin: 30px 0 20px 0; text-align: center;">
                                        <p style="margin: 0 0 8px 0; color: #6B21A5; font-size: 14px; font-weight: 600;">Need help?</p>
                                        <p style="margin: 0; color: #6B21A5; font-size: 13px; line-height: 1.5;">
                                            Contact our support team at 
                                            <a href="mailto:flexspace260@gmail.com" style="color: #4F46E5; text-decoration: none; font-weight: 600;">flexspace260@gmail.com</a>
                                        </p>
                                    </div>
                                
    
                                
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #F8FAFC; padding: 30px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
                                    <p style="margin: 0; color: #64748B; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                                        © ${currentYear} FlexSpace. All rights reserved.
                                    </p>
                                    <p style="margin: 8px 0 0; color: #94A3B8; font-size: 11px; font-weight: 500;">
                                        Premium Coworking Spaces in Iloilo City
                                    </p>
                                    <p style="margin: 8px 0 0; color: #94A3B8; font-size: 11px;">
                                        Powered by: <span style="color: #4F46E5; font-weight: 700;">FlexSpace</span> | Developer: <span style="color: #4F46E5; font-weight: 700;">J.D. Gallenero</span>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
};

module.exports = BaseEmail;