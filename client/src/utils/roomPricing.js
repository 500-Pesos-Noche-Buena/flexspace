export const roomHourlyRate = (room, count = 1) => {
    if (!room?.hourly_rates?.length) return Number(room?.rate_hour || 0);
    const tier = room.hourly_rates.find(r => Number(count) >= r.min_pax && Number(count) <= r.max_pax);
    return tier ? Number(tier.rate_hour) : null;
};
export const roomRateLabel = room => room?.hourly_rates?.length
    ? room.hourly_rates.map(r => `${r.min_pax}–${r.max_pax} pax: ₱${r.rate_hour}/hour`).join(' · ')
    : `₱${room?.rate_hour || 0}/hour`;
export const roomPackagePrice = (room, audience) => !room?.has_consumable_promo ? null : room.consumable_packages?.length
    ? room.consumable_packages.find(p => p.audience === audience)?.price ?? null
    : room.promo_price ?? room.consumable_allowance;
export const roomPackageLabel = room => room?.consumable_packages?.length
    ? room.consumable_packages.map(p => `${p.audience}: ₱${p.price}`).join(' · ')
    : `₱${room?.promo_price ?? room?.consumable_allowance ?? 0}`;

export const roomPackageDeduction = (room, audience, count = 1) => {
    const selected = room?.consumable_packages?.find(p => p.audience === audience);
    return selected?.room_portion ?? room?.promo_room_portion ?? roomHourlyRate(room, count) ?? 0;
};
export const roomPackageCredit = (room, audience, count = 1) => {
    const price = roomPackagePrice(room, audience);
    return price == null ? null : Number((Number(price) - Number(roomPackageDeduction(room, audience, count))).toFixed(2));
};
