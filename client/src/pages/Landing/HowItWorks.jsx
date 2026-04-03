import React from 'react';

const HowItWorks = () => {
    const steps = [
        { id: '01', title: 'Locate', desc: 'Find a space near you via GPS.' },
        { id: '02', title: 'Compare', desc: 'Check prices and amenities.' },
        { id: '03', title: 'Arrive', desc: 'Show up and start being productive.' },
    ];

    return (
        <section id="how" className="py-24 bg-slate-900 text-white">
            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
                <div>
                    <h2 className="text-4xl font-black mb-8 leading-tight tracking-tighter">
                        Focus. Work. <br />
                        <span className="text-indigo-400">Accomplish.</span>
                    </h2>
                    <div className="space-y-8">
                        {steps.map((step) => (
                            <div key={step.id} className="flex gap-6 group">
                                <div className="font-black text-2xl text-slate-700 uppercase group-hover:text-indigo-400 transition-colors">
                                    {step.id}
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-slate-100">{step.title}</h4>
                                    <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Placeholder for Illustration or Map Image */}
                <div className="bg-slate-800 h-80 rounded-[2.5rem] border border-slate-700 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 to-transparent" />
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;