import React from 'react';
import ExplorerView from './ExplorerView';
import TopSpaces from './TopSpaces';
import Features from './Features';
import HowItWorks from './HowItWorks';
import Contact from './Contact';

const LandingPage = () => {
    return (
        <div className="bg-white min-h-screen selection:bg-indigo-100 selection:text-indigo-900">
            {/* 1. HERO SECTION */}
            <div className="relative overflow-hidden pt-10 md:pt-16 pb-12 md:pb-20">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    
                    <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16">
                        <div className="inline-block px-3 py-1 mb-4 text-[9px] font-black tracking-widest text-indigo-600 bg-indigo-50 rounded-full uppercase">
                            Available in Iloilo City
                        </div>
                        {/* Responsive Font Size: 4xl on mobile, 8xl on desktop */}
                        <h1 className="text-4xl sm:text-6xl md:text-8xl font-[1000] text-slate-900 tracking-tight leading-none mb-6">
                            Work anywhere <br className="hidden md:block"/>
                            <span className="text-indigo-600 italic">instantly.</span>
                        </h1>
                        <p className="text-sm md:text-xl text-slate-500 font-medium px-4">
                            Join 2,000+ Ilonggo professionals using the most reliable workspace map.
                        </p>
                    </div>
                    
                    {/* The "Floating App" - Responsive Radius */}
                    <div className="relative group max-w-5xl mx-auto">
                        <div className="absolute -inset-1 bg-indigo-500/10 rounded-2xl md:rounded-[3.5rem] blur"></div>
                        <div className="relative bg-white rounded-2xl md:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                            {/* Ensure ExplorerView inside is also responsive */}
                            <div className="overflow-x-auto">
                                <ExplorerView />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sections below scaled for mobile */}
            <div className="px-4 md:px-0">
                <Features />
                <TopSpaces />
                <HowItWorks />
            </div>

            <Contact />
        </div>
    );
};

export default LandingPage;