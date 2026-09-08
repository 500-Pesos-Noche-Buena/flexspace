// Display estimate only. Checkout always uses the server's frozen bill.
export function estimateBookingTotal(booking, now = Date.now()) {
    if (['pending_payment', 'completed'].includes(booking?.status)) return Number(booking.total_amount || 0);
    const fixed = booking?.booking_type === 'walkin' && !booking.is_open_time;
    const start = new Date(fixed ? booking.start_time : booking?.check_in_at).getTime();
    const end = fixed ? new Date(booking.end_time).getTime() : Number(now);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
    const minutes = Math.max(0, Math.ceil((end - start) / 60000));
    const rate = Number(booking.rate_per_hour ?? booking.room_id?.rate_hour ?? booking.space_id?.rate_hour ?? 0);
    const hours = minutes => Math.floor(minutes / 60) + (minutes % 60 > 30 ? 1 : (minutes % 60) / 60);
    const promo = booking.promo_snapshot;
    const room = promo?.promo_price != null && promo.promo_duration_hours > 0
        ? Number(promo.promo_price) + hours(Math.max(0, minutes - promo.promo_duration_hours * 60)) * rate
        : hours(minutes) * rate;
    return Math.max(0, Number((room + Number(booking.consumable_excess || 0) + Number(booking.other_charges || 0) - Number(booking.voucher_discount || 0)).toFixed(2)));
}
