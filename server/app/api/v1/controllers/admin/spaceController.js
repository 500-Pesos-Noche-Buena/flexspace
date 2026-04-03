const { User } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');

class SpaceController {

    async index(req, res, next) {
        try {
            const { page = 1, search = '' } = req.query;

            const limit = 10;
            const skip = (page - 1) * limit;

            const query = {
                role: 'space',
                status: 'approved',
                ...(search && {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                })
            };

            const [owners, total, activeCount, inactiveCount] = await Promise.all([
                User.find(query)
                    .select('name email isActive business_permit dti_sec_reg createdAt')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),

                User.countDocuments({ role: 'space', status: 'approved' }),
                User.countDocuments({ role: 'space', status: 'approved', isActive: true }),
                User.countDocuments({ role: 'space', status: 'approved', isActive: false })
            ]);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                owners,
                stats: {
                    total,
                    active: activeCount,
                    inactive: inactiveCount
                }
            });

        } catch (error) {
            next(error);
        }
    }

    async requests(req, res, next) {
        try {
            const { page = 1, search = '', status = 'pending' } = req.query;

            const limit = 10;
            const skip = (page - 1) * limit;

            const query = {
                role: 'space',
                status: status,
                ...(search && {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                })
            };

            const [requests, total, pendingCount, rejectedCount] = await Promise.all([
                User.find(query)
                    .select('name email business_permit dti_sec_reg status createdAt')
                    .sort({ createdAt: status === 'pending' ? 1 : -1 })
                    .skip(skip)
                    .limit(limit),

                User.countDocuments(query),
                User.countDocuments({ role: 'space', status: 'pending' }),
                User.countDocuments({ role: 'space', status: 'rejected' })
            ]);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                requests,
                total,
                stats: {
                    pending: pendingCount,
                    rejected: rejectedCount
                }
            });

        } catch (error) {
            next(error);
        }
    }

    async approve(req, res, next) {
        try {
            const user = await User.findById(req.params.id);
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');

            user.status = 'approved';
            user.isActive = true;

            await user.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Application approved.'
            });

        } catch (error) {
            next(error);
        }
    }

    async reject(req, res, next) {
        try {
            const user = await User.findById(req.params.id);
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');

            user.status = 'rejected';
            user.isActive = false;

            await user.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Application rejected.'
            });

        } catch (error) {
            next(error);
        }
    }

    async toggleStatus(req, res, next) {
        try {
            const user = await User.findById(req.params.id);
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');

            user.isActive = !user.isActive;

            await user.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Status updated.'
            });

        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const user = await User.findById(req.params.id);
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');

            user.name = req.body.name ?? user.name;
            user.email = req.body.email ?? user.email;

            await user.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Space owner updated successfully'
            });

        } catch (error) {
            next(error);
        }
    }

    // ✅ ADD THIS
    async destroy(req, res, next) {
        try {
            const user = await User.findById(req.params.id);
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');

            await user.deleteOne();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Space owner deleted successfully'
            });

        } catch (error) {
            next(error);
        }
    }

}

module.exports = new SpaceController();