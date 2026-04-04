const { User, SpaceRequest } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');

class SpaceController {
    index = async (req, res, next) => {
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
    };

    requests = async (req, res, next) => {
        try {
            const { page = 1, search = '', status = 'pending' } = req.query;
            const targetStatus = ['pending', 'rejected'].includes(status) ? status : 'pending';
            
            const limit = 10;
            const skip = (page - 1) * limit;

            // 1. Query the SpaceRequest model specifically
            const query = {
                status: targetStatus, // "pending" matches your DB snippet
                ...(search && {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                })
            };

            // 2. Execute counts and find in parallel
            const [requests, total, pendingCount, rejectedCount] = await Promise.all([
                SpaceRequest.find(query)
                    .select('name email business_permit dti_sec_reg status created_at')
                    .sort({ created_at: targetStatus === 'pending' ? 1 : -1 })
                    .skip(skip)
                    .limit(limit),

                SpaceRequest.countDocuments(query),
                SpaceRequest.countDocuments({ status: 'pending' }),
                SpaceRequest.countDocuments({ status: 'rejected' })
            ]);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                requests, // This sends the array to your frontend "Filtered: 0" area
                total,
                stats: {
                    pending: pendingCount,
                    rejected: rejectedCount
                }
            });
        } catch (error) {
            console.error("❌ SpaceRequest Fetch Error:", error);
            next(error);
        }
    };

    approve = async (req, res, next) => {
        try {
            const { id } = req.params;

            const request = await SpaceRequest.findById(id);
            if (!request) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application request not found.');

            // 🚀 Create the User record
            const newUser = await User.create({
                name: request.name,
                email: request.email,
                password: request.password, 
                role: 'space',
                // 🔥 FIX: Changed 'active' to 'approved' to match your Enum
                status: 'approved', 
                business_permit: request.business_permit,
                dti_sec_reg: request.dti_sec_reg
            });

            // 🧹 Clean up the request
            await SpaceRequest.findByIdAndDelete(id);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `Account for ${newUser.name} approved successfully!`
            });
        } catch (error) {
            // This will now catch that "User validation failed" if the enum is still wrong
            console.error("❌ Validation Error:", error.message);
            next(error);
        }
    };

    reject = async (req, res, next) => {
        try {
            const { id } = req.params;

            const request = await SpaceRequest.findById(id);
            
            if (!request) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application request not found.');
            }

            request.status = 'rejected';
            
            
            await request.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `Application for ${request.name} has been rejected.`
            });
        } catch (error) {
            console.error("❌ Rejection Error:", error);
            next(error);
        }
    };

    toggleStatus = async (req, res, next) => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');

            user.isActive = !user.isActive;
            await user.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `User ${user.isActive ? 'activated' : 'deactivated'}.`
            });
        } catch (error) {
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');

            user.name = req.body.name ?? user.name;
            user.email = req.body.email ?? user.email;

            await user.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Space owner updated successfully.'
            });
        } catch (error) {
            next(error);
        }
    };

    destroy = async (req, res, next) => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');

            await user.deleteOne();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Space owner deleted successfully.'
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new SpaceController();