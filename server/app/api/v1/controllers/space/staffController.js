const userService = require('@/api/v1/services/userService');
const { User } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class StaffController {

    /**
     * Helper to extract User ID from Request
     */
    getUserId = (req) => {
        return req.user?.sub || req.user?._id || req.user?.id;
    };

    getOwnerId = async (req) => {
        const userId = this.getUserId(req);

        if (req.user?.role === 'staff') {
            const staffRecord = await User.findById(userId).select('parent_id space_id');
            if (staffRecord?.parent_id) {
                // You can also get the staff's assigned space
                const staffSpaceId = staffRecord.space_id;
                console.log(`Staff ${userId} is assigned to space: ${staffSpaceId}`);
                return staffRecord.parent_id.toString();
            }
        }

        return userId?.toString();
    };

   // GET /api/v1/space/staff
index = async (req, res, next) => {
    try {
        const ownerId = this.getUserId(req);
        const { page = 1, search = '' } = req.query;
        const limit = 10;
        const skip = (page - 1) * limit;

        const { Space } = require('@/api/v1/models');
        const ownerSpaces = await Space.find({ user_id: ownerId }).select('_id');
        const ownerSpaceIds = ownerSpaces.map(s => s._id);

        const query = {
            role: 'staff',
            $or: [
                { parent_id: ownerId },
                { space_id: { $in: ownerSpaceIds } }
            ],
            ...(search && {
                $and: [
                    {
                        $or: [
                            { name: { $regex: search, $options: 'i' } },
                            { email: { $regex: search, $options: 'i' } }
                        ]
                    }
                ]
            })
        };

        const [staff, total, activeCount, inactiveCount] = await Promise.all([
            User.find(query)
                .select('name email isActive role space_id createdAt')
                .populate('space_id', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(query),
            User.countDocuments({ ...query, isActive: true }),
            User.countDocuments({ ...query, isActive: false })
        ]);

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            staff,
            total,
            stats: { total, active: activeCount, inactive: inactiveCount }
        });
    } catch (error) {
        next(error);
    }
};

 // POST /api/v1/space/staff
store = async (req, res, next) => {
    try {
        const ownerId = this.getUserId(req);
        const { name, email, password, space_id } = req.body || {};

        // 1. Basic Validation
        if (!name || !email) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Name and Email are required.');
        }

        // 2. Validate space ownership if space_id provided
        if (space_id) {
            const { Space } = require('@/api/v1/models');
            const space = await Space.findOne({ _id: space_id, user_id: ownerId });
            if (!space) {
                throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Unauthorized: You do not own this space');
            }
        }

        // 3. Use Service to check if email is taken
        if (await userService.isEmailTaken(email)) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Email is already registered.');
        }

        const crypto = require('crypto');
        const staffPassword = (typeof password === 'string' && password.trim().length >= 8)
            ? password.trim()
            : crypto.randomBytes(12).toString('hex') + '!1Aa';

        // 4. Create staff with space_id
        const newStaff = await userService.createStaff({
            name,
            email,
            password: staffPassword,
            parent_id: ownerId,
            space_id: space_id || null
        });

        return res.status(HTTP_STATUS.CREATED).json({
            success: true,
            message: 'Staff member added successfully.',
            data: {
                id: newStaff._id,
                name: newStaff.name,
                email: newStaff.email,
                space_id: newStaff.space_id
            }
        });
    } catch (error) {
        next(error);
    }
};

    // POST /api/v1/space/staff/:id/toggle
    toggleStatus = async (req, res, next) => {
        try {
            const ownerId = this.getUserId(req);
            const { id } = req.params;

            const { Space } = require('@/api/v1/models');
            const ownerSpaces = await Space.find({ user_id: ownerId }).select('_id');
            const ownerSpaceIds = ownerSpaces.map(s => s._id);

            const user = await User.findOne({
                _id: id,
                role: 'staff',
                $or: [
                    { parent_id: ownerId },
                    { space_id: { $in: ownerSpaceIds } }
                ]
            });
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Staff not found.');

            user.isActive = !user.isActive;
            await user.save();

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `Status updated to ${user.isActive ? 'Active' : 'Inactive'}.`,
                isActive: user.isActive
            });
        } catch (error) {
            next(error);
        }
    };

    // PUT /api/v1/space/staff/:id
    update = async (req, res, next) => {
        try {
            const ownerId = this.getUserId(req);
            const { id } = req.params;
            const { name, email, space_id } = req.body || {};

            const { Space } = require('@/api/v1/models');
            const ownerSpaces = await Space.find({ user_id: ownerId }).select('_id');
            const ownerSpaceIds = ownerSpaces.map(s => s._id);

            const user = await User.findOne({
                _id: id,
                role: 'staff',
                $or: [
                    { parent_id: ownerId },
                    { space_id: { $in: ownerSpaceIds } }
                ]
            });
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Staff not found.');

            if (space_id !== undefined) {
                if (space_id) {
                    const space = await Space.findOne({ _id: space_id, user_id: ownerId });
                    if (!space) {
                        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Unauthorized: You do not own this space');
                    }
                }
                user.space_id = space_id || null;
            }

            user.name = name || user.name;
            user.email = email || user.email;

            await user.save();

            // Fetch the updated user with populated space_id
            const updatedUser = await User.findById(id)
                .select('name email isActive role space_id createdAt')
                .populate('space_id', 'name');

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: space_id !== user.space_id ? 'Staff transferred to new branch' : 'Staff profile updated',
                data: updatedUser
            });
        } catch (error) {
            next(error);
        }
    };

    // DELETE /api/v1/space/staff/:id
    destroy = async (req, res, next) => {
        try {
            const ownerId = this.getUserId(req);
            const { id } = req.params;

            const { Space } = require('@/api/v1/models');
            const ownerSpaces = await Space.find({ user_id: ownerId }).select('_id');
            const ownerSpaceIds = ownerSpaces.map(s => s._id);

            const user = await User.findOneAndDelete({
                _id: id,
                role: 'staff',
                $or: [
                    { parent_id: ownerId },
                    { space_id: { $in: ownerSpaceIds } }
                ]
            });
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Staff member not found.');

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Staff member permanently removed.'
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new StaffController();