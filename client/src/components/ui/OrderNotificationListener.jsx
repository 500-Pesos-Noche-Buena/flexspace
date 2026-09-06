import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet } from '@/utils/Api';
import { useAuth } from '@/context/AuthContext';
import orderNotificationService from '@/services/orderNotificationService';
import { Bell, Volume2, VolumeX } from 'lucide-react';

const OrderNotificationListener = () => {
    const { user, isAuthenticated } = useAuth();
    const [lastUserOrders, setLastUserOrders] = useState([]);
    const [notifiedReadyOrders, setNotifiedReadyOrders] = useState(new Set());
    const [notifiedSpaceOrders, setNotifiedSpaceOrders] = useState(new Set());
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const pollingIntervalRef = useRef(null);

    const isSpaceUser = isAuthenticated && (user?.role === 'space' || user?.role === 'staff');
    const isRegularUser = isAuthenticated && user?.role === 'user';

    // Initialize notification service
    useEffect(() => {
        orderNotificationService.init();

        // Load settings from localStorage
        const savedAudio = localStorage.getItem('order_notification_audio');
        const savedVoice = localStorage.getItem('order_notification_voice');

        if (savedAudio !== null) {
            const audioEnabled = savedAudio === 'true';
            setAudioEnabled(audioEnabled);
            orderNotificationService.setAudioEnabled(audioEnabled);
        }

        if (savedVoice !== null) {
            const voiceEnabled = savedVoice === 'true';
            setVoiceEnabled(voiceEnabled);
            orderNotificationService.setVoiceEnabled(voiceEnabled);
        }

        // Safe check para sa iOS Safari para maiwasan ang ReferenceError
        if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'default') {
            try {
                window.Notification.requestPermission();
            } catch (e) {}
        }
    }, []);

    // For Space Owners: Check for new paid orders (confirmed + paid)
    const fetchSpaceOrders = useCallback(async () => {
        try {
            const res = await apiGet('/space/orders');

            if (res.success) {
                const orders = res.data || [];

                for (const order of orders) {
                    if (order.status === 'confirmed' &&
                        order.payment_status === 'paid' &&
                        !notifiedSpaceOrders.has(order.order_number)) {

                        orderNotificationService.notifyNewOrder(order);
                        setNotifiedSpaceOrders(prev => new Set([...prev, order.order_number]));
                    }
                }
            }
        } catch (err) {
            console.error('[SPACE] Failed to fetch space orders:', err);
        }
    }, [notifiedSpaceOrders]);

    // For Regular Users: Check if their order status changed to 'ready'
    const fetchUserOrders = useCallback(async () => {
        const userId = user?._id || user?.id;

        if (!userId) {
            return;
        }

        try {
            const res = await apiGet('/user/orders');

            if (res && res.success) {
                const orders = res.data?.orders || [];

                for (const currentOrder of orders) {
                    const readyKey = `${currentOrder.order_number}-ready`;

                    if (currentOrder.status === 'ready' && !notifiedReadyOrders.has(readyKey)) {
                        orderNotificationService.notifyOrderReady({
                            order_number: currentOrder.order_number,
                            customer_name: user?.name || user?.full_name || 'Customer',
                            total: currentOrder.total
                        });
                        setNotifiedReadyOrders(prev => new Set([...prev, readyKey]));
                    }
                }

                setLastUserOrders(orders);
            }
        } catch (err) {
            console.error('[USER] Failed to fetch user orders:', err);
        }
    }, [user, notifiedReadyOrders]);

    // Start polling
    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        if (isSpaceUser) {
            fetchSpaceOrders();
            pollingIntervalRef.current = setInterval(fetchSpaceOrders, 5000);
        } else if (isRegularUser) {
            fetchUserOrders();
            pollingIntervalRef.current = setInterval(fetchUserOrders, 5000);
        }

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [isAuthenticated, isSpaceUser, isRegularUser, fetchSpaceOrders, fetchUserOrders]);

    const toggleAudio = () => {
        const newValue = !audioEnabled;
        setAudioEnabled(newValue);
        orderNotificationService.setAudioEnabled(newValue);
        localStorage.setItem('order_notification_audio', newValue);

        if (newValue) {
            orderNotificationService.playSimpleBeep();
        }
    };

    const toggleVoice = () => {
        const newValue = !voiceEnabled;
        setVoiceEnabled(newValue);
        orderNotificationService.setVoiceEnabled(newValue);
        localStorage.setItem('order_notification_voice', newValue);

        if (newValue) {
            orderNotificationService.speakMessage('Voice notifications enabled');
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="fixed bottom-6 left-6 z-50">
            <div className="relative">
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-10 h-10 rounded-xl bg-[#111114] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                    <Bell size={18} />
                    {!audioEnabled && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    )}
                </button>

                {showSettings && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#111114] rounded-2xl border border-white/10 p-2 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200">
                        <div className="px-3 py-2 border-b border-white/10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Notification Settings</p>
                        </div>

                        <button
                            onClick={toggleAudio}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-xl transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {audioEnabled ? <Volume2 size={14} className="text-emerald-400" /> : <VolumeX size={14} className="text-red-400" />}
                                <span className="text-xs text-white">Sound Alerts</span>
                            </div>
                            <span className={`text-[10px] ${audioEnabled ? 'text-emerald-400' : 'text-red-400'}`}>
                                {audioEnabled ? 'ON' : 'OFF'}
                            </span>
                        </button>

                        <button
                            onClick={toggleVoice}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-xl transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 18V6M8 10v4M16 10v4" />
                                    <rect x="4" y="8" width="16" height="8" rx="2" />
                                </svg>
                                <span className="text-xs text-white">Voice Alerts</span>
                            </div>
                            <span className={`text-[10px] ${voiceEnabled ? 'text-emerald-400' : 'text-red-400'}`}>
                                {voiceEnabled ? 'ON' : 'OFF'}
                            </span>
                        </button>

                        <div className="px-3 py-2 border-t border-white/10 mt-1">
                            <p className="text-[8px] text-slate-500">
                                {isSpaceUser ? '🔔 New paid orders will alert you' : '🔔 You will be alerted when order is ready for pickup'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderNotificationListener;
