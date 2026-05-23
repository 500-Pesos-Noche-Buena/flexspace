import React, { useEffect, useRef, useState } from 'react';
import { useCookieConsent } from '@/hooks/useCookieConsent'; // Import the hook

const AdSense = ({ slot, format = 'auto', style = {} }) => {
    const adRef = useRef(null);
    const [adLoaded, setAdLoaded] = useState(false);
    const hasConsent = useCookieConsent(); // Check consent status

    useEffect(() => {
        // Only load the ad if they have consented!
        if (hasConsent && !adLoaded && window.adsbygoogle) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                setAdLoaded(true);
            } catch (err) {
                console.error('AdSense error:', err);
            }
        }
    }, [hasConsent, adLoaded]);

    // If no consent, show a placeholder instead of an ad
    if (!hasConsent) {
        return (
            <div className="text-center py-4 text-[10px] text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <span>Ad content hidden until consent is given.</span>
            </div>
        );
    }

    return (
        <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: 'block', ...style }}
            data-ad-client="ca-pub-5613688387404299"
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive="true"
        />
    );
};

export default AdSense;