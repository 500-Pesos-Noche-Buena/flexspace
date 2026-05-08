import React, { useEffect, useRef } from 'react';

const AdSense = ({ slot, format = 'auto', style = {} }) => {
    const adRef = useRef(null);

    useEffect(() => {
        // Only run on client side and if ad container exists
        if (adRef.current && window.adsbygoogle) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (err) {
                console.error('AdSense error:', err);
            }
        }
    }, []);

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