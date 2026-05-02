// api/v1/controllers/admin/voucherController.js
const { Voucher } = require('@/api/v1/models');
const ApiError = require('@/api/v1/utils/ApiError');
const { HTTP_STATUS } = require('@/api/v1/utils/constants');

class AdminVoucherController {
    index = async (req, res, next) => {
        try {
            const { page = 1, limit = 10, search = '' } = req.query;

            let query = { 
                type: 'global',
                space_id: null 
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
                total: await Voucher.countDocuments({ type: 'global', space_id: null }),
                    used: await Voucher.countDocuments({ 
                    type: 'global',
                    space_id: null,
                    redemption_limit: { $ne: null },
                    $expr: { $gte: ["$redemption_count", "$redemption_limit"] }
                }),
                active: await Voucher.countDocuments({ 
                    type: 'global',
                    space_id: null,
                    expiry_date: { $gt: now },
                    $or: [
                        { redemption_limit: null },
                        { $expr: { $lt: ["$redemption_count", "$redemption_limit"] } }
                    ]
                }),
                expired: await Voucher.countDocuments({ 
                    type: 'global',
                    space_id: null,
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
            const { code, discount_amount, expiry_days, redemption_limit, min_spend, max_uses_per_user } = req.body;

            const existingVoucher = await Voucher.findOne({ code: code.toUpperCase() });
            if (existingVoucher) {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Voucher code already exists');
            }

            const voucher = await Voucher.create({
                code: code.toUpperCase(),
                discount_amount,
                space_id: null,
                type: 'global',
                user_id: null,
                is_used: false,
                usage_limit: null,
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
                message: 'Global voucher created successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    delete = async (req, res, next) => {
        try {
            const { id } = req.params;
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

module.exports = new AdminVoucherController();