const userService = require('@/api/v1/services/userService');
const ApiError = require('@/utils/ApiError');
const { generateAuthTokens } = require('@/utils/jwt');
const { HTTP_STATUS } = require('@/utils/constants');

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

            // Handle Space Owners waiting for Admin Approval
            if (result.type === 'pending') {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    status: 'pending',
                    name: result.user.name,
                    message: "Your application is still being reviewed."
                });
            }

            // Handle deactivated accounts
            if (result.user.isActive === false) {
                throw new ApiError(HTTP_STATUS.FORBIDDEN, "Your account is not yet activated.");
            }

            // Generate JWT (Make sure your generateAuthTokens uses result.user._id as 'sub')
            const { access } = generateAuthTokens(result.user);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                status: 'success',
                token: access.token, // This is what your frontend saves as 'authToken'
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

    getUploadPath = (filename) => {
        return path.join(process.cwd(), 'server/public/uploads/requirements', filename);
    };

    register = async (req, res, next) => {
        try {
            const { name, email, password, role } = req.body;

            if (!name || !email || !password) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, "All fields are required.");
            }

            if (await userService.isEmailTaken(email)) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Email is already registered.");
            }

            // Handle Space Owner Registration (Requires Files)
            if (role === 'space') {
                const permit = req.files?.['business_permit']?.[0];
                const dti = req.files?.['dti_sec_reg']?.[0];

                if (!permit || !dti) {
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Business Permit and DTI documents are required.");
                }

                await userService.createSpaceRequest({
                    name,
                    email,
                    password,
                    businessPermit: permit.filename,
                    dtiSecReg: dti.filename
                });

                return res.status(HTTP_STATUS.CREATED).json({
                    success: true,
                    status: 'pending',
                    message: 'Application submitted! Please wait for admin approval.'
                });
            }

            // Standard User Registration
            await userService.createUser({ name, email, password });

            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Registration successful! You can now log in.'
            });

        } catch (error) {
            // 🛑 CLEANUP: If registration fails, delete uploaded files
            if (req.files) {
                const filesToCleanup = [
                    req.files['business_permit']?.[0],
                    req.files['dti_sec_reg']?.[0]
                ].filter(Boolean);

                for (const file of filesToCleanup) {
                    const filePath = this.getUploadPath(file.filename);
                    await fs.unlink(filePath).catch(() => null);
                }
            }
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