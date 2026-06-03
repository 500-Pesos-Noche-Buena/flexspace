import React, { useState, useEffect } from 'react';
import { Bell, Volume2, VolumeX, CheckCircle, XCircle, X } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';

const NotificationPermission = ({ onPermissionGranted }) => {
    const [permission, setPermission] = useState(Notification.permission);
    const [audioAllowed, setAudioAllowed] = useState(false);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        // Check if notification permission is already granted
        if (Notification.permission === 'granted') {
            setPermission('granted');
            onPermissionGranted?.(true);
        }
    }, [onPermissionGranted]);

    const requestNotificationPermission = async () => {
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            
            if (result === 'granted') {
                showToast({
                    icon: 'success',
                    title: 'Notifications Enabled',
                    text: 'You will now receive order updates'
                });
                onPermissionGranted?.(true);
                
                // Test notification
                new Notification('🔔 Notifications Enabled', {
                    body: 'You will now receive real-time order updates',
                    icon: '/favicon.ico',
                    silent: true
                });
                
                // Hide the notification banner after permission is granted
                setVisible(false);
            } else {
                showToast({
                    icon: 'warning',
                    title: 'Notifications Blocked',
                    text: 'Please enable notifications in browser settings'
                });
            }
        } catch (err) {
            console.error('Notification permission error:', err);
        }
    };

    const requestAudioPermission = async () => {
        try {
            // Test if audio can be played
            const audio = new Audio();
            audio.volume = 0.5;
            setAudioAllowed(true);
            showToast({
                icon: 'success',
                title: 'Sound Enabled',
                text: 'You will hear order alerts'
            });
        } catch (err) {
            console.error('Audio permission error:', err);
        }
    };

    const handleLater = () => {
        setVisible(false);
    };

    const handleClose = () => {
        setVisible(false);
    };

    if (permission === 'granted' || !visible) {
        return null;
    }

    return (
        <div className="fixed bottom-24 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="bg-[#111114] rounded-2xl border border-white/10 p-4 shadow-2xl max-w-sm relative">
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
                <div className="flex items-start gap-3 pr-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                        <Bell size={20} className="text-indigo-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-white font-bold text-sm">Enable Notifications</p>
                        <p className="text-slate-400 text-xs mt-1">
                            Get real-time updates when your order status changes
                        </p>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={requestNotificationPermission}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-xs font-bold transition-all"
                            >
                                Allow Notifications
                            </button>
                            <button
                                onClick={handleLater}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 text-xs font-bold transition-all"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationPermission;