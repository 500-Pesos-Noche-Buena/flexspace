import React, { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasAccepted = localStorage.getItem('cookieConsent');
        if (!hasAccepted) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookieConsent', 'true');
        setIsVisible(false);
        window.location.reload(); 
    };

    const handleDecline = () => {
        localStorage.setItem('cookieConsent', 'false');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-6 w-[calc(100%-3rem)] md:w-112.5 bg-[#0f0f12] border border-white/10 p-5 rounded-2xl shadow-2xl z-9999 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-10 duration-500">            <div className="flex gap-4">
            <div className="w-10 h-10 shrink-0 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                <Cookie className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
                <h4 className="text-sm font-bold text-white mb-1">Cookie Policy</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                    We use cookies to improve your experience and for marketing.
                    Read our <a href="/privacy" className="text-indigo-400 underline underline-offset-2">cookie policy</a> or manage your settings below.
                </p>
            </div>
        </div>

            <div className="flex gap-2">
                <button
                    onClick={handleAccept}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
                >
                    Accept All
                </button>
                <button
                    onClick={handleDecline}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-lg transition-all"
                >
                    Decline
                </button>
            </div>
        </div>
    );
};

export default CookieConsent;