import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '@/utils/Api';
import {
    Search, Loader2, Eye, Package, CreditCard,
    Banknote, QrCode, Calendar, TrendingUp,
    ShoppingBag, Smartphone, Users, CheckCircle,
    XCircle, Clock, Coffee, Truck, CheckCheck,
    AlertCircle, Printer, RefreshCw
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import { DataTable } from '@/components/ui/DataTable';
import { showToast } from '@/components/ui/SweetAlert2';
import PaymentQRModal from '@/components/PaymentQRModal';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        let date = dateString;
        if (typeof dateString === 'string') {
            date = new Date(dateString);
        }
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return 'Invalid Date';
    }
};

const formatShortDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        let date = dateString;
        if (typeof dateString === 'string') {
            date = new Date(dateString);
        }
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return 'N/A';
    }
};

const Orders = () => {
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderType, setOrderType] = useState('pos'); // 'pos' or 'online'
    const [filterStatus, setFilterStatus] = useState('all');
    const [stats, setStats] = useState({
        pos: {
            total: 0,
            pending: 0,
            pending_payment: 0,
            confirmed: 0,
            preparing: 0,
            ready: 0,
            completed: 0,
            cancelled: 0,
            revenue: 0
        },
        online: {
            total: 0,
            pending: 0,
            pending_payment: 0,
            confirmed: 0,
            preparing: 0,
            ready: 0,
            completed: 0,
            cancelled: 0,
            revenue: 0
        }
    });

    const [showPaymentQR, setShowPaymentQR] = useState(false);
    const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
    const [paymentLink, setPaymentLink] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Refs for real-time updates
    const paramsRef = useRef({});
    const lastDataFingerprint = useRef("");
    const isMountedRef = useRef(true);

    const fetchOrders = useCallback(async (isSilent = false) => {
        if (!isMountedRef.current) return;

        try {
            const res = await apiGet('/space/orders');

            if (!isMountedRef.current) return;

            if (res.success) {
                const ordersData = res.data || [];
                const newFingerprint = JSON.stringify(ordersData);

                // Only update if data changed
                if (newFingerprint !== lastDataFingerprint.current) {
                    lastDataFingerprint.current = newFingerprint;
                    setAllOrders(ordersData);
                    calculateStats(ordersData);
                }
            }
        } catch (err) {
            if (!isSilent) console.error('Failed to fetch orders:', err);
        } finally {
            if (!isSilent && isMountedRef.current) setLoading(false);
        }
    }, []);

    const calculateStats = (ordersData) => {
        // POS Orders (order_type === 'pos')
        const posOrders = ordersData.filter(o => o.order_type === 'pos');
        const onlineOrders = ordersData.filter(o => o.order_type === 'online');

        // POS Stats
        const posPending = posOrders.filter(o => o.status === 'pending').length;
        const posPendingPayment = posOrders.filter(o => o.status === 'pending_payment').length;
        const posConfirmed = posOrders.filter(o => o.status === 'confirmed').length;
        const posPreparing = posOrders.filter(o => o.status === 'preparing').length;
        const posReady = posOrders.filter(o => o.status === 'ready').length;
        const posCompleted = posOrders.filter(o => o.status === 'completed').length;
        const posCancelled = posOrders.filter(o => o.status === 'cancelled').length;

        // FIX: Include 'ready' and 'completed' orders in revenue
        const posRevenue = posOrders
            .filter(o => o.status === 'completed' || o.status === 'ready' || o.status === 'confirmed')
            .reduce((sum, o) => sum + (o.total || 0), 0);

        // Online Stats
        const onlinePending = onlineOrders.filter(o => o.status === 'pending').length;
        const onlinePendingPayment = onlineOrders.filter(o => o.status === 'pending_payment').length;
        const onlineConfirmed = onlineOrders.filter(o => o.status === 'confirmed').length;
        const onlinePreparing = onlineOrders.filter(o => o.status === 'preparing').length;
        const onlineReady = onlineOrders.filter(o => o.status === 'ready').length;
        const onlineCompleted = onlineOrders.filter(o => o.status === 'completed').length;
        const onlineCancelled = onlineOrders.filter(o => o.status === 'cancelled').length;

        // FIX: Include 'ready' and 'completed' orders in revenue
        const onlineRevenue = onlineOrders
            .filter(o => o.status === 'completed' || o.status === 'ready' || o.status === 'confirmed')
            .reduce((sum, o) => sum + (o.total || 0), 0);

        setStats({
            pos: {
                total: posOrders.length,
                pending: posPending,
                pending_payment: posPendingPayment,
                confirmed: posConfirmed,
                preparing: posPreparing,
                ready: posReady,
                completed: posCompleted,
                cancelled: posCancelled,
                revenue: posRevenue
            },
            online: {
                total: onlineOrders.length,
                pending: onlinePending,
                pending_payment: onlinePendingPayment,
                confirmed: onlineConfirmed,
                preparing: onlinePreparing,
                ready: onlineReady,
                completed: onlineCompleted,
                cancelled: onlineCancelled,
                revenue: onlineRevenue
            }
        });
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            const res = await apiPut(`/space/orders/${orderId}/status`, { status: newStatus });
            if (res.success) {
                showToast({ icon: 'success', title: `Order ${newStatus}` });
                await fetchOrders(true);
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Failed to update status' });
        }
    };

    const handlePayNow = async (order) => {
        setIsProcessing(true);
        try {
            const paymentRes = await apiPost('/space/payment/create-link', {
                amount: order.total,
                order_number: order.order_number,
                customer_name: order.customer_name,
                payment_method: 'gcash'
            });

            if (paymentRes.success && paymentRes.data.checkout_url) {
                setSelectedOrderForPayment(order);
                setPaymentLink(paymentRes.data.checkout_url);
                setShowPaymentQR(true);
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Failed to create payment link' });
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusConfig = (status) => {
        const config = {
            pending: { label: 'Pending', icon: <Clock size={12} />, color: 'bg-amber-500/20 text-amber-400', nextStatuses: ['confirmed', 'cancelled'] },
            pending_payment: { label: 'Awaiting Payment', icon: <CreditCard size={12} />, color: 'bg-orange-500/20 text-orange-400', nextStatuses: ['confirmed', 'cancelled'] },
            confirmed: { label: 'Confirmed', icon: <CheckCircle size={12} />, color: 'bg-blue-500/20 text-blue-400', nextStatuses: ['preparing', 'cancelled'] },
            preparing: { label: 'Preparing', icon: <Coffee size={12} />, color: 'bg-purple-500/20 text-purple-400', nextStatuses: ['ready', 'cancelled'] },
            ready: { label: 'Ready for Pickup', icon: <Truck size={12} />, color: 'bg-indigo-500/20 text-indigo-400', nextStatuses: ['completed', 'cancelled'] },
            completed: { label: 'Completed', icon: <CheckCheck size={12} />, color: 'bg-emerald-500/20 text-emerald-400', nextStatuses: [] },
            cancelled: { label: 'Cancelled', icon: <XCircle size={12} />, color: 'bg-red-500/20 text-red-400', nextStatuses: [] }
        };
        return config[status] || config.pending;
    };

    const getPaymentColor = (paymentMethod) => {
        switch (paymentMethod) {
            case 'cash': return 'bg-emerald-500/20 text-emerald-400';
            case 'qr': return 'bg-blue-500/20 text-blue-400';
            case 'card': return 'bg-purple-500/20 text-purple-400';
            case 'online': return 'bg-cyan-500/20 text-cyan-400';
            default: return 'bg-slate-500/20 text-slate-400';
        }
    };

    const getPaymentIcon = (paymentMethod) => {
        switch (paymentMethod) {
            case 'cash': return <Banknote size={12} />;
            case 'qr': return <QrCode size={12} />;
            case 'card': return <CreditCard size={12} />;
            case 'online': return <Smartphone size={12} />;
            default: return <CreditCard size={12} />;
        }
    };

    // Filter orders based on order_type and status
    const currentOrders = allOrders.filter(order => order.order_type === orderType);
    const currentStats = orderType === 'pos' ? stats.pos : stats.online;

    const filteredOrders = currentOrders.filter(order => {
        const orderNumber = order.order_number;
        const customerName = order.customer_name || order.user_id?.name || 'Guest';
        const matchesSearch = orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customerName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const statusTabs = [
        { id: 'all', label: 'All Orders', icon: <Package size={12} />, count: currentStats.total },
        { id: 'pending', label: 'Pending', icon: <Clock size={12} />, count: currentStats.pending },
        { id: 'pending_payment', label: 'Awaiting Payment', icon: <CreditCard size={12} />, count: currentStats.pending_payment },
        { id: 'confirmed', label: 'Confirmed', icon: <CheckCircle size={12} />, count: currentStats.confirmed },
        { id: 'preparing', label: 'Preparing', icon: <Coffee size={12} />, count: currentStats.preparing },
        { id: 'ready', label: 'Ready for Pickup', icon: <Truck size={12} />, count: currentStats.ready },
        { id: 'completed', label: 'Completed', icon: <CheckCheck size={12} />, count: currentStats.completed },
        { id: 'cancelled', label: 'Cancelled', icon: <XCircle size={12} />, count: currentStats.cancelled }
    ];

    const columns = [
        {
            header: "Order # & Customer",
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-white font-black italic uppercase tracking-tighter">#{row.order_number}</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {row.customer_name || row.user_id?.name || 'Guest'}
                    </span>
                </div>
            )
        },
        {
            header: "Items",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Package size={14} className="text-slate-400" />
                    <span className="text-white text-sm font-bold">{row.items?.length || 0} items</span>
                </div>
            )
        },
        {
            header: "Date & Time",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="text-white text-sm">{formatShortDate(row.createdAt)}</span>
                </div>
            )
        },
        {
            header: "Payment",
            cell: (row) => (
                <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase", getPaymentColor(row.payment_method))}>
                    {getPaymentIcon(row.payment_method)} {row.payment_method}
                </div>
            )
        },
        {
            header: "Status",
            cell: (row) => {
                const statusConfig = getStatusConfig(row.status);
                return (
                    <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase", statusConfig.color)}>
                        {statusConfig.icon} {statusConfig.label}
                    </div>
                );
            }
        },
        {
            header: "Total",
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-emerald-400 font-black text-base">₱{row.total?.toFixed(2)}</span>
                    {row.change > 0 && <span className="text-[8px] text-slate-500">Change: ₱{row.change.toFixed(2)}</span>}
                </div>
            )
        },
        {
            header: "Actions",
            cell: (row) => (
                <div className="flex gap-1">
                    <button onClick={() => setSelectedOrder(row)} className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white">
                        <Eye size={14} />
                    </button>
                    {row.status === 'pending_payment' && (
                        <button onClick={() => handlePayNow(row)} className="p-1.5 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600 hover:text-white">
                            <QrCode size={14} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    // Initial load
    useEffect(() => {
        fetchOrders(false);
    }, [fetchOrders]);

    // Real-time polling every 3 seconds
    useEffect(() => {
        let mounted = true;

        const pollInterval = setInterval(() => {
            if (mounted && document.visibilityState === 'visible') {
                fetchOrders(true);
            }
        }, 3000);

        return () => {
            mounted = false;
            clearInterval(pollInterval);
        };
    }, [fetchOrders]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Order Management</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest italic">Manage POS walk-in orders and customer online orders.</p>
            </div>

            {/* Order Type Tabs */}
            <div className="flex items-center justify-between mb-6">
                <Tabs value={orderType} onValueChange={setOrderType} className="w-auto">
                    <TabsList className="bg-white/5 border border-white/5 rounded-3xl p-1.5">
                        <TabsTrigger value="pos" className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-500">
                            <ShoppingBag size={12} className="mr-1" /> POS Orders ({stats.pos.total})
                        </TabsTrigger>
                        <TabsTrigger value="online" className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-500">
                            <Smartphone size={12} className="mr-1" /> Online Orders ({stats.online.total})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Status Filter Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
                {statusTabs.map(tab => (
                    <Card
                        key={tab.id}
                        className={cn(
                            "cursor-pointer transition-all hover:scale-105",
                            filterStatus === tab.id ? "bg-indigo-500/10 border-indigo-500/30" : "bg-[#111114] border-white/5"
                        )}
                        onClick={() => setFilterStatus(tab.id)}
                    >
                        <CardContent className="p-3 text-center">
                            <div className={cn(
                                "p-1.5 rounded-lg inline-block",
                                filterStatus === tab.id ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-slate-500"
                            )}>
                                {tab.icon}
                            </div>
                            <p className="text-[8px] font-black uppercase text-slate-500 mt-1">{tab.label}</p>
                            <p className="text-lg font-black text-white">{tab.count}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Revenue Card - Solid Dark */}
            <Card className="bg-[#0f0f12] border-emerald-500/30 mb-6">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <TrendingUp size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Total Revenue ({orderType === 'pos' ? 'POS' : 'Online'})</p>
                            <p className="text-2xl font-black text-white">₱{(orderType === 'pos' ? stats.pos.revenue : stats.online.revenue).toLocaleString()}</p>
                        </div>
                    </div>
                    <button onClick={() => fetchOrders(false)} className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        <RefreshCw size={16} />
                    </button>
                </CardContent>
            </Card>
            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                    type="text"
                    placeholder="Search by order # or customer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none text-sm"
                />
            </div>

            {/* DataTable */}
            <DataTable
                columns={columns}
                data={filteredOrders}
                loading={loading}
                totalCount={filteredOrders.length}
                onParamsChange={() => { }}
                renderMobileCard={(order) => {
                    const statusConfig = getStatusConfig(order.status);
                    return (
                        <div key={order._id} className="bg-[#111114] border border-white/5 p-5 rounded-[2.5rem] space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-black text-white">
                                        {order.customer_name || order.user_id?.name || 'Customer'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-500 font-mono">#{order.order_number}</p>
                                </div>
                                <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase", statusConfig.color)}>
                                    {statusConfig.icon} {statusConfig.label}
                                </div>
                            </div>

                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span className="flex items-center gap-1"><Package size={12} /> {order.items?.length || 0} items</span>
                                <span className="flex items-center gap-1"><Calendar size={12} /> {formatShortDate(order.createdAt)}</span>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                <div>
                                    <p className="text-[8px] text-slate-500">Payment</p>
                                    <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold", getPaymentColor(order.payment_method))}>
                                        {getPaymentIcon(order.payment_method)} {order.payment_method}
                                    </div>
                                </div>
                                <p className="text-lg font-[1000] text-emerald-400 italic">₱{order.total?.toFixed(2)}</p>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setSelectedOrder(order)} className="flex-1 py-2 bg-indigo-600/20 text-indigo-400 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white">
                                    <Eye size={12} className="inline mr-1" /> View
                                </button>
                                {order.status === 'pending_payment' && (
                                    <button onClick={() => handlePayNow(order)} className="flex-1 py-2 bg-purple-600/20 text-purple-400 rounded-xl text-[10px] font-black uppercase hover:bg-purple-600 hover:text-white">
                                        <QrCode size={12} className="inline mr-1" /> Pay
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                }}
            />

            {/* Order Details Modal */}
            <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Order Details" size="lg" variant="dark">
                {selectedOrder && (
                    <div className="space-y-4">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[8px] text-indigo-400 font-black uppercase">Order Number</p>
                                    <p className="text-sm font-black text-white font-mono">#{selectedOrder.order_number}</p>
                                </div>
                                <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase", getStatusConfig(selectedOrder.status).color)}>
                                    {getStatusConfig(selectedOrder.status).icon} {getStatusConfig(selectedOrder.status).label}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-4">
                            <p className="text-[8px] text-slate-500 font-black uppercase mb-2">Customer Details</p>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-slate-400">Name</span>
                                    <span className="text-[10px] text-white font-bold">
                                        {selectedOrder.customer_name || selectedOrder.user_id?.name || 'Guest'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-slate-400">Date</span>
                                    <span className="text-[10px] text-white">{formatDate(selectedOrder.createdAt)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-slate-400">Payment Method</span>
                                    <span className="text-[10px] text-white capitalize">{selectedOrder.payment_method}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-4">
                            <p className="text-[8px] text-slate-500 font-black uppercase mb-2">Items</p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {selectedOrder.items?.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                                        <div>
                                            <p className="text-white text-sm font-bold">{item.name}</p>
                                            <p className="text-[10px] text-slate-500">₱{item.price} x {item.quantity}</p>
                                        </div>
                                        <p className="text-white font-bold">₱{(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Subtotal</span>
                                    <span className="text-white">₱{selectedOrder.subtotal?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Tax (12% VAT)</span>
                                    <span className="text-white">₱{selectedOrder.tax?.toFixed(2)}</span>
                                </div>
                                {selectedOrder.discount_amount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-emerald-400">Discount</span>
                                        <span className="text-emerald-400">-₱{selectedOrder.discount_amount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
                                    <span className="text-white">Total</span>
                                    <span className="text-emerald-400">₱{selectedOrder.total?.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Status Update Actions */}
                        {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                            <div className="bg-white/5 rounded-2xl p-4">
                                <p className="text-[8px] text-slate-500 font-black uppercase mb-2">Update Status</p>
                                <div className="flex flex-wrap gap-2">
                                    {getStatusConfig(selectedOrder.status).nextStatuses.map(nextStatus => {
                                        const nextConfig = getStatusConfig(nextStatus);
                                        return (
                                            <button
                                                key={nextStatus}
                                                onClick={() => updateOrderStatus(selectedOrder._id, nextStatus)}
                                                className={cn("px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 transition-all", nextConfig.color, "hover:brightness-110")}
                                            >
                                                {nextConfig.icon} {nextConfig.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Payment QR Modal */}
            <PaymentQRModal
                isOpen={showPaymentQR}
                onClose={() => { setShowPaymentQR(false); setSelectedOrderForPayment(null); setPaymentLink(''); fetchOrders(false); }}
                orderId={selectedOrderForPayment?.order_number}
                orderNumber={selectedOrderForPayment?.order_number}
                amount={selectedOrderForPayment?.total}
                paymentLink={paymentLink}
                onPaymentComplete={(orderNum) => { showToast({ icon: 'success', title: `Order ${orderNum} completed!` }); fetchOrders(false); }}
            />
        </div>
    );
};

export default Orders;