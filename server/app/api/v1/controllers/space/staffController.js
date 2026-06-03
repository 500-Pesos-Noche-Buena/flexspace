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

        const query = {
            role: 'staff',
            parent_id: ownerId,
            ...(search && {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            })
        };

        const [staff, total, activeCount, inactiveCount] = await Promise.all([
            User.find(query)
                .select('name email isActive role space_id createdAt')
                .populate('space_id', 'name')  // ← ADD THIS LINE to get space name
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

 // POST /api/v1/space/staff - Update this method
store = async (req, res, next) => {
    try {
        const ownerId = this.getUserId(req);
        const { name, email, password, space_id } = req.body;

        console.log('Creating staff with data:', { name, email, space_id }); // Debug log

        // 1. Basic Validation
        if (!name || !email) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Name and Email are required.');
        }

        // 2. Use Service to check if email is taken
        if (await userService.isEmailTaken(email)) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Email is already registered.');
        }

        // 3. Create staff with space_id
        const newStaff = await userService.createStaff({
            name,
            email,
            password: password || 'FlexSpace2026',
            parent_id: ownerId,
            space_id: space_id || null
        });

        console.log('Staff created with space_id:', newStaff.space_id); // Debug log

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

            const user = await User.findOne({ _id: id, parent_id: ownerId });
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
            const { name, email, space_id } = req.body;

            const user = await User.findOne({ _id: id, parent_id: ownerId, role: 'staff' });
            if (!user) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Staff not found.');

            user.name = name || user.name;
            user.email = email || user.email;
            if (space_id !== undefined) user.space_id = space_id;

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

            const user = await User.findOneAndDelete({ _id: id, parent_id: ownerId });
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