import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '@/utils/Api';
import {
    Calendar, Clock, User, Package, Receipt,
    CreditCard, Banknote, Loader2, Search,
    Eye, CheckCircle, XCircle,
    Clock as ClockIcon, AlertCircle, ShoppingBag,
    Users, DollarSign, List, X, Printer, ArrowLeft,
    FileText, Coffee, Wallet, TrendingUp, AlertTriangle,
    DoorOpen
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/Modal';
import { useTheme } from '@/hooks/useTheme';
import { PaymentQRModal } from '@/components/modal';
import { LiveBillingTimer, PaymentPanel } from '@/components/modal/BookingModalComponents';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return 'Invalid Date';
    }
};

const formatDateShort = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return 'Invalid Date';
    }
};

const formatCurrency = (amount) => {
    return `₱${(amount || 0).toFixed(2)}`;
};

const TotalOrders = () => {
    const { themeColor } = useTheme();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({
        total: 0,
        bookings: 0,
        pos_orders: 0,
        pay_later: 0,
        revenue: 0,
        pay_later_amount: 0
    });
    const [currentParams, setCurrentParams] = useState({ page: 1, search: '', type: 'all', status: '' });
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Order detail modal
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [showPaymentQR, setShowPaymentQR] = useState(false);
    const [paymentLink, setPaymentLink] = useState('');
    const [currentOrderId, setCurrentOrderId] = useState('');

    // Pay Later settlement modal
    const [showPayLaterModal, setShowPayLaterModal] = useState(false);
    const [payLaterAmount, setPayLaterAmount] = useState('');
    const [payLaterMethod, setPayLaterMethod] = useState('cash');

    // Close Session states
    const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [liveAmount, setLiveAmount] = useState(0);
    const [bookingToClose, setBookingToClose] = useState(null);
    const [customerAllOrders, setCustomerAllOrders] = useState([]);
    // Payment Panel states
    const [showPaymentPanel, setShowPaymentPanel] = useState(false);
    const [totalAllOrders, setTotalAllOrders] = useState(0);
    const [ordersToProcess, setOrdersToProcess] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleParamsChange = useCallback((params) => {
        setCurrentParams(prev => ({ ...prev, ...params }));
    }, []);

    const getButtonColor = () => {
        const colors = {
            indigo: 'hover:bg-indigo-600',
            emerald: 'hover:bg-emerald-600',
            purple: 'hover:bg-purple-600',
            blue: 'hover:bg-blue-600',
            rose: 'hover:bg-rose-600',
            amber: 'hover:bg-amber-600',
        };
        return colors[themeColor] || colors.indigo;
    };

    const getStatusStyles = (status) => {
        const styles = {
            pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            confirmed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            active: "bg-primary/10 text-primary border border-primary/20",
            pending_payment: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
            completed: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
            cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
            rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
            preparing: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            ready: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
            pay_later_pending: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30",
            pay_later_partial: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30",
            pay_later_settled: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
        };
        return styles[status] || "bg-muted text-muted-foreground";
    };

    const getOrderTypeColor = (order) => {
        if (order.order_type === 'booking') return 'text-emerald-600 dark:text-emerald-400';
        if (order.is_pay_later) return 'text-amber-600 dark:text-amber-400';
        return 'text-blue-600 dark:text-blue-400';
    };

    const getOrderTypeLabel = (order) => {
        if (order.order_type === 'booking') return 'Booking';
        if (order.is_pay_later) return 'Pay Later';
        return 'POS Order';
    };

    const getPaymentMethodDisplay = (method) => {
        const display = {
            cash: 'Cash',
            qr: 'GCash/QR',
            online: 'Online',
            card: 'Card',
            pay_later: 'Pay Later'
        };
        return display[method] || method;
    };

    const getPayLaterStatusLabel = (status) => {
        const labels = {
            pending: 'Pending',
            partially_paid: 'Partially Paid',
            settled: 'Settled ✓'
        };
        return labels[status] || status;
    };

    // 🆕 PRINT RECEIPT FUNCTION
    const printReceipt = (order) => {
        const receiptWindow = window.open('', '_blank');
        const isGrouped = order.is_grouped || (order.grouped_orders && order.grouped_orders.length > 0);
        const isCash = order.payment_method === 'cash';
        const isPayLater = order.payment_method === 'pay_later' || order.is_pay_later;
        const changeAmount = isCash && order.amount_received ? (order.amount_received - order.total).toFixed(2) : '0.00';
        const amountReceived = order.amount_received ? order.amount_received.toFixed(2) : order.total.toFixed(2);

        const paymentMethodDisplay = {
            cash: 'CASH',
            qr: 'GCASH / QR',
            online: 'ONLINE PAYMENT',
            card: 'CARD',
            pay_later: 'PAY LATER ⏰'
        }[order.payment_method] || order.payment_method.toUpperCase();

        const orderNumber = order.order_number || `GROUP-${Date.now()}`;

        let allItems = [];
        if (isGrouped && order.grouped_orders) {
            order.grouped_orders.forEach(subOrder => {
                if (subOrder.items && subOrder.items.length > 0) {
                    subOrder.items.forEach(item => {
                        allItems.push({
                            ...item,
                            order_type: subOrder.order_type || 'pos_order',
                            order_number: subOrder.order_number || 'N/A'
                        });
                    });
                }
            });
        } else if (order.items) {
            allItems = order.items;
        }

        const groupedSummary = isGrouped && order.grouped_orders ? order.grouped_orders.map(o => ({
            type: o.order_type === 'booking' ? 'Booking' : 'POS',
            number: o.order_number || 'N/A',
            total: o.total || 0
        })) : [];

        receiptWindow.document.write(`
        <html>
        <head>
            <title>Receipt</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; width: 300px; margin: 0 auto; background: white; }
                .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                .logo { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                .items { width: 100%; margin-bottom: 10px; }
                .items th, .items td { text-align: left; padding: 4px 0; }
                .items th { border-bottom: 1px solid #ccc; }
                .total { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; }
                .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
                .payment-details { margin-top: 10px; font-size: 11px; }
                .thankyou { font-size: 12px; font-weight: bold; margin-top: 15px; }
                .pay-later-warning { background: #fef3c7; padding: 10px; border: 1px solid #f59e0b; border-radius: 8px; margin: 10px 0; }
                .pay-later-warning strong { color: #d97706; }
                .grouped-summary { background: #f0f0f0; padding: 8px; border-radius: 4px; margin: 8px 0; font-size: 10px; }
                .order-type-badge { font-size: 8px; padding: 2px 6px; border-radius: 4px; background: #e5e7eb; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">🏢 FlexSpace</div>
                <div>Coworking & Workspace</div>
                <div>${new Date().toLocaleDateString('en-PH')}</div>
                <div>${new Date().toLocaleTimeString('en-PH')}</div>
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Order #:</strong> ${orderNumber}<br>
                <strong>Customer:</strong> ${order.customer_name || 'Walk-in Customer'}
                ${isGrouped ? `<br><strong>Grouped Orders:</strong> ${order.grouped_orders?.length || 0} order(s)` : ''}
            </div>
            
            ${isPayLater ? `
                <div class="pay-later-warning">
                    <strong>⏰ PAY LATER ORDER</strong><br>
                    <span style="font-size: 9px;">This order is on credit. Please settle payment when ready.</span>
                </div>
            ` : ''}
            
            ${isGrouped && groupedSummary.length > 0 ? `
                <div class="grouped-summary">
                    <strong>Order Summary:</strong><br>
                    ${groupedSummary.map(o => `
                        <span class="order-type-badge">${o.type}</span> #${o.number} - ₱${o.total.toFixed(2)}<br>
                    `).join('')}
                </div>
            ` : ''}
            
            <table class="items">
                <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                    ${allItems.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>₱${item.price.toFixed(2)}</td>
                            <td>₱${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="total">
                <div><strong>Subtotal:</strong> ₱${order.subtotal.toFixed(2)}</div>
                ${order.discount_amount > 0 ? `<div><strong>Discount:</strong> -₱${order.discount_amount.toFixed(2)}</div>` : ''}
                <div style="font-size: 14px; margin-top: 5px;"><strong>TOTAL:</strong> ₱${order.total.toFixed(2)}</div>
                ${isPayLater ? `
                    <div style="margin-top: 5px; color: #d97706;">
                        <strong>Status:</strong> PENDING PAYMENT ⏰
                    </div>
                ` : ''}
            </div>
            <div class="payment-details">
                <div><strong>Payment Method:</strong> ${paymentMethodDisplay}</div>
                ${isCash ? `<div><strong>Amount Received:</strong> ₱${amountReceived}</div>` : ''}
                ${isCash ? `<div><strong>Change:</strong> ₱${changeAmount}</div>` : ''}
                ${order.payment_method === 'online' ? `<div><strong>Status:</strong> PAID ✓</div>` : ''}
                ${isPayLater ? `
                    <div style="color: #d97706; font-weight: bold; margin-top: 5px;">
                        ⚠️ Unpaid - Please settle when ready
                    </div>
                ` : ''}
            </div>
            <div class="footer">
                <div>Thank you for your purchase!</div>
                <div>✨ Come back again! ✨</div>
                ${isPayLater ? `
                    <div style="font-size: 8px; color: #d97706; margin-top: 5px;">
                        ⏰ This is a Pay Later order. Payment is pending.
                    </div>
                ` : ''}
                ${isGrouped ? `
                    <div style="font-size: 8px; color: #6b7280; margin-top: 5px;">
                        📋 Grouped order with ${order.grouped_orders?.length || 0} sub-orders
                    </div>
                ` : ''}
            </div>
            <div class="thankyou">Have a productive day! 💪</div>
        </body>
        </html>
    `);
        receiptWindow.document.close();
        receiptWindow.print();
    };

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', currentParams.page);
            params.append('limit', 20);
            if (searchTerm) params.append('search', searchTerm);
            if (filterType !== 'all') params.append('type', filterType);
            if (filterStatus) params.append('status', filterStatus);

            const res = await apiGet(`/space/total-orders?${params.toString()}`);

            if (res.success) {
                setOrders(res.data.orders || []);
                setTotalCount(res.data.total || 0);
                setStats(res.data.stats || {
                    total: 0,
                    bookings: 0,
                    pos_orders: 0,
                    pay_later: 0,
                    revenue: 0,
                    pay_later_amount: 0
                });
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err);
            showToast({ icon: 'error', title: 'Failed to load orders' });
        } finally {
            setLoading(false);
        }
    }, [currentParams.page, searchTerm, filterType, filterStatus]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // 🆕 Check if can close session
    const canCloseSession = (row) => {
        if (row.is_grouped && row.grouped_orders) {
            return row.grouped_orders.some(o =>
                (o.order_type === 'booking' || o.order_type === 'booking_order') &&
                (o.status === 'active' || o.status === 'confirmed' || o.status === 'pending_payment')
            );
        }
        return (row.order_type === 'booking' || row.order_type === 'booking_order') &&
            (row.status === 'active' || row.status === 'confirmed' || row.status === 'pending_payment');
    };

    // 🆕 Get the booking from a row
    const getBookingFromRow = (row) => {
        if (row.is_grouped && row.grouped_orders) {
            return row.grouped_orders.find(o =>
                (o.order_type === 'booking' || o.order_type === 'booking_order') &&
                (o.status === 'active' || o.status === 'confirmed' || o.status === 'pending_payment')
            );
        }
        return row;
    };

    // 🆕 Get all orders for a customer
    const getCustomerOrders = (customerName) => {
        return orders.filter(o =>
            o.customer_name?.toLowerCase() === customerName.toLowerCase()
        );
    };

    // 🆕 Handle Close Session - Open modal with timer
    const handleCloseSession = (row) => {
        console.log('🔍 Row data for close session:', row);

        // Get the booking from the row
        const booking = getBookingFromRow(row);
        if (!booking) {
            showToast({ icon: 'warning', title: 'No booking found to close' });
            return;
        }

        console.log('🔍 Booking found for close session:', booking);

        setBookingToClose(booking);
        setLiveAmount(0);
        setShowCloseSessionModal(true);
        setIsCalculating(false);
        setShowPaymentPanel(false);
        setOrdersToProcess([]);
        setTotalAllOrders(0);
    };

    // 🆕 Calculate and show Payment Panel with ALL orders - FIXED
    const handleCalculateAndShowPayment = async () => {
        if (!bookingToClose) return;

        setIsCalculating(true);
        try {
            const customerName = bookingToClose.customer_name || bookingToClose.guest_name || 'Guest';
            const exactCustomerName = customerName.trim();

            console.log(`🔍 Searching for orders for customer: "${exactCustomerName}"`);

            // Fetch ALL orders for this customer directly from API
            const [bookingsRes, posOrdersRes] = await Promise.all([
                apiGet(`/space/bookings?search=${encodeURIComponent(exactCustomerName)}`),
                apiGet(`/space/orders?search=${encodeURIComponent(exactCustomerName)}`)
            ]);

            console.log('📊 Bookings response:', bookingsRes);
            console.log('📊 POS Orders response:', posOrdersRes);

            let allCustomerOrders = [];
            const orderIds = new Set();

            // Get all bookings for this customer - EXACT MATCH
            if (bookingsRes.success && bookingsRes.data.bookings) {
                const bookings = bookingsRes.data.bookings
                    .filter(b => {
                        const name = b.guest_name || b.user_id?.name || 'Guest';
                        return name.trim().toLowerCase() === exactCustomerName.toLowerCase();
                    })
                    .map(b => ({
                        _id: b._id,
                        order_number: b.ticket_number || b._id,
                        order_type: 'booking',
                        customer_name: b.guest_name || b.user_id?.name || 'Guest',
                        total: b.total_amount || 0,
                        status: b.status,
                        payment_method: b.payment_method || 'online',
                        is_pay_later: false,
                        pay_later_status: null,
                        pay_later_total_accumulated: 0,
                        items: b.items || []
                    }));
                bookings.forEach(b => {
                    if (!orderIds.has(b._id.toString())) {
                        orderIds.add(b._id.toString());
                        allCustomerOrders.push(b);
                    }
                });
            }

            // Get ALL POS orders for this customer - EXACT MATCH (including pay_later)
            if (posOrdersRes.success && posOrdersRes.data) {
                const posOrders = posOrdersRes.data
                    .filter(o => {
                        const name = o.customer_name || 'Guest';
                        const match = name.trim().toLowerCase() === exactCustomerName.toLowerCase();
                        console.log(`  Comparing: "${name.trim().toLowerCase()}" === "${exactCustomerName.toLowerCase()}" -> ${match}`);
                        return match;
                    })
                    .map(o => ({
                        _id: o._id,
                        order_number: o.order_number || o._id,
                        order_type: 'pos_order',
                        customer_name: o.customer_name || 'Guest',
                        total: o.total || 0,
                        status: o.status,
                        payment_method: o.payment_method || 'cash',
                        is_pay_later: o.is_pay_later || false,
                        pay_later_status: o.pay_later_status || 'pending',
                        pay_later_total_accumulated: o.pay_later_total_accumulated || 0,
                        items: o.items || [],
                        payment_status: o.payment_status || 'unpaid'
                    }));
                posOrders.forEach(o => {
                    if (!orderIds.has(o._id.toString())) {
                        orderIds.add(o._id.toString());
                        allCustomerOrders.push(o);
                    }
                });
            }

            console.log(`📊 All orders for "${exactCustomerName}":`, allCustomerOrders);

            // Build the list of orders to process
            const ordersToProcessList = [];

            // Find the booking to process
            const bookingToProcess = allCustomerOrders.find(o =>
                o.order_type === 'booking' &&
                (o.status === 'pending_payment' || o.status === 'active' || o.status === 'confirmed')
            );

            if (bookingToProcess) {
                let bookingTotal = bookingToProcess.total || 0;

                // If booking is active, calculate bill first
                if (bookingToProcess.status === 'active' || bookingToProcess.status === 'confirmed') {
                    try {
                        const calcRes = await apiPost(`/space/bookings/${bookingToProcess._id}/calculate`);
                        if (calcRes.success) {
                            bookingTotal = calcRes.data.total_amount || 0;
                            console.log(`📊 Booking calculated: ₱${bookingTotal}`);
                        }
                    } catch (e) {
                        console.error('Failed to calculate booking:', e);
                    }
                }

                ordersToProcessList.push({
                    id: bookingToProcess._id,
                    type: 'booking',
                    total: bookingTotal,
                    status: bookingToProcess.status,
                    order_number: bookingToProcess.order_number,
                    items: bookingToProcess.items || [],
                    customer_name: bookingToProcess.customer_name
                });
            }

            // Find ALL POS orders for this customer that are not paid
            const unpaidPosOrders = allCustomerOrders.filter(o =>
                o.order_type === 'pos_order' &&
                o.payment_status !== 'paid' &&
                o.payment_status !== 'completed' &&
                o.pay_later_status !== 'settled'  // ✅ FIX: Skip already settled orders
            );

            console.log('📊 Unpaid POS orders found:', unpaidPosOrders);

            unpaidPosOrders.forEach(o => {
                const exists = ordersToProcessList.some(p => p.id === o._id);
                if (!exists) {
                    ordersToProcessList.push({
                        id: o._id,
                        type: 'pay_later',
                        total: o.total || 0,
                        status: o.status,
                        order_number: o.order_number,
                        items: o.items || [],
                        customer_name: o.customer_name || exactCustomerName
                    });
                }
            });

            if (ordersToProcessList.length === 0) {
                showToast({ icon: 'info', title: 'No orders to process' });
                setShowCloseSessionModal(false);
                setIsCalculating(false);
                return;
            }

            // Calculate total
            const totalAmount = ordersToProcessList.reduce((sum, o) => sum + o.total, 0);
            console.log(`📊 Total amount: ₱${totalAmount}`);
            setTotalAllOrders(totalAmount);
            setOrdersToProcess(ordersToProcessList);
            setPaymentAmount(totalAmount.toString());
            setLiveAmount(totalAmount);

            // Show payment panel
            setShowPaymentPanel(true);
            setShowCloseSessionModal(false);

            showToast({
                icon: 'info',
                title: `${ordersToProcessList.length} order(s) to process`,
                text: `Total: ₱${totalAmount.toFixed(2)}`
            });

        } catch (err) {
            console.error('Calculate error:', err);
            showToast({ icon: 'error', title: err.message || 'Failed to calculate' });
        } finally {
            setIsCalculating(false);
        }
    };

    // 🆕 Process ALL orders payment
    const handleProcessAllOrdersPayment = async (method, amount) => {
        if (ordersToProcess.length === 0) {
            showToast({ icon: 'warning', title: 'No orders to process' });
            return;
        }

        setIsSubmitting(true);
        let successCount = 0;
        let failedOrders = [];

        try {
            for (const order of ordersToProcess) {
                try {
                    if (order.type === 'booking') {
                        // Checkout booking
                        const payload = {
                            payment_method: method,
                            amount_received: order.total
                        };
                        await apiPost(`/space/bookings/${order.id}/checkout`, payload);
                        successCount++;
                        console.log(`✅ Booking ${order.order_number} completed`);
                    } else if (order.type === 'pay_later') {
                        // Settle pay later
                        const payload = {
                            amount_received: order.total,
                            payment_method: method
                        };
                        await apiPost(`/space/orders/${order.id}/settle-pay-later`, payload);
                        successCount++;
                        console.log(`✅ Pay Later order ${order.order_number} settled`);
                    }
                } catch (e) {
                    console.error('Failed to process order:', e);
                    failedOrders.push(order);
                }
            }

            if (successCount > 0) {
                showToast({
                    icon: 'success',
                    title: 'All orders completed!',
                    text: `Processed ${successCount}/${ordersToProcess.length} orders. Total: ₱${amount.toFixed(2)}`
                });

                // Refresh orders
                await fetchOrders();

                // Close payment panel
                setShowPaymentPanel(false);
                setShowOrderModal(false);
                setSelectedOrder(null);

                // Get the customer name from the first order
                const customerName = ordersToProcess[0]?.customer_name || bookingToClose?.customer_name || 'Guest';

                // Get all orders for this customer from the refreshed data
                const updatedCustomerOrders = getCustomerOrders(customerName);

                if (updatedCustomerOrders.length > 0) {
                    const combinedOrder = {
                        _id: `combined-${Date.now()}`,
                        customer_name: customerName,
                        total: updatedCustomerOrders.reduce((sum, o) => sum + (o.total || 0), 0),
                        status: 'completed',
                        payment_status: 'paid',
                        created_at: new Date(),
                        items: updatedCustomerOrders.flatMap(o => o.items || []),
                        grouped_orders: updatedCustomerOrders,
                        is_grouped: true,
                        order_type: 'combined',
                        order_number: `ALL-${Date.now()}`,
                        payment_method: 'combined',
                        subtotal: updatedCustomerOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0),
                        discount_amount: updatedCustomerOrders.reduce((sum, o) => sum + (o.discount_amount || 0), 0),
                        order_count: updatedCustomerOrders.length,
                        has_pending_payment: false,
                        is_pay_later: false
                    };

                    viewOrderDetails(combinedOrder);

                    setTimeout(() => {
                        printReceipt(combinedOrder);
                    }, 500);
                }

                // Clear orders to process
                setOrdersToProcess([]);
                setBookingToClose(null);

            } else {
                showToast({ icon: 'error', title: 'Payment failed', text: 'Could not process any orders' });
            }
        } catch (err) {
            console.error('Payment error:', err);
            showToast({ icon: 'error', title: err.message || 'Payment failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const viewOrderDetails = (order) => {
        if (!order) {
            showToast({ icon: 'error', title: 'Order not found' });
            return;
        }

        let hasPendingPayment = false;
        let pendingCount = 0;
        let hasPayLater = false;
        let payLaterAmount = 0;
        let payLaterTotalAccumulated = 0;

        if (order.is_grouped && order.grouped_orders) {
            pendingCount = order.grouped_orders.filter(o =>
                o.status === 'pending_payment' &&
                o.payment_status !== 'paid' &&
                o.payment_status !== 'completed'
            ).length;
            hasPendingPayment = pendingCount > 0;

            order.grouped_orders.forEach(o => {
                // ✅ FIX: Check pay later status from the order data
                if (o.is_pay_later || o.payment_method === 'pay_later') {
                    hasPayLater = true;
                    const accumulated = o.pay_later_total_accumulated || 0;
                    payLaterTotalAccumulated += accumulated;
                    // ✅ If already settled, remaining is 0
                    const remaining = o.pay_later_status === 'settled' ? 0 : (o.total || 0) - accumulated;
                    payLaterAmount += remaining > 0 ? remaining : 0;
                }
            });
        } else {
            hasPendingPayment = order.status === 'pending_payment' &&
                order.payment_status !== 'paid' &&
                order.payment_status !== 'completed';

            hasPayLater = order.is_pay_later || order.payment_method === 'pay_later';
            // ✅ FIX: Use the actual pay_later_total_accumulated
            const accumulated = order.pay_later_total_accumulated || 0;
            payLaterTotalAccumulated = accumulated;
            const remaining = (order.total || 0) - accumulated;
            payLaterAmount = remaining > 0 ? remaining : 0;
        }

        const formattedOrder = {
            _id: order._id || 'unknown',
            customer_name: order.customer_name || 'Guest',
            total: order.total || 0,
            status: order.status || 'pending',
            payment_status: order.payment_status || 'unpaid',
            created_at: order.created_at || new Date(),
            items: order.items || [],
            grouped_orders: order.grouped_orders || [],
            is_grouped: order.is_grouped || false,
            order_type: order.order_type || 'pos_order',
            order_number: order.order_number || 'N/A',
            payment_method: order.payment_method || 'cash',
            subtotal: order.subtotal || 0,
            tax: order.tax || 0,
            discount_amount: order.discount_amount || 0,
            order_count: order.order_count || 1,
            date: order.date || null,
            payment_methods: order.payment_methods || '',
            space_id: order.space_id || null,
            room_id: order.room_id || null,
            check_in_at: order.check_in_at || null,
            check_out_at: order.check_out_at || null,
            voucher_applied: order.voucher_applied || null,
            items_count: order.items_count || 0,
            amount_received: order.amount_received || 0,
            change: order.change || 0,
            voucher_code: order.voucher_code || null,
            pay_later_payments: order.pay_later_payments || [],
            pay_later_status: order.pay_later_status || null,
            // ✅ FIX: Use the calculated accumulated amount
            pay_later_total_accumulated: payLaterTotalAccumulated,
            is_pay_later: hasPayLater || order.is_pay_later,
            has_pending_payment: hasPendingPayment,
            pending_count: pendingCount,
            has_pay_later: hasPayLater,
            pay_later_remaining: payLaterAmount,
            can_close_session: canCloseSession(order)
        };

        if (hasPayLater && payLaterAmount > 0) {
            setPaymentAmount(payLaterAmount.toString());
        } else {
            setPaymentAmount(formattedOrder.total?.toString() || '0');
        }

        setSelectedOrder(formattedOrder);
        setShowOrderModal(true);
    };

    // 🆕 Handle Pay Later settlement
    const handlePayLaterSettlement = async () => {
        if (!selectedOrder || !selectedOrder.is_pay_later) return;

        const amount = parseFloat(payLaterAmount);
        if (!amount || amount <= 0) {
            showToast({ icon: 'warning', title: 'Please enter a valid amount' });
            return;
        }

        const remaining = selectedOrder.total - (selectedOrder.pay_later_total_accumulated || 0);
        if (amount > remaining) {
            showToast({ icon: 'warning', title: 'Amount exceeds remaining balance' });
            return;
        }

        setIsProcessingPayment(true);
        try {
            const endpoint = `/space/orders/${selectedOrder._id}/settle-pay-later`;
            const payload = {
                amount_received: amount,
                payment_method: payLaterMethod
            };

            const res = await apiPost(endpoint, payload);
            if (res.success) {
                showToast({
                    icon: 'success',
                    title: 'Payment recorded!',
                    text: `₱${amount.toFixed(2)} received. Remaining: ₱${res.data.remaining.toFixed(2)}`
                });
                setShowPayLaterModal(false);
                setShowOrderModal(false);
                setSelectedOrder(null);
                await fetchOrders();
            } else {
                showToast({ icon: 'error', title: res.message || 'Payment failed' });
            }
        } catch (err) {
            console.error('Pay later settlement error:', err);
            showToast({ icon: 'error', title: err.message || 'Payment failed' });
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handlePayment = async () => {
        if (!selectedOrder) return;

        if (selectedOrder.is_pay_later || selectedOrder.has_pay_later) {
            const remaining = selectedOrder.total - (selectedOrder.pay_later_total_accumulated || 0);
            if (remaining <= 0) {
                showToast({ icon: 'info', title: 'This order is already fully paid' });
                return;
            }
            setPayLaterAmount(remaining.toString());
            setShowPayLaterModal(true);
            return;
        }

        if (paymentMethod === 'cash') {
            const amount = parseFloat(paymentAmount);
            if (!amount || amount < selectedOrder.total) {
                showToast({ icon: 'warning', title: 'Insufficient amount' });
                return;
            }
            await processPayment('cash', amount);
        } else if (paymentMethod === 'online') {
            await generateOnlinePayment();
        } else if (paymentMethod === 'qr') {
            await processPayment('qr', selectedOrder.total);
        }
    };

    const processPayment = async (method, amount) => {
        setIsProcessingPayment(true);
        try {
            if (selectedOrder.is_grouped && selectedOrder.grouped_orders) {
                let successCount = 0;
                let failedOrders = [];
                let skippedOrders = [];

                const ordersToProcess = selectedOrder.grouped_orders.filter(order => {
                    const isPaid = order.payment_status === 'paid' ||
                        order.payment_status === 'completed' ||
                        order.status === 'completed' ||
                        order.status === 'confirmed';
                    return !isPaid;
                });

                if (ordersToProcess.length === 0) {
                    showToast({
                        icon: 'info',
                        title: 'All orders already paid',
                        text: 'No pending payments for this customer'
                    });
                    setIsProcessingPayment(false);
                    return;
                }

                const totalAmount = ordersToProcess.reduce((sum, o) => sum + (o.total || 0), 0);

                for (const order of ordersToProcess) {
                    try {
                        const orderAmount = order.total || 0;
                        const shareAmount = totalAmount > 0 ? (amount / totalAmount) * orderAmount : orderAmount;

                        if (order.order_type === 'booking' || order.order_type === 'booking_order') {
                            if (order.status === 'pending_payment' || order.status === 'active') {
                                const endpoint = `/space/bookings/${order._id}/checkout`;
                                const payload = {
                                    payment_method: method,
                                    amount_received: shareAmount
                                };
                                await apiPost(endpoint, payload);
                            } else {
                                skippedOrders.push({
                                    order: order,
                                    reason: `Booking status is ${order.status}`
                                });
                                continue;
                            }
                        } else {
                            const endpoint = `/space/orders/${order._id}/status`;
                            const payload = { status: 'completed' };
                            await apiPut(endpoint, payload);
                        }
                        successCount++;
                    } catch (e) {
                        console.error('Failed to process order:', e);
                        failedOrders.push({
                            order: order,
                            error: e.message
                        });
                    }
                }

                await fetchOrders();

                if (successCount > 0) {
                    let message = `₱${amount.toFixed(2)} received from ${selectedOrder.customer_name}`;
                    if (skippedOrders.length > 0) {
                        message += ` (${successCount}/${ordersToProcess.length} processed, ${skippedOrders.length} skipped)`;
                    } else {
                        message += ` (${successCount}/${ordersToProcess.length} orders)`;
                    }

                    showToast({
                        icon: 'success',
                        title: 'Payment successful!',
                        text: message
                    });
                    setShowOrderModal(false);
                    setSelectedOrder(null);
                } else if (skippedOrders.length > 0 && successCount === 0) {
                    showToast({
                        icon: 'info',
                        title: 'No processable orders',
                        text: `${skippedOrders.length} booking(s) cannot be processed`
                    });
                } else {
                    showToast({
                        icon: 'error',
                        title: 'Payment failed',
                        text: failedOrders.length > 0 ? failedOrders[0].error : 'Please try again'
                    });
                }
                setIsProcessingPayment(false);
                return;
            }

            if (selectedOrder.order_type === 'booking' || selectedOrder.order_type === 'booking_order') {
                if (selectedOrder.status !== 'pending_payment' && selectedOrder.status !== 'active') {
                    showToast({
                        icon: 'warning',
                        title: 'Cannot process payment',
                        text: `Booking status is ${selectedOrder.status}. Only pending_payment or active bookings can be checked out.`
                    });
                    setIsProcessingPayment(false);
                    return;
                }

                const endpoint = `/space/bookings/${selectedOrder._id}/checkout`;
                const payload = { payment_method: method, amount_received: amount };
                await apiPost(endpoint, payload);
            } else {
                const endpoint = `/space/orders/${selectedOrder._id}/status`;
                const payload = { status: 'completed' };
                await apiPut(endpoint, payload);
            }

            await fetchOrders();

            showToast({
                icon: 'success',
                title: 'Payment successful!',
                text: `₱${amount.toFixed(2)} received from ${selectedOrder.customer_name}`
            });
            setShowOrderModal(false);
            setSelectedOrder(null);

        } catch (err) {
            console.error('Payment error:', err);
            showToast({ icon: 'error', title: err.message || 'Payment failed' });
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const generateOnlinePayment = async () => {
        setIsProcessingPayment(true);
        try {
            const payload = {
                amount: selectedOrder.total,
                order_number: selectedOrder.order_number,
                customer_name: selectedOrder.customer_name,
                payment_method: 'gcash',
                space_id: selectedOrder.space_id?._id || selectedOrder.space_id
            };

            const res = await apiPost('/space/payment/create-link', payload);

            if (res.success && res.data.checkout_url) {
                setPaymentLink(res.data.checkout_url);
                setCurrentOrderId(selectedOrder.order_number);
                setShowPaymentQR(true);
                setShowOrderModal(false);
            } else {
                showToast({ icon: 'error', title: res.message || 'Failed to generate payment link' });
            }
        } catch (err) {
            console.error('Payment link error:', err);
            showToast({ icon: 'error', title: err.message || 'Payment failed' });
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handlePaymentComplete = async () => {
        setShowPaymentQR(false);
        setPaymentLink('');
        await fetchOrders();
        showToast({ icon: 'success', title: 'Payment completed!' });
    };

    // 🆕 Handle Print Receipt from modal
    const handlePrintReceipt = () => {
        if (selectedOrder) {
            printReceipt(selectedOrder);
        }
    };

    const columns = [
        {
            header: "Customer",
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-foreground font-black text-sm">{row.customer_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                        {formatDateShort(row.date || row.created_at)} • {row.order_count || 1} order(s)
                    </span>
                </div>
            )
        },
        {
            header: "Type",
            cell: (row) => {
                const isPayLater = row.is_pay_later || row.payment_method?.includes('pay_later');
                const label = row.order_count > 1 ? 'Multiple' : getOrderTypeLabel(row);
                const hasActive = canCloseSession(row);
                return (
                    <div className="flex flex-col">
                        <span className={cn("text-[10px] font-bold uppercase",
                            isPayLater ? 'text-amber-600 dark:text-amber-400' : getOrderTypeColor(row)
                        )}>
                            {isPayLater ? 'Pay Later' : label}
                            {hasActive && (
                                <span className="ml-1 text-[8px] text-orange-600 dark:text-orange-400 font-black">
                                    ● Pending
                                </span>
                            )}
                        </span>
                        {row.payment_methods && (
                            <span className="text-[9px] text-muted-foreground">{row.payment_methods}</span>
                        )}
                    </div>
                );
            }
        },
        {
            header: "Items",
            cell: (row) => (
                <span className="text-sm text-muted-foreground">
                    {row.order_count || 0} order(s)
                </span>
            )
        },
        {
            header: "Total",
            cell: (row) => {
                const isPayLater = row.is_pay_later || row.payment_method?.includes('pay_later');
                // ✅ FIX: Use pay_later_remaining from backend, NOT recalculated
                const remaining = row.pay_later_remaining || 0;
                // ✅ Also check if pay_later_status is 'settled'
                const isSettled = row.pay_later_status === 'settled';
                return (
                    <div>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            ₱{(row.total || 0).toFixed(2)}
                        </span>
                        {isPayLater && !isSettled && remaining > 0 && (
                            <div className="text-[8px] text-amber-600 dark:text-amber-400">
                                Remaining: ₱{remaining.toFixed(2)}
                            </div>
                        )}
                        {isPayLater && (isSettled || remaining <= 0) && (
                            <div className="text-[8px] text-emerald-600 dark:text-emerald-400">
                                ✓ Fully Paid
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            header: "Payment",
            cell: (row) => {
                const isPayLater = row.is_pay_later || row.payment_method?.includes('pay_later');
                return (
                    <div className="flex items-center gap-1.5">
                        {isPayLater ? (
                            <ClockIcon size={12} className="text-amber-500" />
                        ) : row.payment_method?.includes('cash') ? (
                            <Banknote size={12} className="text-emerald-500" />
                        ) : (
                            <CreditCard size={12} className="text-blue-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                            {getPaymentMethodDisplay(row.payment_method?.split(',')[0] || 'cash')}
                        </span>
                    </div>
                );
            }
        },
        {
            header: "Status",
            cell: (row) => {
                const status = row.status || 'pending';
                const isPayLater = row.is_pay_later || row.payment_method?.includes('pay_later');
                let displayStatus = status;

                if (isPayLater) {
                    if (row.pay_later_status === 'settled' || (row.total > 0 && (row.pay_later_total_accumulated || 0) >= row.total)) {
                        displayStatus = 'settled';
                    } else if (row.pay_later_status === 'partially_paid' || (row.pay_later_total_accumulated || 0) > 0) {
                        displayStatus = 'partially_paid';
                    } else {
                        displayStatus = 'pending';
                    }
                }

                const statusStyles = {
                    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    partially_paid: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30",
                    settled: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
                };

                return (
                    <span className={cn(
                        "px-2 py-1 rounded text-[9px] font-black uppercase inline-flex items-center gap-1",
                        isPayLater ? statusStyles[displayStatus] || statusStyles.pending : getStatusStyles(status)
                    )}>
                        {displayStatus === 'partially_paid' && <ClockIcon size={10} className="animate-pulse" />}
                        {displayStatus === 'settled' && <CheckCircle size={10} />}
                        {getPayLaterStatusLabel(displayStatus)}
                    </span>
                );
            }
        },
        {
            header: "Actions",
            cell: (row) => {
                const hasActive = canCloseSession(row);
                return (
                    <div className="flex items-center gap-1">
                        {hasActive && (
                            <button
                                onClick={() => handleCloseSession(row)}
                                className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                                title="Close Session & Process All Orders"
                            >
                                <DoorOpen size={14} className="text-emerald-600 dark:text-emerald-400" />
                            </button>
                        )}
                        <button
                            onClick={() => viewOrderDetails(row)}
                            className="p-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                        >
                            <Eye size={16} className="text-primary" />
                        </button>
                    </div>
                );
            }
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-12">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-black text-foreground tracking-tight uppercase italic">Total Orders</h1>
                <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest">
                    All bookings and POS orders grouped by customer per day
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                <Card className="bg-primary/5 border-primary/10">
                    <CardContent className="p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Total</p>
                        <p className="text-xl font-[1000] text-foreground italic mt-1">{stats.total || 0}</p>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/10">
                    <CardContent className="p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Bookings</p>
                        <p className="text-xl font-[1000] text-emerald-600 dark:text-emerald-400 italic mt-1">{stats.bookings || 0}</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-500/5 border-blue-500/10">
                    <CardContent className="p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">POS Orders</p>
                        <p className="text-xl font-[1000] text-blue-600 dark:text-blue-400 italic mt-1">{stats.pos_orders || 0}</p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-500/5 border-amber-500/10">
                    <CardContent className="p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Pay Later</p>
                        <p className="text-xl font-[1000] text-amber-600 dark:text-amber-400 italic mt-1">{stats.pay_later || 0}</p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-500/5 border-amber-500/10">
                    <CardContent className="p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Pay Later Amount</p>
                        <p className="text-xl font-[1000] text-amber-600 dark:text-amber-400 italic mt-1">
                            ₱{(stats.pay_later_amount || 0).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/10">
                    <CardContent className="p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Revenue</p>
                        <p className="text-xl font-[1000] text-emerald-600 dark:text-emerald-400 italic mt-1">
                            ₱{(stats.revenue || 0).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input
                            type="text"
                            placeholder="Search by customer name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:border-primary outline-none placeholder:text-muted-foreground"
                        />
                    </div>
                    <div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:border-primary outline-none"
                        >
                            <option value="all">All Types</option>
                            <option value="booking">Bookings</option>
                            <option value="pos">POS Orders</option>
                            <option value="pay_later">Pay Later</option>
                        </select>
                    </div>
                    <div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:border-primary outline-none"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="active">Active</option>
                            <option value="pending_payment">Pending Payment</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Data Table - Grouped view */}
            <DataTable
                columns={columns}
                data={orders}
                loading={loading}
                totalCount={totalCount}
                onParamsChange={handleParamsChange}
                renderMobileCard={(row) => {
                    const isPayLater = row.is_pay_later || row.payment_method?.includes('pay_later');
                    const remaining = row.pay_later_remaining || 0;
                    const isSettled = row.pay_later_status === 'settled';
                    const hasActive = canCloseSession(row);
                    return (
                        <div key={row._id} className="bg-card border-border p-5 rounded-[2.5rem] space-y-4 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-black text-foreground">{row.customer_name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {formatDateShort(row.date || row.created_at)} • {row.order_count || 1} order(s)
                                    </p>
                                </div>
                                <span className={cn(
                                    "px-2 py-1 rounded text-[9px] font-black uppercase",
                                    isPayLater ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : getStatusStyles(row.status)
                                )}>
                                    {isPayLater ? 'Pay Later' : row.status}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{row.order_count || 0} order(s)</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                    ₱{(row.total || 0).toFixed(2)}
                                </span>
                            </div>
                            {isPayLater && !isSettled && remaining > 0 && (
                                <div className="text-[8px] text-amber-600 dark:text-amber-400 font-bold">
                                    Remaining: ₱{remaining.toFixed(2)}
                                </div>
                            )}
                            {isPayLater && (isSettled || remaining <= 0) && (
                                <div className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold">
                                    ✓ Fully Paid
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    {row.payment_method?.includes('pay_later') ? (
                                        <ClockIcon size={12} className="text-amber-500" />
                                    ) : row.payment_method?.includes('cash') ? (
                                        <Banknote size={12} className="text-emerald-500" />
                                    ) : (
                                        <CreditCard size={12} className="text-blue-500" />
                                    )}
                                    {getPaymentMethodDisplay(row.payment_method?.split(',')[0] || 'cash')}
                                </span>
                                <div className="flex items-center gap-1">
                                    {hasActive && (
                                        <button
                                            onClick={() => handleCloseSession(row)}
                                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                                            title="Close Session & Process All Orders"
                                        >
                                            <DoorOpen size={14} className="text-emerald-600 dark:text-emerald-400" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => viewOrderDetails(row)}
                                        className="p-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                                    >
                                        <Eye size={14} className="text-primary" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                }}
            />

            {/* Close Session Modal */}
            <Modal
                open={showCloseSessionModal}
                onClose={() => {
                    setShowCloseSessionModal(false);
                    setBookingToClose(null);
                }}
                title="Close Session"
                size="md"
            >
                {bookingToClose ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-widest">
                                {bookingToClose.ticket_number || bookingToClose.order_number}
                            </p>
                            <p className="text-lg font-black text-foreground mt-1">
                                {bookingToClose.customer_name || bookingToClose.guest_name || 'Guest'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                {bookingToClose.space_id?.name || 'Unknown Space'}
                            </p>
                            {bookingToClose.status === 'pending_payment' && (
                                <p className="text-[8px] text-orange-600 dark:text-orange-400 font-black mt-1">
                                    ⚠️ Pending Payment - Will be processed
                                </p>
                            )}
                        </div>

                        {/* Live Billing Timer */}
                        {bookingToClose.check_in_at && (
                            <LiveBillingTimer
                                checkInAt={bookingToClose.check_in_at}
                                checkOutAt={bookingToClose.check_out_at}
                                onAmountUpdate={setLiveAmount}
                                booking={bookingToClose}
                                isCalculated={bookingToClose.status === 'pending_payment'}
                            />
                        )}

                        {/* Total Amount Display */}
                        <div className="bg-primary/10 rounded-xl p-4 text-center border border-primary/20">
                            <p className="text-[8px] text-primary font-black uppercase tracking-widest">
                                {bookingToClose.status === 'pending_payment' ? 'Total Due' : 'Current Total'}
                            </p>
                            <p className="text-3xl font-[1000] text-foreground italic">
                                ₱{(bookingToClose.status === 'pending_payment' ? bookingToClose.total : liveAmount).toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                            <p className="text-[8px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider text-center">
                                This will process the booking and all Pay Later orders
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowCloseSessionModal(false);
                                    setBookingToClose(null);
                                }}
                                className="flex-1 py-3 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCalculateAndShowPayment}
                                disabled={isCalculating}
                                className={cn(
                                    "flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                                )}
                            >
                                {isCalculating ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                                {isCalculating ? 'Calculating...' : 'Review & Pay All'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Loader2 size={32} className="animate-spin mx-auto text-primary" />
                        <p className="text-muted-foreground mt-4">Loading session...</p>
                    </div>
                )}
            </Modal>

            {/* Payment Panel Modal - Using PaymentPanel component */}
            <Modal
                open={showPaymentPanel}
                onClose={() => {
                    setShowPaymentPanel(false);
                    setOrdersToProcess([]);
                }}
                title="Process All Orders"
                size="lg"
            >
                <div className="space-y-6">
                    {/* Summary of orders to process */}
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                        <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider">
                            Orders to Process: {ordersToProcess.length}
                        </p>
                        <p className="text-2xl font-[1000] text-foreground italic">
                            Total: ₱{totalAllOrders.toFixed(2)}
                        </p>
                    </div>

                    {/* List of orders */}
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {ordersToProcess.map((order, idx) => (
                            <div key={idx} className="bg-muted rounded-xl p-3 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-foreground text-sm">
                                        {order.type === 'booking' ? 'Booking' : 'Pay Later POS'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {order.order_number || 'N/A'}
                                    </p>
                                </div>
                                <span className="font-black text-emerald-600 dark:text-emerald-400">
                                    ₱{order.total.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Use the PaymentPanel component */}
                    <PaymentPanel
                        booking={{
                            _id: ordersToProcess[0]?.id || 'combined',
                            ticket_number: 'ALL-ORDERS',
                            space_id: { name: 'Combined Orders', rate_hour: 0 },
                            total_amount: totalAllOrders,
                            voucher_discount: 0,
                            voucher_applied: null
                        }}
                        liveTotalAmount={totalAllOrders}
                        onComplete={async ({ method, amount_received, voucher_code, total_amount }) => {
                            // Process all orders with the selected payment method
                            await handleProcessAllOrdersPayment(method, total_amount || totalAllOrders);
                        }}
                        isSubmitting={isSubmitting}
                        onApplyVoucher={async (bookingData) => {
                            // Apply voucher to the first booking (or all)
                            if (ordersToProcess.length > 0) {
                                const firstBooking = ordersToProcess.find(o => o.type === 'booking');
                                if (firstBooking) {
                                    try {
                                        const res = await apiPost(`/space/bookings/${firstBooking.id}/apply-voucher`, {
                                            voucherCode: bookingData.voucher_applied
                                        });
                                        if (res.success) {
                                            // Update total
                                            const newTotal = totalAllOrders - res.data.discount_amount;
                                            setTotalAllOrders(newTotal);
                                            setPaymentAmount(newTotal.toString());
                                            showToast({
                                                icon: 'success',
                                                title: 'Voucher applied!',
                                                text: `Saved ₱${res.data.discount_amount.toFixed(2)}`
                                            });
                                            return { success: true, data: res.data };
                                        }
                                    } catch (e) {
                                        showToast({ icon: 'error', title: e.message || 'Failed to apply voucher' });
                                        return { success: false };
                                    }
                                }
                            }
                            return { success: false };
                        }}
                        onOpenOnlinePayment={async () => {
                            // Generate online payment link for all orders
                            try {
                                const payload = {
                                    amount: totalAllOrders,
                                    order_number: `ALL-${Date.now()}`,
                                    customer_name: ordersToProcess[0]?.customer_name || 'Guest',
                                    payment_method: 'gcash',
                                    space_id: bookingToClose?.space_id || null
                                };
                                const res = await apiPost('/space/payment/create-link', payload);
                                if (res.success && res.data.checkout_url) {
                                    window.open(res.data.checkout_url, '_blank');
                                    showToast({ icon: 'info', title: 'Payment link opened' });
                                } else {
                                    showToast({ icon: 'error', title: res.message || 'Failed to generate payment link' });
                                }
                            } catch (err) {
                                showToast({ icon: 'error', title: err.message || 'Failed to generate payment link' });
                            }
                        }}
                    />

                    {/* Cancel button */}
                    <button
                        onClick={() => {
                            setShowPaymentPanel(false);
                            setOrdersToProcess([]);
                        }}
                        className="w-full py-3 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors rounded-xl border border-border"
                    >
                        Cancel
                    </button>
                </div>
            </Modal>

            {/* Order Details Modal */}
            <Modal
                open={showOrderModal}
                onClose={() => {
                    setShowOrderModal(false);
                    setSelectedOrder(null);
                }}
                title="Order Details"
                size="lg"
            >
                {selectedOrder ? (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-border">
                            <div>
                                <h3 className="text-lg font-black text-foreground">
                                    {selectedOrder.customer_name || 'Guest'}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {selectedOrder.date ? `Date: ${selectedOrder.date}` : formatDate(selectedOrder.created_at)}
                                    {selectedOrder.order_count && ` • ${selectedOrder.order_count} order(s)`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedOrder.can_close_session && (
                                    <button
                                        onClick={() => {
                                            setShowOrderModal(false);
                                            handleCloseSession(selectedOrder);
                                        }}
                                        className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg transition-colors"
                                        title="Close Session"
                                    >
                                        <DoorOpen size={18} className="text-emerald-600 dark:text-emerald-400" />
                                    </button>
                                )}
                                <button
                                    onClick={handlePrintReceipt}
                                    className="p-2 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors"
                                    title="Print Receipt"
                                >
                                    <Printer size={18} className="text-primary" />
                                </button>
                                <span className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase",
                                    selectedOrder.is_pay_later
                                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                        : getStatusStyles(selectedOrder.status || 'pending')
                                )}>
                                    {selectedOrder.is_pay_later ? 'Pay Later' : (selectedOrder.status || 'Pending')}
                                </span>
                            </div>
                        </div>

                        {/* Pay Later Info Banner */}
                        {selectedOrder.is_pay_later && (
                            <div className={cn(
                                "rounded-xl p-4 border",
                                (selectedOrder.pay_later_remaining || 0) > 0
                                    ? "bg-amber-500/10 border-amber-500/20"
                                    : "bg-emerald-500/10 border-emerald-500/20"
                            )}>
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={18} className={cn(
                                        (selectedOrder.pay_later_remaining || 0) > 0
                                            ? "text-amber-600 dark:text-amber-400"
                                            : "text-emerald-600 dark:text-emerald-400"
                                    )} />
                                    <div>
                                        <p className="text-sm font-bold">Pay Later Order</p>
                                        <div className="flex flex-wrap gap-4 mt-1 text-xs">
                                            <span className="text-muted-foreground">
                                                Total: <span className="font-bold text-foreground">₱{selectedOrder.total.toFixed(2)}</span>
                                            </span>
                                            <span className="text-muted-foreground">
                                                Paid: <span className="font-bold text-emerald-600">₱{(selectedOrder.pay_later_total_accumulated || 0).toFixed(2)}</span>
                                            </span>
                                            <span className="text-muted-foreground">
                                                Remaining: <span className={cn(
                                                    "font-bold",
                                                    (selectedOrder.pay_later_remaining || 0) > 0
                                                        ? "text-amber-600"
                                                        : "text-emerald-600"
                                                )}>
                                                    ₱{(selectedOrder.pay_later_remaining || 0).toFixed(2)}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Customer Info */}
                        <div className="bg-muted rounded-xl p-4 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Customer</p>
                                <p className="text-foreground font-bold">{selectedOrder.customer_name || 'Guest'}</p>
                            </div>
                            <div>
                                <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Payment Method</p>
                                <p className="text-foreground font-bold capitalize">
                                    {selectedOrder.is_grouped ? 'Multiple' : getPaymentMethodDisplay(selectedOrder.payment_method || 'cash')}
                                    {selectedOrder.is_pay_later && ' (Pay Later)'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Date</p>
                                <p className="text-foreground">{formatDate(selectedOrder.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Payment Status</p>
                                <p className={cn(
                                    "font-bold",
                                    selectedOrder.payment_status === 'paid' || selectedOrder.payment_status === 'completed'
                                        ? "text-emerald-600"
                                        : "text-amber-600"
                                )}>
                                    {selectedOrder.payment_status === 'completed' ? 'Paid' : selectedOrder.payment_status || 'Unpaid'}
                                </p>
                            </div>
                        </div>

                        {/* Grouped Orders Summary */}
                        {selectedOrder.is_grouped && selectedOrder.grouped_orders && (
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Order Summary</p>
                                <div className="space-y-2">
                                    {selectedOrder.grouped_orders.map((o, idx) => (
                                        <div key={idx} className="bg-muted rounded-xl p-3 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-foreground text-sm">
                                                    {o.order_type === 'booking' ? 'Booking' : 'POS Order'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {o.order_number || o.ticket_number || 'N/A'}
                                                </p>
                                                <p className="text-[8px] text-muted-foreground capitalize">
                                                    {o.status} • {o.payment_method || 'N/A'}
                                                </p>
                                            </div>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                                                ₱{(o.total || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Items */}
                        {selectedOrder.items && selectedOrder.items.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Items</p>
                                <div className="space-y-2">
                                    {selectedOrder.items.map((item, idx) => (
                                        <div key={idx} className="bg-muted rounded-xl p-3 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-foreground text-sm">{item.name || 'Unknown Item'}</p>
                                                <p className="text-xs text-muted-foreground">Qty: {item.quantity || 0}</p>
                                            </div>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                                                ₱{((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Totals */}
                        <div className="border-t border-border pt-4 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>₱{(selectedOrder.subtotal || 0).toFixed(2)}</span>
                            </div>
                            {(selectedOrder.discount_amount || 0) > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-emerald-600">Discount</span>
                                    <span className="text-emerald-600">-₱{(selectedOrder.discount_amount || 0).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-black pt-2 border-t border-border">
                                <span>Total</span>
                                <span className="text-emerald-600 dark:text-emerald-400">
                                    ₱{(selectedOrder.total || 0).toFixed(2)}
                                </span>
                            </div>
                            {selectedOrder.is_pay_later && (selectedOrder.pay_later_remaining || 0) > 0 && (
                                <div className="flex justify-between text-sm pt-1 border-t border-border/50">
                                    <span className="text-amber-600 font-bold">Remaining Balance</span>
                                    <span className="text-amber-600 font-bold">₱{(selectedOrder.pay_later_remaining || 0).toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        {/* Pay Later Settlement Button */}
                        {selectedOrder.is_pay_later && (selectedOrder.pay_later_remaining || 0) > 0 && (
                            <div className="border-t border-border pt-4">
                                <button
                                    onClick={handlePayment}
                                    disabled={isProcessingPayment}
                                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {isProcessingPayment ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                                    Settle Pay Later (₱{(selectedOrder.pay_later_remaining || 0).toFixed(2)})
                                </button>
                            </div>
                        )}

                        {selectedOrder.payment_status === 'paid' && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                                <CheckCircle size={24} className="mx-auto text-emerald-600 mb-2" />
                                <p className="text-sm font-bold text-emerald-600">Payment Completed</p>
                                <p className="text-xs text-muted-foreground">This order has been fully paid</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Loader2 size={32} className="animate-spin mx-auto text-primary" />
                        <p className="text-muted-foreground mt-4">Loading order details...</p>
                    </div>
                )}
            </Modal>

            {/* Pay Later Settlement Modal */}
            <Modal
                open={showPayLaterModal}
                onClose={() => setShowPayLaterModal(false)}
                title="Settle Pay Later Order"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">Remaining Balance</span>
                            <span className="text-xl font-black text-amber-600">
                                ₱{(selectedOrder?.pay_later_remaining || 0).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                            <span>Total: ₱{(selectedOrder?.total || 0).toFixed(2)}</span>
                            <span>Paid: ₱{(selectedOrder?.pay_later_total_accumulated || 0).toFixed(2)}</span>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Payment Method</label>
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={() => setPayLaterMethod('cash')}
                                className={cn(
                                    "flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all",
                                    payLaterMethod === 'cash'
                                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-600"
                                        : "bg-muted border-border text-muted-foreground hover:border-primary/30"
                                )}
                            >
                                <Banknote size={16} className="mx-auto mb-1" />
                                Cash
                            </button>
                            <button
                                onClick={() => setPayLaterMethod('qr')}
                                className={cn(
                                    "flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all",
                                    payLaterMethod === 'qr'
                                        ? "bg-blue-500/20 border-blue-500 text-blue-600"
                                        : "bg-muted border-border text-muted-foreground hover:border-primary/30"
                                )}
                            >
                                <CreditCard size={16} className="mx-auto mb-1" />
                                QR/GCash
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Amount to Pay</label>
                        <input
                            type="number"
                            value={payLaterAmount}
                            onChange={(e) => setPayLaterAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="w-full mt-1 px-4 py-2 rounded-xl bg-background border border-border text-foreground focus:border-primary outline-none"
                        />
                        <p className="text-[8px] text-muted-foreground mt-1">
                            Max: ₱{(selectedOrder?.pay_later_remaining || 0).toFixed(2)}
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setShowPayLaterModal(false)}
                            className="flex-1 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors rounded-xl"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePayLaterSettlement}
                            disabled={isProcessingPayment}
                            className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                        >
                            {isProcessingPayment ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                            Confirm Payment
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Payment QR Modal */}
            <PaymentQRModal
                isOpen={showPaymentQR}
                onClose={() => {
                    setShowPaymentQR(false);
                    setPaymentLink('');
                    setCurrentOrderId('');
                }}
                orderNumber={currentOrderId}
                amount={selectedOrder?.total || 0}
                paymentLink={paymentLink}
                onPaymentComplete={handlePaymentComplete}
            />
        </div>
    );
};

export default TotalOrders;