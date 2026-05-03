const userService = require('@/api/v1/services/userService');
const ApiError = require('@/api/v1/utils/ApiError');
const { generateAuthTokens } = require('@/api/v1/utils/jwt');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const emailService = require('@/api/v1/services/emailService');

class AuthController {
    login = async (req, res, next) => {
        try {
            const { email, password } = req.body;

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
                    role: result.user.role
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
                isActive: true
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
}

module.exports = new AuthController();