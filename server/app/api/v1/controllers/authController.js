const userService = require('@/api/v1/services/userService');
const ApiError = require('@/utils/ApiError');
const { generateAuthTokens } = require('@/utils/jwt');
const { HTTP_STATUS } = require('@/utils/constants');

class AuthController {
    async login(req, res, next) {
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
                    status: 'pending',
                    name: result.user.name,
                    message: "Your application is still being reviewed."
                });
            }

            if (result.user.isActive === false) {
                throw new ApiError(HTTP_STATUS.FORBIDDEN, "Your account is not yet activated.");
            }

            const { access } = generateAuthTokens(result.user);

            res.status(HTTP_STATUS.OK).json({
                status: 'success',
                token: access.token,
                user: {
                    id: result.user._id,
                    name: result.user.name,
                    role: result.user.role
                }
            });

        } catch (error) {
            next(error);
        }
    }

    async register(req, res, next) {
        try {
            const { name, email, password, role } = req.body;

            if (await userService.isEmailTaken(email)) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Email is already registered or pending approval.");
            }

            if (role === 'space') {
                if (!req.files || !req.files.business_permit || !req.files.dti_sec_reg) {
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Business Permit and DTI documents are required.");
                }

                await userService.createSpaceRequest({
                    name,
                    email,
                    password,
                    role: 'space',
                    businessPermit: req.files.business_permit[0].filename,
                    dtiSecReg: req.files.dti_sec_reg[0].filename
                });

                return res.status(HTTP_STATUS.CREATED).json({
                    status: 'pending',
                    message: 'Application submitted! Please wait for admin approval.'
                });
            }

            await userService.createUser({ name, email, password, role: 'user' });

            res.status(HTTP_STATUS.CREATED).json({
                status: 'success',
                message: 'Registration successful! You can now log in.'
            });

        } catch (error) {
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            res.status(HTTP_STATUS.OK).json({
                status: 'success',
                message: 'Logged out successfully'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();