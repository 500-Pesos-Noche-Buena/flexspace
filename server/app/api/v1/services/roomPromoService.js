const ApiError = require('../utils/ApiError');
const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
// Snapshot prices at booking creation; changing room rates never rewrites paid bills.
exports.snapshot = (room, usePromo = true, audience, guestCount = 1) => {
    if (!usePromo || !room?.has_consumable_promo) return { consumable_allowance: 0, promo_snapshot: null };
    const packages = room.consumable_packages || [];
    let price;
    let roomPortion = room.promo_room_portion;
    if (packages.length) {
        const selected = packages.find(p => p.audience === audience);
        if (!selected) throw new ApiError(400, 'Select a student or professional consumable package.');
        price = Number(selected.price);
        roomPortion = selected.room_portion ?? roomPortion;
    } else {
        price = Number(room.promo_price ?? room.consumable_allowance);
    }
    if (!Number.isFinite(price) || price <= 0 || !(room.promo_duration_hours > 0)) {
        throw new ApiError(400, 'The package needs a positive price and included hours.');
    }
    if (roomPortion == null) {
        const tier = room.hourly_rates?.find(r => Number(guestCount) >= r.min_pax && Number(guestCount) <= r.max_pax);
        if (room.hourly_rates?.length && !tier) throw new ApiError(400, 'No room rate for the selected guest count.');
        roomPortion = tier?.rate_hour ?? room.rate_hour ?? 0;
    }
    roomPortion = money(roomPortion);
    if (!Number.isFinite(roomPortion) || roomPortion < 0 || roomPortion >= price) throw new ApiError(400, 'The room portion must be nonnegative and smaller than the package price.');
    const allowance = money(price - roomPortion);
    return { consumable_allowance: allowance, promo_snapshot: {
        promo_name: room.promo_name, promo_duration_hours: room.promo_duration_hours,
        promo_price: money(price), room_portion: roomPortion, audience: packages.length ? audience : null,
        consumable_allowance: allowance
    } };
};
