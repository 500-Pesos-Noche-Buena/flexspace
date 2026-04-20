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
            
            // Get vouchers that users can REDEEM (exchange points for)
            const vouchers = await Voucher.find({
                type: 'global',
                expiry_date: { $gt: new Date() },
                $or: [
                    { redemption_limit: null },
                    { $expr: { $lt: ["$redemption_count", "$redemption_limit"] } }
                ]
            }).sort({ discount_amount: 1 });
            
            const formattedVouchers = vouchers.map(v => {
                const pointsRequired = v.discount_amount;
                const remainingRedemptions = v.redemption_limit 
                    ? v.redemption_limit - (v.redemption_count || 0) 
                    : 'Unlimited';
                
                return {
                    _id: v._id,
                    discount_amount: v.discount_amount,
                    points_required: pointsRequired,
                    min_spend: v.min_spend || 0,
                    expiry_date: v.expiry_date,
                    remaining_redemptions: remainingRedemptions,
                    can_afford: userPoints >= pointsRequired,
                    max_uses_per_user: v.max_uses_per_user || 1
                };
            });
            
            // Get user's redeemed vouchers (their personal copies)
            const userVouchers = await Voucher.find({
                user_id: userId,
                type: 'user_specific',
                expiry_date: { $gt: new Date() }
            }).sort({ createdAt: -1 });
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    vouchers: formattedVouchers,
                    user_points: userPoints,
                    my_vouchers: userVouchers.map(v => ({
                        _id: v._id,
                        code: v.code,
                        discount_amount: v.discount_amount,
                        remaining_uses: v.max_uses_per_user - (v.usage_count || 0),
                        expires: v.expiry_date,
                        min_spend: v.min_spend
                    })),
                    stats: {
                        total_earned: userPoints,
                        total_redeemed: userVouchers.length,
                        available_points: userPoints,
                        min_points_to_redeem: rewardService.MIN_POINTS_TO_REDEEM
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
            
            const originalVoucher = await Voucher.findById(voucher_id);
            
            if (!originalVoucher) {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Voucher not found');
            }
            
            if (new Date(originalVoucher.expiry_date) < new Date()) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'This voucher has expired');
            }
            
            if (originalVoucher.redemption_limit && 
                originalVoucher.redemption_count >= originalVoucher.redemption_limit) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'This voucher has reached its redemption limit');
            }
            
            const pointsRequired = originalVoucher.discount_amount;
            
            const userPoints = await rewardService.getUserPoints(userId);
            if (userPoints < pointsRequired) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Insufficient points. Need ${pointsRequired} points. You have ${userPoints} points.`);
            }
            
            // Create user-specific voucher copy with unique code
            const randomPart = () => Math.random().toString(36).toUpperCase().substring(2, 6);
            const userVoucherCode = `${originalVoucher.code}-${randomPart()}`;
            
            const userVoucher = await Voucher.create({
                code: userVoucherCode,
                discount_amount: originalVoucher.discount_amount,
                space_id: originalVoucher.space_id,
                type: 'user_specific',
                user_id: userId,
                min_spend: originalVoucher.min_spend || 0,
                max_uses_per_user: originalVoucher.max_uses_per_user || 1,
                usage_count: 0,
                expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            
            // Update original voucher redemption count
            originalVoucher.redemption_count = (originalVoucher.redemption_count || 0) + 1;
            originalVoucher.redeemed_by = originalVoucher.redeemed_by || [];
            originalVoucher.redeemed_by.push(userId);
            await originalVoucher.save();
            
            // Deduct points from user
            const user = await User.findById(userId);
            user.points -= pointsRequired;
            await user.save();
            
            return res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Voucher redeemed successfully!',
                data: {
                    voucher: {
                        code: userVoucher.code,
                        discount: userVoucher.discount_amount,
                        remaining_uses: userVoucher.max_uses_per_user,
                        expires: userVoucher.expiry_date
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