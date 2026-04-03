import React from 'react';

const HowItWorks = () => {
    const steps = [
        { id: '01', title: 'Locate', desc: 'Find a space near you via GPS.' },
        { id: '02', title: 'Compare', desc: 'Check prices and amenities.' },
        { id: '03', title: 'Arrive', desc: 'Show up and start being productive.' },
    ];

    return (
        // py-12 for mobile, py-24 for desktop
        <section id="how" className="py-12 md:py-24 bg-slate-900 text-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
                
                {/* TEXT CONTENT */}
                <div className="order-2 md:order-1">
                    <h2 className="text-3xl md:text-4xl font-black mb-6 md:mb-8 leading-tight tracking-tighter">
                        Focus. Work. <br />
                        <span className="text-indigo-400">Accomplish.</span>
                    </h2>
                    
                    {/* Tightened space-y for mobile */}
                    <div className="space-y-6 md:space-y-8">
                        {steps.map((step) => (
                            <div key={step.id} className="flex gap-4 md:gap-6 group">
                                <div className="font-black text-xl md:text-2xl text-slate-700 uppercase group-hover:text-indigo-400 transition-colors shrink-0">
                                    {step.id}
                                </div>
                                <div>
                                    <h4 className="font-bold text-base md:text-lg text-slate-100 leading-none mb-1">
                                        {step.title}
                                    </h4>
                                    <p className="text-slate-400 text-[11px] md:text-sm leading-relaxed max-w-70">
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* VISUAL CARD (Fixed height for mobile) */}
                <div className="order-1 md:order-2 bg-slate-800 h-48 md:h-80 rounded-4xl md:rounded-[2.5rem] border border-slate-700 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-br from-indigo-500/20 to-transparent" />
                    
                    {/* Mini Decorative Element to fill the space on mobile */}
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                    <div className="flex items-center justify-center h-full text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-50">
                        Visual Graphics Here
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;