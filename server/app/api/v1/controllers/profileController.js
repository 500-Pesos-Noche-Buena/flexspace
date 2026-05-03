const { User } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');
const { hashPassword, comparePassword } = require('@/api/v1/utils/hash');

class ProfileController {
    getProfile = async (req, res, next) => {
        try {
            const userId = req.user?.sub || req.user?._id;
            const user = await User.findById(userId).select('-password');
            
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: user
            });
        } catch (error) {
            next(error);
        }
    };

    updateProfile = async (req, res, next) => {
        try {
            const userId = req.user?.sub || req.user?._id;
            const { name, email } = req.body;

            const user = await User.findById(userId);
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

            if (name) user.name = name;
            if (email) user.email = email;

            await user.save();

            const updatedUser = await User.findById(userId).select('-password');

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: "Profile updated successfully",
                data: updatedUser
            });
        } catch (error) {
            next(error);
        }
    };

    updatePassword = async (req, res, next) => {
        try {
            const userId = req.user?.sub || req.user?._id;
            const { current_password, new_password } = req.body;

            if (!current_password || !new_password) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Current password and new password are required");
            }

            const user = await User.findById(userId);
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

            const isMatch = await comparePassword(current_password, user.password);
            if (!isMatch) {
                throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Incorrect current password");
            }
            
            user.password = await hashPassword(new_password);
            await user.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: "Password updated successfully"
            });
        } catch (error) {
            next(error);
        }
    };

    updatePaymentQR = async (req, res, next) => {
        try {
            console.log('📸 updatePaymentQR called');
            
            const userId = req.user?.sub || req.user?._id;
            
            if (!req.file) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, "QR code image is required");
            }

            const user = await User.findById(userId);
            if (!user) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");
            }

            // Get Cloudinary URL from middleware
            const qrUrl = req.cloudinaryUrl;
            
            if (!qrUrl) {
                throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to upload QR code");
            }
            
            // Save to database
            user.business_payment_qr = qrUrl;
            await user.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: "Payment QR code updated successfully",
                data: {
                    business_payment_qr: qrUrl
                }
            });
        } catch (error) {
            console.error('QR Update Error:', error.message);
            next(error);
        }
    };

    updatePaymentMethods = async (req, res, next) => {
        try {
            const userId = req.user?.sub || req.user?._id;
            const { payment_methods } = req.body;

            if (!payment_methods) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, "payment_methods is required");
            }

            if (!Array.isArray(payment_methods)) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, "payment_methods must be an array");
            }

            const user = await User.findById(userId);
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

            user.payment_methods = payment_methods;
            await user.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: "Payment methods updated successfully",
                data: {
                    payment_methods: user.payment_methods
                }
            });
        } catch (error) {
            console.error('Payment Methods Update Error:', error.message);
            next(error);
        }
    };

    getPaymentDetails = async (req, res, next) => {
        try {
            const userId = req.user?.sub || req.user?._id;
            const user = await User.findById(userId).select('business_payment_qr payment_methods name email');
            
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    business_payment_qr: user.business_payment_qr,
                    payment_methods: user.payment_methods,
                    business_name: user.name,
                    email: user.email
                }
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new ProfileController();