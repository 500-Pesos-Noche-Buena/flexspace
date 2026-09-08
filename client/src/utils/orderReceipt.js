const money = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
export function settledBookingOrder(booking) {
    if (!booking?._id || booking.payment_status !== 'paid') throw new Error('Checkout did not return a paid booking.');
    return { ...booking, order_type: 'booking', order_number: booking.ticket_number,
        amount_received: booking.payment?.amount_received, change: booking.payment?.change,
        customer_name: booking.guest_name || booking.user_id?.name || 'Guest',
        total: money(booking.total_amount), subtotal: money(Number(booking.total_amount || 0) + Number(booking.voucher_discount || 0)),
        discount_amount: money(booking.voucher_discount), linked_orders: booking.billing_orders || [], items: [] };
}
export function settledOrderGroup(orders) {
    if (!orders.length) throw new Error('No saved orders available for receipt.');
    const total = money(orders.reduce((sum, order) => sum + Number(order.total || 0), 0));
    const paid = orders.every(order => order.payment_status === 'paid');
    return { _id: orders.map(order => order._id).join('-'), customer_name: orders[0].customer_name,
        order_number: orders.map(order => order.order_number).join(', '), grouped_orders: orders, is_grouped: true,
        order_type: 'combined', order_count: orders.length,
        linked_order_count: orders.reduce((sum, order) => sum + (order.linked_orders?.length || 0), 0),
        amount_received: money(orders.reduce((sum, order) => sum + Number(order.amount_received ?? order.total ?? 0), 0)),
        change: money(orders.reduce((sum, order) => sum + Number(order.change || 0), 0)),
        total, subtotal: money(orders.reduce((sum, order) => sum + Number(order.subtotal ?? order.total ?? 0), 0)),
        discount_amount: money(orders.reduce((sum, order) => sum + Number(order.discount_amount || 0), 0)),
        amount_paid: money(orders.reduce((sum, order) => sum + Number(order.amount_paid ?? (order.payment_status === 'paid' ? order.total : 0)), 0)),
        payment_method: [...new Set(orders.map(order => order.payment_method).filter(Boolean))].join(', '),
        payment_status: paid ? 'paid' : 'partial', status: paid ? 'completed' : 'pending_payment',
        created_at: orders[0].updated_at || orders[0].updatedAt || orders[0].created_at,
        items: orders.flatMap(order => order.items || []) };
}
