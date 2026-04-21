const { Voucher, User, Booking } = require('@/api/v1/models');
const ApiError = require('@/utils/ApiError');
const { HTTP_STATUS } = require('@/utils/constants');
const rewardService = require('@/api/v1/services/rewardService');

class RedeemController {
    getUserId = (req) => req.user?.sub || req.user?._id || req.user?.id;

index = async (req, res, next) => {
    try {
        const userId = this.getUserId(req);
        
        const userPoints = await rewardService.getUserPoints(userId);
        
        // Get available vouchers for redemption (global and space_specific)
        const availableVouchers = await Voucher.find({
            $or: [
                { type: 'global' },
                { type: 'space_specific' }
            ],
            expiry_date: { $gt: new Date() },
            $expr: {
                $or: [
                    { $eq: ["$redemption_limit", null] },
                    { $eq: ["$redemption_limit", 0] },
                    { $lt: [{ $ifNull: ["$redemption_count", 0] }, "$redemption_limit"] }
                ]
            }
        }).sort({ discount_amount: 1 });
        
        // FIXED: Get user's redeemed vouchers - DON'T filter by status
        // Just get ALL user-specific vouchers that are not expired
        const userVouchers = await Voucher.find({
            user_id: userId,
            type: 'user_specific',
            expiry_date: { $gt: new Date() }
        }).sort({ createdAt: -1 });
        
        console.log(`Found ${userVouchers.length} user-specific vouchers for user ${userId}`);
        
        // Log each voucher for debugging
        userVouchers.forEach(v => {
            console.log(`- Voucher: ${v.code}, Discount: ₱${v.discount_amount}, Expires: ${v.expiry_date}`);
        });
        
        // Also get space_specific vouchers that belong to this user (if any)
        const userSpaceVouchers = await Voucher.find({
            user_id: userId,
            type: 'space_specific',
            expiry_date: { $gt: new Date() }
        }).sort({ createdAt: -1 });
        
        // Combine all user vouchers
        const allUserVouchers = [...userVouchers, ...userSpaceVouchers];
        
        console.log(`Total user vouchers to display: ${allUserVouchers.length}`);
        
        const formattedVouchers = availableVouchers.map(v => {
            const pointsRequired = v.discount_amount;
            
            // Check if user can afford this voucher
            const canAfford = userPoints >= pointsRequired;
            
            // Check if user has already redeemed this voucher
            let userRedemptionCount = 0;
            if (v.redeemed_by && Array.isArray(v.redeemed_by)) {
                userRedemptionCount = v.redeemed_by.filter(id => {
                    if (!id) return false;
                    return id.toString() === userId.toString();
                }).length;
            }
            
            // Check if user already OWNS this voucher (has an active user_specific copy)
            const userOwnsVoucher = allUserVouchers.some(uv => 
                uv.original_voucher_id && uv.original_voucher_id.toString() === v._id.toString()
            );
            
            const hasReachedUserLimit = v.max_uses_per_user && userRedemptionCount >= v.max_uses_per_user;
            
            // Check if global limit is reached
            const globalLimitReached = v.redemption_limit > 0 && (v.redemption_count || 0) >= v.redemption_limit;
            
            // Can redeem if: can afford, not reached limit, doesn't already own it, and global limit not reached
            const canRedeem = canAfford && !hasReachedUserLimit && !globalLimitReached && !userOwnsVoucher;
            
            return {
                _id: v._id,
                discount_amount: v.discount_amount,
                points_required: pointsRequired,
                min_spend: v.min_spend || 0,
                expiry_date: v.expiry_date,
                remaining_redemptions: v.redemption_limit ? (v.redemption_limit - (v.redemption_count || 0)) : 'Unlimited',
                can_afford: canRedeem,
                max_uses_per_user: v.max_uses_per_user || 1,
                redeemed_count: userRedemptionCount,
                user_owns: userOwnsVoucher
            };
        });
        
        return res.status(HTTP_STATUS.OK).json({
            success: true,
            data: {
                vouchers: formattedVouchers,
                user_points: userPoints,
                my_vouchers: allUserVouchers.map(v => ({
                    _id: v._id,
                    code: v.code,
                    discount_amount: v.discount_amount,
                    remaining_uses: (v.max_uses_per_user || 1) - (v.usage_count || 0),
                    expires: v.expiry_date,
                    min_spend: v.min_spend || 0,
                    type: v.type,
                    original_code: v.code.split('-')[0] // Extract original code
                })),
                stats: {
                    total_earned: userPoints,
                    total_redeemed: allUserVouchers.length,
                    available_points: userPoints,
                    min_points_to_redeem: rewardService.MIN_POINTS_TO_REDEEM || 50
                }
            }
        });
    } catch (error) {
        console.error('Redeem index error:', error);
        next(error);
    }
};

