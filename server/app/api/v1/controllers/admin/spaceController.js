const { User, SpaceRequest, Space } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');
const emailService = require('@/api/v1/services/emailService');

class SpaceController {

    index = async (req, res, next) => {
        try {
            const { page = 1, search = '' } = req.query;
            const limit = 10;
            const skip = (page - 1) * limit;

            const query = {
                ...(search && {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { area: { $regex: search, $options: 'i' } }
                    ]
                })
            };

            const [spaces, total, activeCount, inactiveCount] = await Promise.all([
                Space.find(query)
                    .populate('user_id', 'name email')
                    .populate('district_id', 'name')
                    .sort({ created_at: -1 })
                    .skip(skip)
                    .limit(limit),

                Space.countDocuments(query),
                Space.countDocuments({ status: "Open Now" }),
                Space.countDocuments({ status: { $ne: "Open Now" } }) 
            ]);

            return res.status(200).json({
                success: true,
                data: spaces, 
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

    /**
     * GET /admin/space/requests
     * Fetches pending/rejected application requests
     */
  requests = async (req, res, next) => {
    try {
        const { page = 1, search = '', status = 'pending' } = req.query;
        const targetStatus = ['pending', 'rejected'].includes(status) ? status : 'pending';
        
        const limit = 10;
        const skip = (page - 1) * limit;

        const query = {
            status: targetStatus,
            ...(search && {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            })
        };

        const [requests, total, pendingCount, rejectedCount] = await Promise.all([
            SpaceRequest.find(query)
                .sort({ created_at: targetStatus === 'pending' ? 1 : -1 })
                .skip(skip)
                .limit(limit),

            SpaceRequest.countDocuments(query),
            SpaceRequest.countDocuments({ status: 'pending' }),
            SpaceRequest.countDocuments({ status: 'rejected' })
        ]);

        // Transform the response to include user_id as the _id
        const transformedRequests = requests.map(req => {
            const reqObj = req.toObject();
            reqObj.user_id = reqObj._id; // Add user_id field with the same value as _id
            return reqObj;
        });

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            requests: transformedRequests,
            total,
            stats: {
                pending: pendingCount,
                rejected: rejectedCount
            }
        });
    } catch (error) {
        next(error);
    }
};

   approve = async (req, res, next) => {
    try {
        const { id } = req.params;
        const request = await SpaceRequest.findById(id);
        if (!request) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application request not found.');

        // Check if user already exists
        let newUser = await User.findOne({ email: request.email });
        
        if (newUser) {
            // If user exists (created during registration), update their role and status
            // IMPORTANT: Preserve the space_request_id if it exists
            newUser.role = 'space';
            newUser.status = 'approved';
            newUser.isActive = true;
            newUser.business_permit = request.business_permit;
            newUser.dti_sec_reg = request.dti_sec_reg;
            // Keep the existing space_request_id or set it if null
            if (!newUser.space_request_id) {
                newUser.space_request_id = request._id;
            }
            await newUser.save();
            console.log(`✅ Updated existing user: ${newUser._id} with space_request_id: ${newUser.space_request_id}`);
        } else {
            // Create new user if doesn't exist (fallback)
            newUser = await User.create({
                name: request.name,
                email: request.email,
                password: request.password,
                role: 'space',
                status: 'approved',
                isActive: true,
                space_request_id: request._id, // CRITICAL: Link to space request
                business_permit: request.business_permit,
                dti_sec_reg: request.dti_sec_reg
            });
            console.log(`✅ Created new user: ${newUser._id} with space_request_id: ${newUser.space_request_id}`);
        }

        // Send Approval Email
        try {
            const loginUrl = 'https://flexspace-iloilo.vercel.app/auth/login';
            const approvalDetails = {
                name: request.name,
                email: request.email,
                loginUrl: loginUrl
            };
            
            await emailService.sendSpaceApprovalEmail(request.email, request.name, approvalDetails);
            console.log(`✅ Approval email sent to ${request.email}`);
        } catch (emailError) {
            console.error('❌ Failed to send approval email:', emailError.message);
        }

        // Delete the space request after approval
        await SpaceRequest.findByIdAndDelete(id);

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: `Account for ${newUser.name} approved successfully!`
        });
    } catch (error) {
        console.error('Approval error:', error);
        next(error);
    }
};

    reject = async (req, res, next) => {
        try {
            const { id } = req.params;
            const request = await SpaceRequest.findById(id);
            if (!request) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application request not found.');

            request.status = 'rejected';
            await request.save();

            // Send Rejection Email
            try {
                await emailService.sendSpaceRejectionEmail(request.email, request.name);
                console.log(`✅ Rejection email sent to ${request.email}`);
            } catch (emailError) {
                console.error('❌ Failed to send rejection email:', emailError.message);
            }

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: `Application for ${request.name} has been rejected.`
            });
        } catch (error) {
            console.error('Rejection error:', error);
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
                message: `Hub owner ${user.isActive ? 'activated' : 'deactivated'}.`
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