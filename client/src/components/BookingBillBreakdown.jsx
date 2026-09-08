import React from 'react';
const money = value => `₱${Number(value || 0).toFixed(2)}`;

export default function BookingBillBreakdown({ booking, showItems = false }) {
    if (!booking) return null;
    const orders = booking.billing_orders || booking.orders || [];
    return (
        <div className="p-4 space-y-2 text-xs text-left border-b border-border">
            {booking.room_id?.name && <p className="font-semibold">{booking.room_id.name}</p>}
            {booking.guest_count && <p>{booking.guest_count} guest(s) · ₱{Number(booking.rate_per_hour || 0).toFixed(2)}/hour for regular time or overtime</p>}
            {booking.promo_snapshot?.promo_name && <p>{booking.promo_snapshot.promo_name} · {booking.promo_snapshot.promo_duration_hours} hours</p>}
            {booking.promo_snapshot?.room_portion != null && <div className="flex justify-between"><span>Room portion already included in package</span><span>{money(booking.promo_snapshot.room_portion)}</span></div>}
            <div className="flex justify-between"><span>{booking.promo_snapshot?.promo_price != null ? 'Package + overtime' : 'Room / session charge'}</span><span>{money(booking.room_charge)}</span></div>
            {showItems && orders.map(order => (
                <div key={order._id} className="space-y-1 py-1">
                    <p className="opacity-70">{order.order_number}</p>
                    {order.items.map((item, index) => <div className="flex justify-between gap-3" key={item._id || index}>
                        <span>{item.quantity} × {item.name}</span><span>{money(item.price * item.quantity)}</span>
                    </div>)}
                    {order.discount_amount > 0 && <div className="flex justify-between"><span>Order discount</span><span>−{money(order.discount_amount)}</span></div>}
                    {order.tax > 0 && <div className="flex justify-between"><span>Order tax</span><span>{money(order.tax)}</span></div>}
                </div>
            ))}
            <div className="flex justify-between"><span>Consumables subtotal</span><span>{money(booking.consumable_total)}</span></div>
            <div className="flex justify-between"><span>Included allowance</span><span>{money(booking.consumable_allowance)}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Allowance applied</span><span>−{money(booking.consumable_covered)}</span></div>
            <div className="flex justify-between font-semibold"><span>Excess consumables</span><span>{money(booking.consumable_excess)}</span></div>
            {booking.other_charges > 0 && <div className="flex justify-between"><span>Other charges</span><span>{money(booking.other_charges)}</span></div>}
            {booking.voucher_discount > 0 && <div className="flex justify-between"><span>Voucher ({booking.voucher_applied})</span><span>−{money(booking.voucher_discount)}</span></div>}
            {booking.amount_paid > 0 && booking.status !== 'completed' && <div className="flex justify-between"><span>Already paid</span><span>−{money(booking.amount_paid)}</span></div>}
            {booking.payment && <>
                <div className="flex justify-between"><span>Payment reference</span><span>{booking.payment.reference_number}</span></div>
                <div className="flex justify-between"><span>Received</span><span>{money(booking.payment.amount_received)}</span></div>
                <div className="flex justify-between"><span>Change</span><span>{money(booking.payment.change)}</span></div>
            </>}
        </div>
    );
}
