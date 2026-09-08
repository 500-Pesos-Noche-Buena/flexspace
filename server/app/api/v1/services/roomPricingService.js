const ApiError = require('../utils/ApiError');
exports.selectRate = (room, guestCount = 1) => {
    const count = Number(guestCount);
    if (!Number.isSafeInteger(count) || count < 1 || count > Number(room.capacity)) throw new ApiError(400, 'Guest count must be within the room capacity.');
    const tiers = room.hourly_rates || [];
    const tier = tiers.find(rate => count >= rate.min_pax && count <= rate.max_pax);
    if (tiers.length && !tier) throw new ApiError(400, 'No hourly rate is configured for this guest count.');
    const rate = Number(tier ? tier.rate_hour : room.rate_hour);
    if (!Number.isFinite(rate) || rate < 0) throw new ApiError(400, 'Invalid room hourly rate.');
    return { guest_count: count, rate_per_hour: rate };
};
