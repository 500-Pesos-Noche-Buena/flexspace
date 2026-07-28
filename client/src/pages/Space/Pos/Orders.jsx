import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost, apiPut } from '@/utils/Api';
import {
    Search, Loader2, Eye, Package, CreditCard,
    Banknote, QrCode, Calendar, TrendingUp,
    ShoppingBag, Smartphone, Users, CheckCircle,
    XCircle, Clock, Coffee, Truck, CheckCheck,
    AlertCircle, Printer, RefreshCw, Zap, Bell,
    Filter, ArrowUpDown, User, Receipt, DollarSign
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import { DataTable } from '@/components/ui/DataTable';
import { showToast } from '@/components/ui/SweetAlert2';
import { PaymentQRModal, OrderDetailsModal } from '@/components/modal';

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

// Quick action status flow for POS orders
const STATUS_FLOW = {
    pos: ['pending', 'confirmed', 'preparing', 'ready', 'completed'],
    online: ['pending_payment', 'confirmed', 'preparing', 'ready', 'completed']
};

const STATUS_LABELS = {
    pending: { label: 'Pending', icon: Clock, color: 'amber' },
    pending_payment: { label: 'Awaiting Payment', icon: CreditCard, color: 'orange' },
    confirmed: { label: 'Confirmed', icon: CheckCircle, color: 'blue' },
    preparing: { label: 'Preparing', icon: Coffee, color: 'purple' },
    ready: { label: 'Ready', icon: Truck, color: 'indigo' },
    completed: { label: 'Completed', icon: CheckCheck, color: 'emerald' },
    cancelled: { label: 'Cancelled', icon: XCircle, color: 'rose' }
};

const Orders = () => {
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderType, setOrderType] = useState('pos');
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [showFilters, setShowFilters] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPaymentQR, setShowPaymentQR] = useState(false);
    const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
    const [paymentLink, setPaymentLink] = useState('');
    
    // Quick action queue
    const [actionQueue, setActionQueue] = useState([]);
    const [isProcessingQueue, setIsProcessingQueue] = useState(false);

    const [stats, setStats] = useState({
        pos: {
            total: 0, pending: 0, pending_payment: 0, confirmed: 0,
            preparing: 0, ready: 0, completed: 0, cancelled: 0,
            revenue: 0, active_count: 0
        },
        online: {
            total: 0, pending: 0, pending_payment: 0, confirmed: 0,
            preparing: 0, ready: 0, completed: 0, cancelled: 0,
            revenue: 0, active_count: 0
        }
    });

    const paramsRef = useRef({});
    const lastDataFingerprint = useRef("");
    const isMountedRef = useRef(true);

    // ============================================================
    // FETCH ORDERS
    // ============================================================
    const fetchOrders = useCallback(async (isSilent = false) => {
        if (!isMountedRef.current) return;

        try {
            const res = await apiGet('/space/orders');

            if (!isMountedRef.current) return;

            if (res.success) {
                const ordersData = res.data || [];
                const newFingerprint = JSON.stringify(ordersData);

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

    // ============================================================
    // CALCULATE STATS
    // ============================================================
    const calculateStats = (ordersData) => {
        const posOrders = ordersData.filter(o => o.order_type === 'pos');
        const onlineOrders = ordersData.filter(o => o.order_type === 'online');

        const calcStats = (orders) => {
            const active = orders.filter(o => 
                ['confirmed', 'preparing', 'ready'].includes(o.status)
            );
            const revenue = orders
                .filter(o => ['completed', 'ready', 'confirmed'].includes(o.status))
                .reduce((sum, o) => sum + (o.total || 0), 0);

            return {
                total: orders.length,
                pending: orders.filter(o => o.status === 'pending').length,
                pending_payment: orders.filter(o => o.status === 'pending_payment').length,
                confirmed: orders.filter(o => o.status === 'confirmed').length,
                preparing: orders.filter(o => o.status === 'preparing').length,
                ready: orders.filter(o => o.status === 'ready').length,
                completed: orders.filter(o => o.status === 'completed').length,
                cancelled: orders.filter(o => o.status === 'cancelled').length,
                revenue: revenue,
                active_count: active.length
            };
        };

        setStats({
            pos: calcStats(posOrders),
            online: calcStats(onlineOrders)
        });
    };

    // ============================================================
    // QUICK BULK STATUS UPDATE (For fast workflow)
    // ============================================================
    const quickUpdateStatus = async (orderId, newStatus) => {
        try {
            const res = await apiPut(`/space/orders/${orderId}/status`, { status: newStatus });
            if (res.success) {
                // Update local state immediately for UI responsiveness
                setAllOrders(prev => prev.map(o => 
                    o._id === orderId ? { ...o, status: newStatus } : o
                ));
                // Recalculate stats
                calculateStats(allOrders.map(o => 
                    o._id === orderId ? { ...o, status: newStatus } : o
                ));
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to update status:', err);
            return false;
        }
    };

    // ============================================================
    // PROCESS ACTION QUEUE (Batch processing for multiple orders)
    // ============================================================
    const processActionQueue = async () => {
        if (isProcessingQueue || actionQueue.length === 0) return;

        setIsProcessingQueue(true);
        const queue = [...actionQueue];
        setActionQueue([]);

        const results = [];
        for (const action of queue) {
            const success = await quickUpdateStatus(action.orderId, action.status);
            results.push({ ...action, success });
            
            // Small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        if (successCount > 0) {
            showToast({
                icon: 'success',
                title: `${successCount} orders updated`,
                text: failCount > 0 ? `${failCount} failed` : undefined
            });
        } else if (failCount > 0) {
            showToast({ icon: 'error', title: 'Failed to update orders' });
        }

        setIsProcessingQueue(false);
        await fetchOrders(true);
    };

    // ============================================================
    // BULK ORDER ACTIONS
    // ============================================================
    const bulkUpdate = async (orderIds, newStatus) => {
        if (orderIds.length === 0) return;

        const newActions = orderIds.map(id => ({ orderId: id, status: newStatus }));
        setActionQueue(prev => [...prev, ...newActions]);
        
        // Process queue immediately
        await processActionQueue();
    };

    // ============================================================
    // QUICK ORDER FLOW - One click status update
    // ============================================================
    const advanceOrder = async (order) => {
        const flow = order.order_type === 'pos' ? STATUS_FLOW.pos : STATUS_FLOW.online;
        const currentIndex = flow.indexOf(order.status);
        
        if (currentIndex === -1 || currentIndex === flow.length - 1) {
            // If at last status or invalid, show options
            if (order.status === 'completed') {
                showToast({ icon: 'info', title: 'Order already completed' });
                return;
            }
            // Default to next available
            const nextStatus = flow[0];
            await quickUpdateStatus(order._id, nextStatus);
            await fetchOrders(true);
            showToast({ icon: 'success', title: `Order moved to ${STATUS_LABELS[nextStatus]?.label || nextStatus}` });
            return;
        }

        const nextStatus = flow[currentIndex + 1];
        const success = await quickUpdateStatus(order._id, nextStatus);
        if (success) {
            await fetchOrders(true);
            showToast({ 
                icon: 'success', 
                title: `✅ ${order.customer_name || 'Order'} → ${STATUS_LABELS[nextStatus]?.label || nextStatus}`,
                text: `Order #${order.order_number}`
            });
        }
    };

    // ============================================================
    // QUICK BULK - Advance all ready orders
    // ============================================================
    const bulkAdvanceAll = async (status) => {
        const readyOrders = currentOrders.filter(o => o.status === status);
        if (readyOrders.length === 0) {
            showToast({ icon: 'info', title: `No orders with status: ${status}` });
            return;
        }

        const flow = orderType === 'pos' ? STATUS_FLOW.pos : STATUS_FLOW.online;
        const nextIndex = flow.indexOf(status) + 1;
        if (nextIndex >= flow.length) {
            showToast({ icon: 'info', title: 'All orders already at final status' });
            return;
        }
        const nextStatus = flow[nextIndex];

        const orderIds = readyOrders.map(o => o._id);
        await bulkUpdate(orderIds, nextStatus);
    };

    // ============================================================
    // HANDLE PAYMENT
    // ============================================================
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

    // ============================================================
    // GET STATUS CONFIG
    // ============================================================
    const getStatusConfig = (status) => {
        const config = STATUS_LABELS[status] || STATUS_LABELS.pending;
        const colorMap = {
            amber: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
            orange: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
            blue: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
            purple: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
            indigo: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
            emerald: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
            rose: 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
        };
        return {
            ...config,
            color: colorMap[config.color] || colorMap.amber,
            icon: <config.icon size={12} />
        };
    };

    const getPaymentColor = (paymentMethod) => {
        switch (paymentMethod) {
            case 'cash': return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
            case 'qr': return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
            case 'card': return 'bg-purple-500/20 text-purple-600 dark:text-purple-400';
            case 'online': return 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400';
            default: return 'bg-muted text-muted-foreground';
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

    // ============================================================
    // FILTERED ORDERS
    // ============================================================
    const currentOrders = allOrders.filter(order => order.order_type === orderType);
    const currentStats = orderType === 'pos' ? stats.pos : stats.online;

    const filteredOrders = currentOrders
        .filter(order => {
            const orderNumber = order.order_number || '';
            const customerName = order.customer_name || order.user_id?.name || 'Guest';
            const matchesSearch = orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                customerName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
            if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
            if (sortBy === 'highest') return (b.total || 0) - (a.total || 0);
            if (sortBy === 'lowest') return (a.total || 0) - (b.total || 0);
            return 0;
        });

    // ============================================================
    // STATUS TABS
    // ============================================================
    const statusTabs = [
        { id: 'all', label: 'All', icon: Package, count: currentStats.total },
        { id: 'pending', label: 'Pending', icon: Clock, count: currentStats.pending },
        { id: 'pending_payment', label: 'Payment', icon: CreditCard, count: currentStats.pending_payment },
        { id: 'confirmed', label: 'Confirmed', icon: CheckCircle, count: currentStats.confirmed },
        { id: 'preparing', label: 'Preparing', icon: Coffee, count: currentStats.preparing },
        { id: 'ready', label: 'Ready', icon: Truck, count: currentStats.ready },
        { id: 'completed', label: 'Done', icon: CheckCheck, count: currentStats.completed }
    ];

    // ============================================================
    // COLUMNS
    // ============================================================
    const columns = [
        {
            header: "Order & Customer",
            cell: (row) => (
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-foreground font-black italic uppercase tracking-tighter">#{row.order_number}</span>
                        {row.order_type === 'online' && (
                            <span className="text-[8px] bg-purple-500/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-black uppercase">Online</span>
                        )}
                    </div>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                        <User size={10} className="inline mr-1" /> {row.customer_name || row.user_id?.name || 'Guest'}
                    </span>
                </div>
            )
        },
        {
            header: "Items",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Package size={14} className="text-muted-foreground" />
                    <span className="text-foreground text-sm font-bold">{row.items?.length || 0} items</span>
                </div>
            )
        },
        {
            header: "Time",
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-foreground text-sm font-bold">{formatShortDate(row.createdAt)}</span>
                    <span className="text-[8px] text-muted-foreground">
                        {row.updatedAt && row.updatedAt !== row.createdAt && `Updated: ${formatShortDate(row.updatedAt)}`}
                    </span>
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
                    <span className="text-primary font-black text-base">₱{row.total?.toFixed(2)}</span>
                    {row.change > 0 && <span className="text-[8px] text-muted-foreground">Change: ₱{row.change.toFixed(2)}</span>}
                </div>
            )
        },
        {
            header: "Actions",
            cell: (row) => {
                const flow = orderType === 'pos' ? STATUS_FLOW.pos : STATUS_FLOW.online;
                const currentIndex = flow.indexOf(row.status);
                const isLast = currentIndex === flow.length - 1;
                const isCompleted = row.status === 'completed';
                const isCancelled = row.status === 'cancelled';

                return (
                    <div className="flex gap-1.5">
                        <button 
                            onClick={() => setSelectedOrder(row)} 
                            className="p-1.5 bg-primary/20 text-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-all"
                            title="View Details"
                        >
                            <Eye size={14} />
                        </button>

                        {/* Quick Advance Button - One click status update */}
                        {!isCompleted && !isCancelled && (
                            <button 
                                onClick={() => advanceOrder(row)} 
                                className="p-1.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                                title={isLast ? "Mark Complete" : `Move to ${STATUS_LABELS[flow[currentIndex + 1]]?.label || 'next'}`}
                            >
                                {isLast ? <CheckCheck size={14} /> : <Zap size={14} />}
                            </button>
                        )}

                        {row.status === 'pending_payment' && (
                            <button 
                                onClick={() => handlePayNow(row)} 
                                className="p-1.5 bg-purple-600/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-600 hover:text-white transition-all"
                                title="Generate Payment"
                            >
                                <QrCode size={14} />
                            </button>
                        )}
                    </div>
                );
            }
        }
    ];

    // ============================================================
    // EFFECTS
    // ============================================================
    useEffect(() => {
        fetchOrders(false);
    }, [fetchOrders]);

    useEffect(() => {
        let mounted = true;
        const pollInterval = setInterval(() => {
            if (mounted && document.visibilityState === 'visible') {
                fetchOrders(true);
            }
        }, 5000); // Poll every 5 seconds
        return () => {
            mounted = false;
            clearInterval(pollInterval);
        };
    }, [fetchOrders]);

    // Process action queue when it changes
    useEffect(() => {
        if (actionQueue.length > 0 && !isProcessingQueue) {
            processActionQueue();
        }
    }, [actionQueue]);

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            {/* Header */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-foreground italic uppercase tracking-tighter">
                        Order Management
                        <span className="text-sm font-normal ml-2 text-muted-foreground">
                            ({currentStats.active_count} active)
                        </span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest italic">
                        Manage POS and online orders
                    </p>
                </div>

                {/* Quick Bulk Actions */}
                <div className="flex gap-2">
                    {orderType === 'pos' && (
                        <Button
                            onClick={() => bulkAdvanceAll('pending')}
                            className="bg-blue-600/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl text-[9px] font-black uppercase"
                            size="sm"
                        >
                            <Zap size={12} className="mr-1" /> Advance All Pending
                        </Button>
                    )}
                    <Button
                        onClick={() => bulkAdvanceAll('preparing')}
                        className="bg-purple-600/20 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white rounded-xl text-[9px] font-black uppercase"
                        size="sm"
                    >
                        <Zap size={12} className="mr-1" /> Bulk Ready
                    </Button>
                    <Button
                        onClick={() => fetchOrders(false)}
                        className="bg-muted text-muted-foreground hover:text-foreground rounded-xl text-[9px] font-black uppercase"
                        size="sm"
                    >
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    </Button>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 text-center">
                        <Users size={16} className="mx-auto text-primary mb-1" />
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Active Orders</p>
                        <p className="text-2xl font-black text-foreground">{currentStats.active_count}</p>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="p-4 text-center">
                        <CheckCheck size={16} className="mx-auto text-emerald-500 mb-1" />
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Completed</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{currentStats.completed}</p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-500/5 border-amber-500/20">
                    <CardContent className="p-4 text-center">
                        <Clock size={16} className="mx-auto text-amber-500 mb-1" />
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Pending</p>
                        <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{currentStats.pending}</p>
                    </CardContent>
                </Card>
                <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4 text-center">
                        <Coffee size={16} className="mx-auto text-purple-500 mb-1" />
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Preparing</p>
                        <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{currentStats.preparing}</p>
                    </CardContent>
                </Card>
                <Card className="bg-indigo-500/5 border-indigo-500/20">
                    <CardContent className="p-4 text-center">
                        <Truck size={16} className="mx-auto text-indigo-500 mb-1" />
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Ready</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{currentStats.ready}</p>
                    </CardContent>
                </Card>
                <Card className="bg-cyan-500/5 border-cyan-500/20">
                    <CardContent className="p-4 text-center">
                        <DollarSign size={16} className="mx-auto text-cyan-500 mb-1" />
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Revenue</p>
                        <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400">₱{currentStats.revenue.toLocaleString()}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Order Type Tabs */}
            <div className="flex items-center justify-between mb-6">
                <Tabs value={orderType} onValueChange={setOrderType} className="w-auto">
                    <TabsList className="bg-muted border border-border rounded-3xl p-1.5">
                        <TabsTrigger value="pos" className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">
                            <ShoppingBag size={12} className="mr-1" /> POS ({stats.pos.total})
                        </TabsTrigger>
                        <TabsTrigger value="online" className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-purple-600 data-[state=active]:text-white text-muted-foreground">
                            <Smartphone size={12} className="mr-1" /> Online ({stats.online.total})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-2">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 bg-muted border border-border rounded-xl text-[10px] font-black uppercase text-foreground focus:border-primary outline-none"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Amount</option>
                        <option value="lowest">Lowest Amount</option>
                    </select>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto mb-6 pb-2">
                {statusTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterStatus(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap",
                            filterStatus === tab.id 
                                ? "bg-primary text-primary-foreground shadow-lg" 
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                    >
                        <tab.icon size={12} />
                        <span className="text-[10px] font-black uppercase">{tab.label}</span>
                        <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[8px] font-black",
                            filterStatus === tab.id ? "bg-primary-foreground/20" : "bg-background/50"
                        )}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                    type="text"
                    placeholder="Search by order # or customer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-background border border-border rounded-xl text-foreground focus:border-primary outline-none text-sm placeholder:text-muted-foreground"
                />
            </div>

            {/* DataTable */}
            <DataTable
                columns={columns}
                data={filteredOrders}
                loading={loading}
                totalCount={filteredOrders.length}
                onParamsChange={() => {}}
                renderMobileCard={(order) => {
                    const statusConfig = getStatusConfig(order.status);
                    const flow = orderType === 'pos' ? STATUS_FLOW.pos : STATUS_FLOW.online;
                    const currentIndex = flow.indexOf(order.status);
                    const isLast = currentIndex === flow.length - 1;
                    const isCompleted = order.status === 'completed';
                    const isCancelled = order.status === 'cancelled';

                    return (
                        <div key={order._id} className="bg-card border-border p-5 rounded-[2.5rem] space-y-4 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-black text-foreground">
                                            {order.customer_name || order.user_id?.name || 'Guest'}
                                        </h3>
                                        {order.order_type === 'online' && (
                                            <span className="text-[8px] bg-purple-500/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-black uppercase">Online</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground font-mono">#{order.order_number}</p>
                                </div>
                                <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase", statusConfig.color)}>
                                    {statusConfig.icon} {statusConfig.label}
                                </div>
                            </div>

                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1"><Package size={12} /> {order.items?.length || 0} items</span>
                                <span className="flex items-center gap-1"><Calendar size={12} /> {formatShortDate(order.createdAt)}</span>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-border">
                                <div>
                                    <p className="text-[8px] text-muted-foreground">Payment</p>
                                    <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold", getPaymentColor(order.payment_method))}>
                                        {getPaymentIcon(order.payment_method)} {order.payment_method}
                                    </div>
                                </div>
                                <p className="text-lg font-[1000] text-primary italic">₱{order.total?.toFixed(2)}</p>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setSelectedOrder(order)} 
                                    className="flex-1 py-2 bg-primary/20 text-primary rounded-xl text-[10px] font-black uppercase hover:bg-primary hover:text-primary-foreground transition-all"
                                >
                                    <Eye size={12} className="inline mr-1" /> View
                                </button>

                                {!isCompleted && !isCancelled && (
                                    <button 
                                        onClick={() => advanceOrder(order)} 
                                        className="flex-1 py-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all"
                                    >
                                        {isLast ? <CheckCheck size={12} className="inline mr-1" /> : <Zap size={12} className="inline mr-1" />}
                                        {isLast ? 'Complete' : 'Next'}
                                    </button>
                                )}

                                {order.status === 'pending_payment' && (
                                    <button 
                                        onClick={() => handlePayNow(order)} 
                                        className="flex-1 py-2 bg-purple-600/20 text-purple-600 dark:text-purple-400 rounded-xl text-[10px] font-black uppercase hover:bg-purple-600 hover:text-white transition-all"
                                    >
                                        <QrCode size={12} className="inline mr-1" /> Pay
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                }}
            />

            {/* Modals */}
            <OrderDetailsModal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                order={selectedOrder}
                onUpdateStatus={(id, status) => {
                    quickUpdateStatus(id, status);
                    fetchOrders(true);
                }}
            />

            <PaymentQRModal
                isOpen={showPaymentQR}
                onClose={() => { 
                    setShowPaymentQR(false); 
                    setSelectedOrderForPayment(null); 
                    setPaymentLink(''); 
                    fetchOrders(false); 
                }}
                orderNumber={selectedOrderForPayment?.order_number}
                amount={selectedOrderForPayment?.total}
                paymentLink={paymentLink}
                onPaymentComplete={(orderNum) => { 
                    showToast({ icon: 'success', title: `Order ${orderNum} completed!` }); 
                    fetchOrders(false); 
                }}
            />
        </div>
    );
};

export default Orders;