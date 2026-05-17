import React, { useEffect, useRef, useState } from 'react';

const AdSense = ({ slot, format = 'auto', style = {} }) => {
    const adRef = useRef(null);
    const [adLoaded, setAdLoaded] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        // Check container width before loading ad
        if (adRef.current) {
            const width = adRef.current.parentElement?.offsetWidth || adRef.current.offsetWidth;
            setContainerWidth(width);
        }
    }, []);

    useEffect(() => {
        // Only run on client side, if container has width, and ad not loaded yet
        if (!adLoaded && containerWidth > 200 && adRef.current && window.adsbygoogle) {
            try {
                // Clear any existing content to prevent duplicate errors
                if (adRef.current.hasChildNodes()) {
                    while (adRef.current.firstChild) {
                        adRef.current.removeChild(adRef.current.firstChild);
                    }
                }
                
                // Push new ad
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                setAdLoaded(true);
            } catch (err) {
                console.error('AdSense error:', err);
            }
        }
    }, [containerWidth, adLoaded]);

    // If container is too narrow, don't render the ad
    if (containerWidth > 0 && containerWidth < 200) {
        return (
            <div className="text-center py-3 text-[8px] text-slate-400 bg-slate-100 rounded-xl">
                <span>Advertisement space</span>
            </div>
        );
    }

    return (
        <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ 
                display: 'block', 
                minWidth: '200px',
                minHeight: '90px',
                ...style 
            }}
            data-ad-client="ca-pub-5613688387404299"
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive="true"
        />
    );
};

export default AdSense;