    redeem = async (req, res, next) => {
        try {
            const userId = this.getUserId(req);
            const { voucher_id } = req.body;

            console.log('Redeem request - userId:', userId);
            console.log('Redeem request - voucher_id:', voucher_id);

            // Find the original voucher
            const originalVoucher = await Voucher.findById(voucher_id);

            if (!originalVoucher) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Voucher not found');
            }

            console.log('Original voucher:', {
                id: originalVoucher._id,
                code: originalVoucher.code,
                discount: originalVoucher.discount_amount,
                type: originalVoucher.type
            });

            // Check expiry
            if (new Date(originalVoucher.expiry_date) < new Date()) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'This voucher has expired');
            }

            // Check redemption limit
            const redemptionLimit = originalVoucher.redemption_limit || 0;
            const redemptionCount = originalVoucher.redemption_count || 0;

            if (redemptionLimit > 0 && redemptionCount >= redemptionLimit) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'This voucher has reached its redemption limit');
            }

            // ✅ FIX 1: Check redeemed_by array on the original voucher
            // This is the primary guard against duplicates
            const alreadyInRedeemedBy = (originalVoucher.redeemed_by || []).some(
                id => id?.toString() === userId.toString()
            );

            if (alreadyInRedeemedBy) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'You already own this voucher');
            }

            // ✅ FIX 2: Double-check by querying existing user_specific vouchers
            // Guards against any edge case where redeemed_by wasn't saved properly
            const existingUserVoucher = await Voucher.findOne({
                user_id: userId,
                original_voucher_id: originalVoucher._id,
                type: 'user_specific'
            });

            if (existingUserVoucher) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'You already own this voucher');
            }

            // Calculate points required
            const pointsRequired = originalVoucher.discount_amount;

            // Check if user has enough points
            const userPoints = await rewardService.getUserPoints(userId);

            if (userPoints < pointsRequired) {
                throw new ApiError(
                    HTTP_STATUS.BAD_REQUEST,
                    `Insufficient points. Need ${pointsRequired} points. You have ${userPoints} points.`
                );
            }

            // ✅ FIX 3: Create user-specific voucher with original_voucher_id stored
            // This ensures future dedup checks via existingUserVoucher query work correctly
            const userVoucher = await Voucher.create({
                code: originalVoucher.code,
                discount_amount: originalVoucher.discount_amount,
                space_id: originalVoucher.space_id,
                type: 'user_specific',
                user_id: userId,
                original_voucher_id: originalVoucher._id, // ✅ critical for dedup
                min_spend: originalVoucher.min_spend || 0,
                max_uses_per_user: 1,
                usage_limit: 1,
                usage_count: 0,
                expiry_date: originalVoucher.expiry_date,
                status: 'active',
            });

            console.log('Created user voucher:', userVoucher.code);

            // ✅ FIX 4: Update original voucher redemption count + redeemed_by
            // redeemed_by is what prevents duplicates on the next redeem attempt
            originalVoucher.redemption_count = (originalVoucher.redemption_count || 0) + 1;
            if (!originalVoucher.redeemed_by) originalVoucher.redeemed_by = [];
            originalVoucher.redeemed_by.push(userId);
            await originalVoucher.save();

            // Deduct points from user
            const user = await User.findById(userId);
            if (!user) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
            }

            user.points = (user.points || 0) - pointsRequired;
            await user.save();

            console.log('Redemption successful! Voucher code:', userVoucher.code);

            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Voucher redeemed successfully!',
                data: {
                    voucher: {
                        code: userVoucher.code,
                        discount_amount: userVoucher.discount_amount,
                        remaining_uses: 1,
                        expires: userVoucher.expiry_date,
                        min_spend: userVoucher.min_spend
                    },
                    points_used: pointsRequired,
                    remaining_points: user.points
                }
            });
        } catch (error) {
            console.error('Redeem voucher error:', error);
            next(error);
        }
    };
}

module.exports = new RedeemController();