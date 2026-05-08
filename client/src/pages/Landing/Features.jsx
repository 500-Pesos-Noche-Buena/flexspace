import React from 'react';
import { Wifi, Building2, Users, Zap, Clock, Shield, ThumbsUp, Monitor, Coffee } from 'lucide-react';

const Features = () => {
    const items = [
        {
            icon: <Wifi className="w-6 h-6 md:w-8 md:h-8" />,
            title: 'Enterprise WiFi',
            desc: 'Verified fiber connections with 100+ Mbps speed in every single hub.',
            color: 'bg-indigo-50 text-indigo-600',
            details: 'Perfect for video calls and large file transfers'
        },
        {
            icon: <Monitor className="w-6 h-6 md:w-8 md:h-8" />,
            title: 'Comfortable Workstations',
            desc: 'Ergonomic chairs and spacious desks for all-day productivity.',
            color: 'bg-teal-50 text-teal-600',
            details: 'Designed for maximum comfort'
        },
        {
            icon: <Building2 className="w-6 h-6 md:w-8 md:h-8" />,
            title: 'Quiet Zones',
            desc: 'Dedicated areas for high-focus deep work and studying.',
            color: 'bg-emerald-50 text-emerald-600',
            details: 'No phone calls, no distractions'
        },
        {
            icon: <Users className="w-6 h-6 md:w-8 md:h-8" />,
            title: 'Community Events',
            desc: 'Networking events, workshops, and meetups regularly.',
            color: 'bg-violet-50 text-violet-600',
            details: 'Connect with fellow professionals'
        },
        {
            icon: <Zap className="w-6 h-6 md:w-8 md:h-8" />,
            title: 'Power Outlets',
            desc: 'Convenient charging stations at every desk.',
            color: 'bg-yellow-50 text-yellow-600',
            details: 'Never run out of battery'
        },
        {
            icon: <Clock className="w-6 h-6 md:w-8 md:h-8" />,
            title: 'Flexible Hours',
            desc: 'Extended operating hours to match your work schedule.',
            color: 'bg-rose-50 text-rose-600',
            details: 'Work when it suits you'
        }
    ];

    return (
        <section id="features" className="py-12 md:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">
                {/* SEO Header Text */}
                <div className="text-center mb-12 md:mb-16">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 tracking-tight">
                        Why Professionals Choose FlexSpace
                    </h2>
                    <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto">
                        Iloilo City's most trusted coworking platform connecting professionals with premium workspaces.
                        From high-speed internet to comfortable seating, we've got you covered.
                    </p>
                </div>

                {/* Features Grid - 6 items (3x2 layout) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {items.map((item, idx) => (
                        <div key={idx} className="group bg-slate-50 rounded-3xl p-6 hover:shadow-xl transition-all duration-300 hover:bg-white">
                            {/* Icon */}
                            <div className={`w-14 h-14 md:w-16 md:h-16 ${item.color} rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300`}>
                                {item.icon}
                            </div>
                            
                            {/* Title */}
                            <h3 className="font-black text-lg md:text-xl mb-2 text-slate-900 tracking-tight">
                                {item.title}
                            </h3>
                            
                            {/* Description */}
                            <p className="text-slate-500 text-sm leading-relaxed mb-2">
                                {item.desc}
                            </p>
                            
                            {/* Additional detail for SEO */}
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                {item.details}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Trust Badge */}
                <div className="text-center mt-12 pt-8 border-t border-slate-100">
                    <div className="flex flex-wrap items-center justify-center gap-6">
                        <div className="flex items-center gap-2">
                            <Shield size={16} className="text-emerald-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Verified Spaces</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ThumbsUp size={16} className="text-emerald-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">100% Satisfaction</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Wifi size={16} className="text-emerald-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Fiber Internet</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Features;