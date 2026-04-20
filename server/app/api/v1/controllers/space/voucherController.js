const { Voucher, Space, User } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');

class VoucherController {
    getOwnerId = async (req) => {
        const userId = req.user?.sub || req.user?._id || req.user?.id;

        if (req.user?.role === 'staff') {
            const staffRecord = await User.findById(userId).select('parent_id');
            return staffRecord?.parent_id || userId;
        }
        return userId;
    };

    index = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const { page = 1, limit = 10, search = '' } = req.query;

            // Get spaces owned by this user
            const userSpaces = await Space.find({ user_id: ownerId }).select('_id');
            const spaceIds = userSpaces.map(s => s._id);

            // Only show vouchers for THEIR spaces (space_specific type)
            let query = {
                space_id: { $in: spaceIds },
                type: 'space_specific'  // Changed from 'global' to 'space_specific'
            };
            if (search) {
                query.code = { $regex: search, $options: 'i' };
            }

            const vouchers = await Voucher.find(query)
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Voucher.countDocuments(query);

            // Stats
            const now = new Date();
            const stats = {
                total: await Voucher.countDocuments({ space_id: { $in: spaceIds }, type: 'space_specific' }),
                used: await Voucher.countDocuments({
                    space_id: { $in: spaceIds },
                    type: 'space_specific',
                    redemption_limit: { $ne: null },
                    $expr: { $gte: ["$redemption_count", "$redemption_limit"] }
                }),
                active: await Voucher.countDocuments({
                    space_id: { $in: spaceIds },
                    type: 'space_specific',
                    expiry_date: { $gt: now },
                    $or: [
                        { redemption_limit: null },
                        { $expr: { $lt: ["$redemption_count", "$redemption_limit"] } }
                    ]
                }),
                expired: await Voucher.countDocuments({
                    space_id: { $in: spaceIds },
                    type: 'space_specific',
                    expiry_date: { $lt: now }
                })
            };

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: { vouchers, total, stats }
            });
        } catch (error) {
            next(error);
        }
    };

    create = async (req, res, next) => {
        try {
            const ownerId = await this.getOwnerId(req);
            const { code, discount_amount, expiry_days, usage_limit, min_spend, redemption_limit, max_uses_per_user } = req.body;

            // Check if code already exists
            const existingVoucher = await Voucher.findOne({ code: code.toUpperCase() });
            if (existingVoucher) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Voucher code already exists');
            }

            // Get the space owned by this user
            const userSpace = await Space.findOne({ user_id: ownerId });
            if (!userSpace) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'No space found for this user');
            }

            const voucher = await Voucher.create({
                code: code.toUpperCase(),
                discount_amount,
                space_id: userSpace._id,
                type: 'space_specific',  // ← CHANGE THIS from 'global' to 'space_specific'
                is_used: false,
                usage_limit: usage_limit || null,
                usage_count: 0,
                redemption_limit: redemption_limit || null,
                redemption_count: 0,
                redeemed_by: [],
                max_uses_per_user: max_uses_per_user || 1,
                min_spend: min_spend || 0,
                expiry_date: new Date(Date.now() + (expiry_days || 30) * 24 * 60 * 60 * 1000)
            });

            return res.status(HTTP_STATUS.CREATED).json({
                success: true,
                data: voucher,
                message: 'Voucher created successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    delete = async (req, res, next) => {
        try {
            const { id } = req.params;
            const ownerId = await this.getOwnerId(req);

            const voucher = await Voucher.findById(id).populate('space_id');

            if (!voucher || String(voucher.space_id.user_id) !== String(ownerId)) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Unauthorized access.');
            }

            await Voucher.findByIdAndDelete(id);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Voucher deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new VoucherController();