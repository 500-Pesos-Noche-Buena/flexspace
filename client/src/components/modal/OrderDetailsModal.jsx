import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { CheckCircle, CheckCheck, Clock, Coffee, Truck, XCircle, CreditCard, Banknote, QrCode, Smartphone } from 'lucide-react';
import { cn } from "@/lib/utils";

const getStatusConfig = (status) => {
    const config = {
        pending: { label: 'Pending', icon: <Clock size={12} />, color: 'bg-amber-500/20 text-amber-600 dark:text-amber-400' },
        pending_payment: { label: 'Awaiting Payment', icon: <CreditCard size={12} />, color: 'bg-orange-500/20 text-orange-600 dark:text-orange-400' },
        confirmed: { label: 'Confirmed', icon: <CheckCircle size={12} />, color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400' },
        preparing: { label: 'Preparing', icon: <Coffee size={12} />, color: 'bg-purple-500/20 text-purple-600 dark:text-purple-400' },
        ready: { label: 'Ready for Pickup', icon: <Truck size={12} />, color: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' },
        completed: { label: 'Completed', icon: <CheckCheck size={12} />, color: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
        cancelled: { label: 'Cancelled', icon: <XCircle size={12} />, color: 'bg-rose-500/20 text-rose-600 dark:text-rose-400' }
    };
    return config[status] || config.pending;
};

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

export const OrderDetailsModal = ({ isOpen, onClose, order, onUpdateStatus }) => {
    if (!order) return null;

    const statusConfig = getStatusConfig(order.status);
    const nextStatuses = {
        pending: ['confirmed', 'cancelled'],
        pending_payment: ['confirmed', 'cancelled'],
        confirmed: ['preparing', 'cancelled'],
        preparing: ['ready', 'cancelled'],
        ready: ['completed', 'cancelled'],
        completed: [],
        cancelled: []
    };

    const getStatusConfigForNext = (status) => getStatusConfig(status);

    return (
        <Modal open={isOpen} onClose={onClose} title="Order Details" size="lg">
            <div className="space-y-4">
                {/* Order Header */}
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[8px] text-primary font-black uppercase">Order Number</p>
                            <p className="text-sm font-black text-foreground font-mono">#{order.order_number}</p>
                        </div>
                        <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase", statusConfig.color)}>
                            {statusConfig.icon} {statusConfig.label}
                        </div>
                    </div>
                </div>

                {/* Customer Details */}
                <div className="bg-muted rounded-2xl p-4 border border-border">
                    <p className="text-[8px] text-muted-foreground font-black uppercase mb-2">Customer Details</p>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-muted-foreground">Name</span>
                            <span className="text-[10px] text-foreground font-bold">
                                {order.customer_name || order.user_id?.name || 'Guest'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[10px] text-muted-foreground">Date</span>
                            <span className="text-[10px] text-foreground">{formatDate(order.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[10px] text-muted-foreground">Payment Method</span>
                            <span className="text-[10px] text-foreground capitalize">{order.payment_method}</span>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="bg-muted rounded-2xl p-4 border border-border">
                    <p className="text-[8px] text-muted-foreground font-black uppercase mb-2">Items</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {order.items?.map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-1 border-b border-border last:border-0">
                                <div>
                                    <p className="text-foreground text-sm font-bold">{item.name}</p>
                                    <p className="text-[10px] text-muted-foreground">₱{item.price} x {item.quantity}</p>
                                </div>
                                <p className="text-foreground font-bold">₱{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals */}
                <div className="bg-muted rounded-2xl p-4 border border-border">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="text-foreground">₱{order.subtotal?.toFixed(2)}</span>
                        </div>
                        {/* <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax (12% VAT)</span>
                            <span className="text-foreground">₱{order.tax?.toFixed(2)}</span>
                        </div> */}
                        {order.discount_amount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-emerald-600 dark:text-emerald-400">Discount</span>
                                <span className="text-emerald-600 dark:text-emerald-400">-₱{order.discount_amount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                            <span className="text-foreground">Total</span>
                            <span className="text-primary">₱{order.total?.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Status Update Actions */}
                {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <div className="bg-muted rounded-2xl p-4 border border-border">
                        <p className="text-[8px] text-muted-foreground font-black uppercase mb-2">Update Status</p>
                        <div className="flex flex-wrap gap-2">
                            {nextStatuses[order.status]?.map(nextStatus => {
                                const nextConfig = getStatusConfigForNext(nextStatus);
                                return (
                                    <button
                                        key={nextStatus}
                                        onClick={() => onUpdateStatus(order._id, nextStatus)}
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
        </Modal>
    );
};