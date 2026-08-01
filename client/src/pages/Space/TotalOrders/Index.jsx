import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import {
    Calendar, Clock, User, Package, Receipt,
    CreditCard, Banknote, Loader2, Search,
    Eye, CheckCircle, XCircle,
    Clock as ClockIcon, AlertCircle, ShoppingBag,
    Users, DollarSign, List, X, Printer, ArrowLeft,
    FileText, Coffee
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/Modal';
import { useTheme } from '@/hooks/useTheme';
import { PaymentQRModal } from '@/components/modal';

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
        revenue: 0
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
            ready: "bg-purple-500/10 text-purple-600 dark:text-purple-400"
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
                    revenue: 0
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

const viewOrderDetails = (order) => {
    console.log('🟢 Viewing order:', order);
    if (!order) {
        showToast({ icon: 'error', title: 'Order not found' });
        return;
    }
    
    // Log what we're getting
    console.log('🔍 Order properties:', Object.keys(order));
    console.log('🔍 Order data:', JSON.stringify(order, null, 2));
    
    // Ensure all required fields exist
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
        // For POS orders
        items_count: order.items_count || 0,
        amount_received: order.amount_received || 0,
        change: order.change || 0,
        voucher_code: order.voucher_code || null,
        pay_later_payments: order.pay_later_payments || [],
        pay_later_status: order.pay_later_status || null
    };
    
    console.log('✅ Formatted order:', formattedOrder);
    setSelectedOrder(formattedOrder);
    setShowOrderModal(true);
    setPaymentAmount(formattedOrder.total?.toString() || '0');
};

    const handlePayment = async () => {
        if (!selectedOrder) return;

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
            // If it's a grouped order, process each order
            if (selectedOrder.is_grouped && selectedOrder.grouped_orders) {
                let successCount = 0;
                for (const order of selectedOrder.grouped_orders) {
                    try {
                        let endpoint;
                        if (order.order_type === 'booking') {
                            endpoint = `/space/bookings/${order._id}/checkout`;
                        } else {
                            endpoint = `/space/orders/${order._id}/status`;
                        }
                        const payload = order.order_type === 'booking'
                            ? { payment_method: method, amount_received: amount / selectedOrder.grouped_orders.length }
                            : { status: 'completed' };
                        await apiPost(endpoint, payload);
                        successCount++;
                    } catch (e) {
                        console.error('Failed to process order:', e);
                    }
                }

                if (successCount > 0) {
                    showToast({
                        icon: 'success',
                        title: 'Payment successful!',
                        text: `₱${amount.toFixed(2)} received from ${selectedOrder.customer_name}`
                    });
                    setShowOrderModal(false);
                    setSelectedOrder(null);
                    fetchOrders();
                } else {
                    showToast({ icon: 'error', title: 'Payment failed' });
                }
                setIsProcessingPayment(false);
                return;
            }

            // Single order
            let endpoint;
            let payload;

            if (selectedOrder.order_type === 'booking') {
                endpoint = `/space/bookings/${selectedOrder._id}/checkout`;
                payload = { payment_method: method, amount_received: amount };
            } else {
                endpoint = `/space/orders/${selectedOrder._id}/status`;
                payload = { status: 'completed' };
            }

            const res = await apiPost(endpoint, payload);

            if (res.success) {
                showToast({
                    icon: 'success',
                    title: 'Payment successful!',
                    text: `₱${amount.toFixed(2)} received from ${selectedOrder.customer_name}`
                });
                setShowOrderModal(false);
                setSelectedOrder(null);
                fetchOrders();
            }
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
            cell: (row) => (
                <div className="flex flex-col">
                    <span className={cn("text-[10px] font-bold uppercase", getOrderTypeColor(row))}>
                        {row.order_count > 1 ? 'Multiple' : getOrderTypeLabel(row)}
                    </span>
                    {row.payment_methods && (
                        <span className="text-[9px] text-muted-foreground">{row.payment_methods}</span>
                    )}
                </div>
            )
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
            cell: (row) => (
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    ₱{(row.total || 0).toFixed(2)}
                </span>
            )
        },
        {
            header: "Payment",
            cell: (row) => (
                <div className="flex items-center gap-1.5">
                    {row.payment_method?.includes('pay_later') ? (
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
            )
        },
        {
            header: "Status",
            cell: (row) => {
                const status = row.status || 'pending';
                return (
                    <span className={cn(
                        "px-2 py-1 rounded text-[9px] font-black uppercase inline-flex items-center gap-1",
                        getStatusStyles(status)
                    )}>
                        {status === 'active' && <ClockIcon size={10} className="animate-pulse" />}
                        {status === 'pending_payment' && <AlertCircle size={10} className="animate-pulse" />}
                        {status === 'completed' && <CheckCircle size={10} />}
                        {status === 'cancelled' && <XCircle size={10} />}
                        {status}
                    </span>
                );
            }
        },
        {
            header: "Actions",
            cell: (row) => (
                <button
                    onClick={() => viewOrderDetails(row)}
                    className="p-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                >
                    <Eye size={16} className="text-primary" />
                </button>
            )
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
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
                renderMobileCard={(row) => (
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
                                getStatusStyles(row.status)
                            )}>
                                {row.status}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{row.order_count || 0} order(s)</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                ₱{(row.total || 0).toFixed(2)}
                            </span>
                        </div>
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
                            <button
                                onClick={() => viewOrderDetails(row)}
                                className="p-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                            >
                                <Eye size={14} className="text-primary" />
                            </button>
                        </div>
                    </div>
                )}
            />

          {/* Order Details Modal - SAFE VERSION */}
<Modal 
    open={showOrderModal} 
    onClose={() => {
        console.log('🔴 Modal closed');
        setShowOrderModal(false);
        setSelectedOrder(null);
    }} 
    title="Order Details" 
    size="lg"
>
    {selectedOrder ? (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
            {/* Safe Header */}
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
                <span className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase",
                    getStatusStyles(selectedOrder.status || 'pending')
                )}>
                    {selectedOrder.status || 'Pending'}
                </span>
            </div>

            {/* Safe content - check each property before rendering */}
            <div className="bg-muted rounded-xl p-4 grid grid-cols-2 gap-4">
                <div>
                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Customer</p>
                    <p className="text-foreground font-bold">{selectedOrder.customer_name || 'Guest'}</p>
                </div>
                <div>
                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Payment Method</p>
                    <p className="text-foreground font-bold capitalize">
                        {getPaymentMethodDisplay(selectedOrder.payment_method || 'cash')}
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

            {/* Items - safe check */}
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

            {/* Booking details - safe check */}
            {selectedOrder.order_type === 'booking' && (
                <div className="bg-muted rounded-xl p-4">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Booking Details</p>
                    <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Space:</span> {selectedOrder.space_id?.name || 'N/A'}</p>
                        {selectedOrder.room_id && (
                            <p><span className="text-muted-foreground">Room:</span> {selectedOrder.room_id?.name || 'N/A'}</p>
                        )}
                        {selectedOrder.check_in_at && (
                            <p><span className="text-muted-foreground">Check-in:</span> {formatDate(selectedOrder.check_in_at)}</p>
                        )}
                        {selectedOrder.check_out_at && (
                            <p><span className="text-muted-foreground">Check-out:</span> {formatDate(selectedOrder.check_out_at)}</p>
                        )}
                        {selectedOrder.voucher_applied && (
                            <p><span className="text-muted-foreground">Voucher:</span> {selectedOrder.voucher_applied}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Totals - safe check */}
            <div className="border-t border-border pt-4 space-y-1">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₱{(selectedOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                {(selectedOrder.tax || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span>₱{(selectedOrder.tax || 0).toFixed(2)}</span>
                    </div>
                )}
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
            </div>

            {/* Payment Actions - safe check */}
            {selectedOrder.payment_status !== 'paid' && 
             selectedOrder.payment_status !== 'completed' && 
             selectedOrder.status !== 'completed' && (
                <div className="border-t border-border pt-4">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Process Payment</p>
                    
                    <div className="flex gap-3 mb-3">
                        <button
                            onClick={() => setPaymentMethod('cash')}
                            className={cn(
                                "flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all",
                                paymentMethod === 'cash'
                                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-600"
                                    : "bg-muted border-border text-muted-foreground hover:border-primary/30"
                            )}
                        >
                            <Banknote size={16} className="mx-auto mb-1" />
                            Cash
                        </button>
                        <button
                            onClick={() => setPaymentMethod('qr')}
                            className={cn(
                                "flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all",
                                paymentMethod === 'qr'
                                    ? "bg-blue-500/20 border-blue-500 text-blue-600"
                                    : "bg-muted border-border text-muted-foreground hover:border-primary/30"
                            )}
                        >
                            <CreditCard size={16} className="mx-auto mb-1" />
                            QR/GCash
                        </button>
                        <button
                            onClick={() => setPaymentMethod('online')}
                            className={cn(
                                "flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all",
                                paymentMethod === 'online'
                                    ? "bg-purple-500/20 border-purple-500 text-purple-600"
                                    : "bg-muted border-border text-muted-foreground hover:border-primary/30"
                            )}
                        >
                            <CreditCard size={16} className="mx-auto mb-1" />
                            Online
                        </button>
                    </div>

                    {paymentMethod === 'cash' && (
                        <div className="flex gap-3 items-center">
                            <div className="flex-1">
                                <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Amount Received</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full mt-1 px-4 py-2 rounded-xl bg-background border border-border text-foreground focus:border-primary outline-none"
                                />
                            </div>
                            <button
                                onClick={handlePayment}
                                disabled={isProcessingPayment}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-all mt-4"
                            >
                                {isProcessingPayment ? <Loader2 size={16} className="animate-spin" /> : 'Pay Now'}
                            </button>
                        </div>
                    )}

                    {(paymentMethod === 'qr' || paymentMethod === 'online') && (
                        <button
                            onClick={handlePayment}
                            disabled={isProcessingPayment}
                            className="w-full py-3 bg-primary hover:opacity-90 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-all"
                        >
                            {isProcessingPayment ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Generate Payment'}
                        </button>
                    )}
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