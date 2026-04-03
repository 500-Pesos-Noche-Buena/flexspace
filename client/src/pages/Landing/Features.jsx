import React from 'react';
import { Wifi, Coffee, Building2 } from 'lucide-react';

const Features = () => {
    const items = [
        {
            icon: <Wifi className="w-6 h-6 md:w-8 md:h-8" />, // Smaller icons on mobile
            title: 'Fast WiFi',
            desc: 'Verified fiber connections in every single hub.',
            color: 'bg-indigo-50 text-indigo-600'
        },
        {
            icon: <Coffee className="w-6 h-6 md:w-8 md:h-8" />,
            title: 'Free Coffee',
            desc: 'Stay caffeinated with unlimited local brews.',
            color: 'bg-amber-50 text-amber-600'
        },
        {
            icon: <Building2 className="w-6 h-6 md:w-8 md:h-8" />,
            title: 'Quiet Zones',
            desc: 'Dedicated areas for high-focus deep work.',
            color: 'bg-emerald-50 text-emerald-600'
        }
    ];

    return (
        // Reduced py-12 for mobile, py-24 for desktop
        <section id="features" className="py-12 md:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">
                {/* Reduced gap from 12 to 8 for mobile */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
                    {items.map((item, idx) => (
                        <div key={idx} className="group">
                            {/* Icon container: w-16 on mobile, w-20 on desktop */}
                            <div className={`w-16 h-16 md:w-20 md:h-20 ${item.color} rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6 transition-transform group-hover:scale-110 duration-300 shadow-sm`}>
                                {item.icon}
                            </div>
                            <h3 className="font-black text-lg md:text-xl mb-1 md:mb-2 text-slate-900 tracking-tight">
                                {item.title}
                            </h3>
                            <p className="text-slate-500 text-[11px] md:text-sm leading-relaxed max-w-60 md:max-w-62.5 mx-auto">
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;