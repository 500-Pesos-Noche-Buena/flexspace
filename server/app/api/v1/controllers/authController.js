const userService = require('@/api/v1/services/userService');
const ApiError = require('@/api/v1/utils/ApiError');
const { generateAuthTokens } = require('@/api/v1/utils/jwt');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const emailService = require('@/api/v1/services/emailService');

const verifyTurnstileToken = async (token) => {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secretKey}&response=${token}`,
    });
    const data = await response.json();
    return data.success;
};

class AuthController {


    login = async (req, res, next) => {
        try {
            const { email, password, 'cf-turnstile-response': turnstileToken } = req.body;

            // 1. Verify Turnstile
            if (!turnstileToken) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Security verification required");
            }

            const isTurnstileValid = await verifyTurnstileToken(turnstileToken);
            if (!isTurnstileValid) {
                throw new ApiError(HTTP_STATUS.FORBIDDEN, "Security verification failed. Please try again.");
            }

            // 2. Continue with existing login logic...
            if (!email || !password) {
                throw new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, "Email and password are required");
            }

            const result = await userService.verifyUserCredentials(email, password);

            if (!result) {
                throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid email or password");
            }

            if (result.type === 'pending') {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    status: 'pending',
                    name: result.user.name,
                    message: "Your application is still being reviewed."
                });
            }

            // Check if user is a Google OAuth user (has no password)
            if (result.user.authProvider === 'google' && !result.user.password) {
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    success: false,
                    message: "This account uses Google Sign-In. Please log in with Google.",
                    requiresGoogle: true
                });
            }

            if (result.user.isActive === false) {
                throw new ApiError(HTTP_STATUS.FORBIDDEN, "Your account is not yet activated.");
            }

            const { access } = generateAuthTokens(result.user);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                status: 'success',
                token: access.token,
                user: {
                    id: result.user._id,
                    name: result.user.name,
                    email: result.user.email,
                    role: result.user.role,
                    avatar: result.user.avatar || null,
                    authProvider: result.user.authProvider || 'local'
                }
            });

        } catch (error) {
            console.error("Login Error:", error.message);
            next(error);
        }
    };

    register = async (req, res, next) => {
        try {
            const { name, email, password, role } = req.body;

            console.log(`📝 Registration attempt: ${email}, role: ${role || 'user'}`);

            if (!name || !email || !password) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, "All fields are required.");
            }

            if (await userService.isEmailTaken(email)) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Email is already registered.");
            }

            // Handle Space Owner Registration (Requires Files)
            if (role === 'space') {
                // Get Cloudinary URLs from middleware (already uploaded)
                const permitUrl = req.cloudinaryUrls?.business_permit?.[0];
                const dtiUrl = req.cloudinaryUrls?.dti_sec_reg?.[0];

                if (!permitUrl || !dtiUrl) {
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Business Permit and DTI documents are required.");
                }

                // Create space request with Cloudinary URLs (NO user created yet)
                const spaceRequest = await userService.createSpaceRequest({
                    name,
                    email,
                    password,
                    business_permit: permitUrl,
                    dti_sec_reg: dtiUrl,
                    status: 'pending'
                });

                console.log('✅ Space request created with ID:', spaceRequest._id);
                console.log('   Permit URL:', permitUrl);
                console.log('   DTI URL:', dtiUrl);
                console.log('   Status: pending - waiting for admin approval');

                return res.status(HTTP_STATUS.CREATED).json({
                    success: true,
                    status: 'pending',
                    message: 'Application submitted! Please wait for admin approval.',
                    requestId: spaceRequest._id
                });
            }

            // Standard User Registration (ONLY for regular users)
            const newUser = await userService.createUser({
                name,
                email,
                password,
                role: 'user',
                status: 'approved',
                isActive: true,
                authProvider: 'local'
            });

            console.log(`✅ User registered: ${newUser.email}, ID: ${newUser._id}`);

            // Send Welcome Email
            if (newUser && newUser.email) {
                try {
                    await emailService.sendWelcomeEmail(
                        newUser.email,
                        newUser.name,
                        newUser.email,
                        password,
                        newUser.role || 'user'
                    );
                    console.log(`✅ Welcome email sent to ${newUser.email}`);
                } catch (emailError) {
                    console.error('❌ Failed to send welcome email:', emailError.message);
                }
            }

            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                status: 'success',
                message: 'Registration successful! You can now log in.'
            });

        } catch (error) {
            console.error('❌ Registration error:', error.message);
            next(error);
        }
    };

    logout = async (req, res, next) => {
        try {
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                status: 'success',
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error("Logout Error:", error.message);
            next(error);
        }
    };

    // ============ GOOGLE OAUTH CALLBACK HANDLER ============
    googleCallback = async (req, res, next) => {
        try {
            const user = req.user;

            console.log('🔍 Google user from DB:', {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            });

            if (!user) {
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=google_auth_failed`);
            }

            // Generate JWT token
            const { access } = generateAuthTokens(user);

            // Prepare user data as JSON string then base64 encode for URL safety
            const userData = {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar || null,
                authProvider: 'google'
            };

            const encodedUserData = Buffer.from(JSON.stringify(userData)).toString('base64');

            console.log('🔍 Encoded user data:', encodedUserData);

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/auth/google-callback?token=${access.token}&user=${encodedUserData}`);

        } catch (error) {
            console.error('Google Callback Error:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/login?error=server_error`);
        }
    };
}

module.exports = new AuthController();