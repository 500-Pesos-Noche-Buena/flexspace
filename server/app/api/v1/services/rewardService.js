const { User, Voucher } = require('@/api/v1/models');

class RewardService {
    POINT_RATIO = 20; // 1 point for every ₱20 spent
    REDEMPTION_RATIO = 1; // 1 point = ₱1 discount
    MIN_POINTS_TO_REDEEM = 50; // Minimum 50 points to exchange

    awardPoints = async (userId, amount) => {
        try {
            if (!userId || amount <= 0) return null;
            const pointsToEarn = Math.floor(amount / this.POINT_RATIO);

            if (pointsToEarn > 0) {
                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { $inc: { points: pointsToEarn } },
                    { new: true }
                );
                return { earned: pointsToEarn, balance: updatedUser.points };
            }
            return { earned: 0 };
        } catch (error) {
            console.error("RewardService Error (Award):", error.message);
            throw error;
        }
    };

    exchangePointsForVoucher = async (userId, pointsToUse, originalVoucherId) => {
        try {
            const user = await User.findById(userId);
            if (!user || user.points < pointsToUse) {
                throw new Error("Insufficient points balance.");
            }

            if (pointsToUse < this.MIN_POINTS_TO_REDEEM) {
                throw new Error(`Minimum ${this.MIN_POINTS_TO_REDEEM} points required to exchange.`);
            }

            // Find the original voucher template
            const originalVoucher = await Voucher.findById(originalVoucherId);
            if (!originalVoucher) {
                throw new Error("Voucher template not found.");
            }

            // Check if redemption limit is reached
            if (originalVoucher.redemption_limit &&
                originalVoucher.redemption_count >= originalVoucher.redemption_limit) {
                throw new Error("This voucher has reached its redemption limit.");
            }

            // Create a USER-SPECIFIC voucher (copy of the template)
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

            // Deduct points
            user.points -= pointsToUse;
            await user.save();

            return {
                success: true,
                voucher: {
                    code: userVoucher.code,
                    discount: userVoucher.discount_amount,
                    points_used: pointsToUse,
                    remaining_uses: userVoucher.max_uses_per_user,
                    expires: userVoucher.expiry_date
                },
                remainingPoints: user.points
            };
        } catch (error) {
            throw error;
        }
    };

    getUserPoints = async (userId) => {
        const user = await User.findById(userId).select('points');
        return user?.points || 0;
    };

    validateVoucher = async (code, currentUserId) => {
        try {
            const voucher = await Voucher.findOne({ code: code.toUpperCase() });

            if (!voucher) throw new Error("Voucher not found.");
            if (voucher.expiry_date < new Date()) throw new Error("Voucher has expired.");

            // For user-specific vouchers, check ownership
            if (voucher.type === 'user_specific') {
                if (voucher.user_id.toString() !== currentUserId.toString()) {
                    throw new Error("This voucher does not belong to you.");
                }
                // Check if user has reached their usage limit
                if (voucher.usage_count >= voucher.max_uses_per_user) {
                    throw new Error("You have reached the usage limit for this voucher.");
                }
            }

            return {
                success: true,
                discount_amount: voucher.discount_amount,
                voucher_code: voucher.code,
                min_spend: voucher.min_spend || 0,
                voucher_type: voucher.type
            };
        } catch (error) {
            console.error("Voucher Validation Error:", error.message);
            throw error;
        }
    };

    validateAndUseVoucher = async (code, currentUserId) => {
        try {
            const voucher = await Voucher.findOne({ code: code.toUpperCase() });

            if (!voucher) throw new Error("Voucher not found.");
            if (voucher.expiry_date < new Date()) throw new Error("Voucher has expired.");

            // For user-specific vouchers
            if (voucher.type === 'user_specific') {
                if (voucher.user_id.toString() !== currentUserId.toString()) {
                    throw new Error("This voucher does not belong to you.");
                }
                if (voucher.usage_count >= voucher.max_uses_per_user) {
                    throw new Error("You have reached the usage limit for this voucher.");
                }

                // Increment usage count
                voucher.usage_count += 1;

                // If max uses reached, mark as used
                if (voucher.usage_count >= voucher.max_uses_per_user) {
                    voucher.used_by = currentUserId;
                    voucher.used_at = new Date();
                }
                await voucher.save();

                return {
                    success: true,
                    discount_amount: voucher.discount_amount,
                    min_spend: voucher.min_spend || 0,
                    remaining_uses: voucher.max_uses_per_user - voucher.usage_count
                };
            }

            // For global/space vouchers (no user attached)
            return {
                success: true,
                discount_amount: voucher.discount_amount,
                min_spend: voucher.min_spend || 0
            };
        } catch (error) {
            console.error("Voucher Validation Error:", error.message);
            throw error;
        }
    };
}

module.exports = new RewardService();