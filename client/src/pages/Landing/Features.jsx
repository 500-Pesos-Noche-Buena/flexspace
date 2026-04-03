import React from 'react';
import { Wifi, Coffee, Building2 } from 'lucide-react';

const Features = () => {
    const items = [
        {
            icon: <Wifi className="w-8 h-8" />,
            title: 'Fast WiFi',
            desc: 'Verified fiber connections in every single hub.',
            color: 'bg-indigo-50 text-indigo-600'
        },
        {
            icon: <Coffee className="w-8 h-8" />,
            title: 'Free Coffee',
            desc: 'Stay caffeinated with unlimited local brews.',
            color: 'bg-amber-50 text-amber-600'
        },
        {
            icon: <Building2 className="w-8 h-8" />,
            title: 'Quiet Zones',
            desc: 'Dedicated areas for high-focus deep work.',
            color: 'bg-emerald-50 text-emerald-600'
        }
    ];

    return (
        <section id="features" className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid md:grid-cols-3 gap-12 text-center">
                    {items.map((item, idx) => (
                        <div key={idx} className="group">
                            <div className={`w-20 h-20 ${item.color} rounded-3xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 duration-300 shadow-sm`}>
                                {item.icon}
                            </div>
                            <h3 className="font-bold text-xl mb-2 text-slate-900">{item.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed max-w-62.5 mx-auto">
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