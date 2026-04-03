const { User } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError'); // 👈 Import this
const { HTTP_STATUS } = require('@/utils/constants'); // 👈 Use constants for cleaner code

class UserController {
    
    async index(req, res, next) { // 👈 Added next
        try {
            const { page = 1, search = '' } = req.query;
            const limit = 10;
            const skip = (page - 1) * limit;

            const query = {
                role: 'user', 
                ...(search && {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                })
            };

            const users = await User.find(query)
                .select('name email isActive createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await User.countDocuments(query);

            return res.status(200).json({
                success: true,
                owners: users, 
                total
            });

        } catch (error) {
            next(error); // 👈 Let errorHandler handle the 500/stack trace
        }
    }

    async toggleStatus(req, res, next) {
        try {
            const { id } = req.params;
            const user = await User.findById(id);

            if (!user) {
                // ✅ Add 'true' so Production shows this message
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

            user.name = name || user.name;
            user.email = email || user.email;

            await user.save();

            return res.status(200).json({
                success: true,
                message: 'User updated successfully.',
                data: user
            });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController();