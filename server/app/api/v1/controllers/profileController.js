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
            const { name, email, current_password, new_password } = req.body;

            const user = await User.findById(userId);
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");

            // 🛡️ Password Update Logic using your hash.js helpers
            if (new_password) {
                if (!current_password) {
                    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Current password required to set a new one");
                }

                // Use your helper: comparePassword
                const isMatch = await comparePassword(current_password, user.password);
                if (!isMatch) {
                    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Incorrect current password");
                }
                
                // Use your helper: hashPassword
                user.password = await hashPassword(new_password);
            }

            // Update other fields
            user.name = name || user.name;
            user.email = email || user.email;

            await user.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: "Profile updated successfully",
                data: { 
                    name: user.name, 
                    email: user.email 
                }
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new ProfileController();