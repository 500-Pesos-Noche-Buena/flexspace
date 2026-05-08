const { User } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class UserController {
    
    index = async (req, res, next) => {
        try {
            const { page = 1, search = '', role = 'user' } = req.query;
            const limit = 10;
            const skip = (page - 1) * limit;

            const query = {
                role: role, // 'user' or 'space'
                ...(search && {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                })
            };

            const [users, total, activeCount, inactiveCount] = await Promise.all([
                User.find(query)
                    .select('name email isActive createdAt role business_permit dti_sec_reg space_request_id')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                User.countDocuments(query),
                User.countDocuments({ role: role, isActive: true }),
                User.countDocuments({ role: role, isActive: false })
            ]);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                owners: users, 
                total,
                stats: {
                    total,
                    active: activeCount,
                    inactive: inactiveCount
                }
            });
        } catch (error) {
            next(error); 
        }
    };

    async toggleStatus(req, res, next) {
        try {
            const { id } = req.params;
            const user = await User.findById(id);

            if (!user) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User account not found.', true);
            }

            user.isActive = !user.isActive; 
            await user.save();

            return res.status(200).json({
                success: true,
                message: `Account ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
                isActive: user.isActive 
            });
        } catch (error) {
            next(error);
        }
    }

    async destroy(req, res, next) {
        try {
            const { id } = req.params;
            const user = await User.findByIdAndDelete(id);

            if (!user) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found or already deleted.', true);
            }

            return res.status(200).json({
                success: true,
                message: 'Account permanently removed from the system.'
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
    try {
        const { id } = req.params;
        const { name, email } = req.body;

        const user = await User.findById(id);

        if (!user) {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found.', true);
        }

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ 
                email: email, 
                _id: { $ne: id }
            });
            
            if (existingUser) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Email is already registered to another account.', true);
            }
            user.email = email;
        }

        if (name) {
            user.name = name;
        }

        await user.save();

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: 'User updated successfully.',
            data: user
        });

    } catch (error) {
        // Handle MongoDB duplicate key error
        if (error.code === 11000) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Email is already registered to another account.'
            });
        }
        next(error);
    }
}
}

module.exports = new UserController();