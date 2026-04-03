import React from 'react';
import { Outlet } from 'react-router-dom';
import { MapPin, Coffee, Laptop, Zap } from 'lucide-react';

const AuthLayout = () => {
    return (
        <div className="grid min-h-screen lg:grid-cols-2 bg-background font-sans antialiased">

            {/* LEFT SIDE: Form Content Area */}
            <main className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-950">
                <div className="w-full max-w-[400px] space-y-6">
                    {/* Mobile-only Logo */}
                    <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
                        <div className="bg-primary p-2 rounded-lg">
                            <MapPin className="text-primary-foreground" size={20} />
                        </div>
                        <span className="font-bold text-xl tracking-tight">IloiloWork</span>
                    </div>

                    <Outlet />
                </div>
            </main>

            {/* RIGHT SIDE: Branding Panel */}
            <section className="hidden lg:flex relative bg-slate-900 items-center justify-center p-12 overflow-hidden">
                {/* Modern Dot Pattern Background */}
                <div className="absolute inset-0 z-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
                    <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="dot-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                                <circle cx="2" cy="2" r="1" fill="#94a3b8" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#dot-pattern)" />
                    </svg>
                </div>

                {/* Floating Gradient Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10 w-full max-w-md">
                    <div className="space-y-8 text-center lg:text-left">

                        {/* Glassmorphism Icon Box */}
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl mb-4">
                            <MapPin size={32} className="text-indigo-400" />
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
                                Work where <br />
                                <span className="text-indigo-400">you thrive.</span>
                            </h1>
                            <p className="text-slate-400 text-lg leading-relaxed">
                                Join the community of remote workers and students in Iloilo’s most inspiring spaces.
                            </p>
                        </div>

                        {/* Feature Pills */}
                        <div className="flex flex-wrap gap-3 pt-4">
                            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium">
                                <Coffee size={14} className="text-indigo-400" /> Cafes
                            </span>
                            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium">
                                <Laptop size={14} className="text-indigo-400" /> Co-working
                            </span>
                            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium">
                                <Zap size={14} className="text-indigo-400" /> Fiber WiFi
                            </span>
                        </div>
                    </div>
                </div>

                {/* Subtle Bottom Attribution */}
                <div className="absolute bottom-10 left-12 flex items-center gap-4 text-slate-500 text-xs font-semibold tracking-[0.2em] uppercase">
                    <span>Focus</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                    <span>Connect</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                    <span>Build</span>
                </div>
            </section>
        </div>
    );
};

export default AuthLayout;