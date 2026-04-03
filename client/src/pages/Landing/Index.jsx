import React from 'react';
import ExplorerView from './ExplorerView';
import TopSpaces from './TopSpaces';
import Features from './Features';
import HowItWorks from './HowItWorks';
import Contact from './Contact';

const LandingPage = () => {
    return (
        <div className="bg-white min-h-screen selection:bg-indigo-100 selection:text-indigo-900">
            {/* 1. HERO & APP SECTION */}
            <div className="relative overflow-hidden pt-16 pb-20">
                {/* Subtle Background Blobs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-150 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-indigo-50/50 via-white to-transparent -z-10" />
                
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className="inline-block px-4 py-1.5 mb-6 text-[10px] font-black tracking-[0.2em] text-indigo-600 bg-indigo-50 rounded-full uppercase">
                            Available in Iloilo City
                        </div>
                        <h1 className="text-6xl md:text-8xl font-[1000] text-slate-900 tracking-[-0.05em] leading-[0.9] mb-8">
                            Work anywhere <br/>
                            <span className="text-indigo-600 italic">instantly.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed">
                            Stop searching for WiFi and outlets. Join 2,000+ Ilonggo professionals using the most reliable workspace map.
                        </p>
                    </div>
                    
                    {/* The "Floating App" Design */}
                    <div className="relative group">
                        {/* Decorative Glow */}
                        <div className="absolute -inset-1 bg-linear-to-r from-indigo-500 to-purple-600 rounded-[3.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                        
                        <div className="relative bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden">
                            <ExplorerView />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. VALUE PROPOSITION */}
            <div className="bg-slate-50/50 border-y border-slate-100">
                <Features />
            </div>

            {/* 3. SOCIAL PROOF / TOP SPACES */}
            <TopSpaces />

            {/* 4. GUIDANCE */}
            <div className="relative">
                 <div className="absolute top-0 left-0 w-full h-24 bg-linear-to-b from-white to-transparent"></div>
                 <HowItWorks />
            </div>

            {/* 5. FOOTER CTA */}
            <Contact />

            {/* SIMPLE FOOTER */}
            <footer className="py-12 border-t border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    © 2026 Iloilo City Work • Built for Deep Work
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;