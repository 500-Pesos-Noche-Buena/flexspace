import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Search, Coffee, Wifi, Zap, Clock, Star, ArrowRight } from 'lucide-react';
import { apiGet } from '@/utils/Api';

// Global polling instance for stats heartbeat
let globalStatsPollingInstance = null;

const HowItWorks = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [stats, setStats] = useState({
        totalSpaces: 0,
        totalUsers: 0,
        activeBookings: 0
    });
    const [loading, setLoading] = useState(true);
    
    // Fingerprint for detecting real data changes
    const lastStatsFingerprint = useRef("");

    const steps = [
        { 
            id: '01', 
            title: 'Locate', 
            desc: 'Find a workspace near you with real-time GPS tracking.',
            icon: MapPin,
            color: 'from-indigo-500 to-purple-500',
            bgColor: 'bg-indigo-500/20',
            illustration: '📍'
        },
        { 
            id: '02', 
            title: 'Compare', 
            desc: 'Check prices, amenities, and availability before you go.',
            icon: Search,
            color: 'from-purple-500 to-pink-500',
            bgColor: 'bg-purple-500/20',
            illustration: '🔍'
        },
        { 
            id: '03', 
            title: 'Arrive', 
            desc: 'Check-in instantly and start being productive.',
            icon: Coffee,
            color: 'from-pink-500 to-rose-500',
            bgColor: 'bg-pink-500/20',
            illustration: '☕'
        },
    ];

    // Fetch stats with fingerprint comparison
    const fetchStats = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);
        
        try {
            const response = await apiGet('/landing/stats');
            // console.log("Stats response:", response);
            
            const freshData = {
                totalSpaces: response.data?.totalSpaces || 0,
                totalUsers: response.data?.totalUsers || 0,
                activeBookings: response.data?.activeBookings || 0
            };
            
            const currentFingerprint = JSON.stringify(freshData);
            
            // Only update state if data has actually changed
            if (currentFingerprint !== lastStatsFingerprint.current) {
                lastStatsFingerprint.current = currentFingerprint;
                setStats(freshData);
                
                // if (!isInitial) {
                //     console.log("📊 Real-time Stats Updated:", new Date().toLocaleTimeString());
                //     console.log(`  → Workspaces: ${freshData.totalSpaces}`);
                //     console.log(`  → Active Users: ${freshData.totalUsers}`);
                //     console.log(`  → Active Now: ${freshData.activeBookings}`);
                // }
            } else if (!isInitial) {
                // console.log("🔄 Stats unchanged, skipping re-render:", new Date().toLocaleTimeString());
            }
        } catch (error) {
            // console.error("Error fetching stats:", error);
            if (isInitial) {
                setStats({
                    totalSpaces: 1,
                    totalUsers: 1,
                    activeBookings: 1
                });
            }
        } finally {
            if (isInitial) setLoading(false);
        }
    }, []);

    // Real-time polling with fingerprint
    useEffect(() => {
        // Clear any existing poll before starting a new one
        if (globalStatsPollingInstance) {
            clearInterval(globalStatsPollingInstance);
        }

        // Initial fetch
        fetchStats(true);

        // Set up real-time polling (every 3 seconds for true real-time)
        globalStatsPollingInstance = setInterval(() => {
            // Only fetch when tab is visible to save resources
            if (document.visibilityState === 'visible') {
                fetchStats(false);
            } else {
                // console.log("⏸️ Polling paused (tab inactive)");
            }
        }, 3000); // 3-second real-time heartbeat

        // Cleanup on unmount
        return () => {
            if (globalStatsPollingInstance) {
                clearInterval(globalStatsPollingInstance);
                globalStatsPollingInstance = null;
            }
        };
    }, [fetchStats]);

    // Auto-rotate active step
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % steps.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [steps.length]);

    // Format number with K/M suffix for better display
    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return (
        <section id="how" className="py-12 md:py-24 bg-slate-900 text-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
                
                {/* TEXT CONTENT */}
                <div className="order-2 md:order-1">
                    <div className="inline-block px-3 py-1 mb-4 text-[9px] font-black tracking-widest text-indigo-400 bg-indigo-500/20 rounded-full uppercase">
                        Simple Process
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black mb-6 md:mb-8 leading-tight tracking-tighter">
                        Focus. Work. <br />
                        <span className="text-indigo-400">Accomplish.</span>
                    </h2>
                    
                    <div className="space-y-6 md:space-y-8">
                        {steps.map((step, index) => (
                            <div 
                                key={step.id} 
                                className={`flex gap-4 md:gap-6 group cursor-pointer transition-all duration-300 ${
                                    activeStep === index ? 'translate-x-2' : ''
                                }`}
                                onMouseEnter={() => setActiveStep(index)}
                            >
                                <div className={`font-black text-xl md:text-2xl uppercase shrink-0 transition-all duration-300 ${
                                    activeStep === index ? 'text-indigo-400 scale-110' : 'text-slate-700'
                                }`}>
                                    {step.id}
                                </div>
                                <div>
                                    <h4 className={`font-bold text-base md:text-lg leading-none mb-1 transition-colors duration-300 ${
                                        activeStep === index ? 'text-indigo-400' : 'text-slate-100'
                                    }`}>
                                        {step.title}
                                    </h4>
                                    <p className="text-slate-400 text-[11px] md:text-sm leading-relaxed max-w-70">
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Stats with Real-time Data & Live Indicator */}
                    <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-slate-800">
                        {/* Live Connection Status */}
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Live Data Stream</span>
                            <div className="w-1 h-1 rounded-full bg-slate-600" />
                            <span className="text-[8px] text-slate-600 font-mono">3s heartbeat</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center group">
                                <div className="text-xl md:text-2xl font-black text-indigo-400 transition-all duration-300 group-hover:scale-110">
                                    {loading ? '...' : formatNumber(stats.totalSpaces)}+
                                </div>
                                <div className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-wider">Workspaces</div>
                            </div>
                            <div className="text-center group">
                                <div className="text-xl md:text-2xl font-black text-indigo-400 transition-all duration-300 group-hover:scale-110">
                                    {loading ? '...' : formatNumber(stats.totalUsers)}+
                                </div>
                                <div className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-wider">Active Users</div>
                            </div>
                            <div className="text-center group">
                                <div className="text-xl md:text-2xl font-black text-indigo-400 transition-all duration-300 group-hover:scale-110">
                                    {loading ? '...' : stats.activeBookings}
                                </div>
                                <div className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-wider">Active Now</div>
                            </div>
                        </div>
                        
                        {/* Last Updated Timestamp */}
                        {!loading && (
                            <div className="text-center mt-3">
                                <span className="text-[7px] text-slate-600 font-mono">
                                    last sync: {new Date().toLocaleTimeString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* VISUAL CARD */}
                <div className="order-1 md:order-2">
                    <div className="relative bg-linear-to-br from-slate-800 to-slate-900 h-64 md:h-96 rounded-4xl md:rounded-[2.5rem] border border-slate-700 shadow-2xl overflow-hidden">
                        
                        {/* Animated Background */}
                        <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 via-purple-500/5 to-transparent" />
                        
                        {/* Floating particles */}
                        <div className="absolute inset-0 overflow-hidden">
                            {[...Array(20)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute w-1 h-1 bg-indigo-400/30 rounded-full animate-pulse"
                                    style={{
                                        top: `${Math.random() * 100}%`,
                                        left: `${Math.random() * 100}%`,
                                        animationDelay: `${Math.random() * 3}s`,
                                        animationDuration: `${2 + Math.random() * 3}s`
                                    }}
                                />
                            ))}
                        </div>

                        {/* Live Data Overlay - Shows real-time stats on card */}
                        <div className="absolute top-2 right-2 z-20 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 border border-indigo-500/30">
                            <div className="flex items-center gap-1">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[6px] font-black text-emerald-400 uppercase tracking-wider">LIVE</span>
                            </div>
                        </div>

                        {/* Active Step Illustration */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                            {/* Icon Circle with Pulse Animation when data is live */}
                            <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full bg-linear-to-br ${steps[activeStep].color} flex items-center justify-center mb-4 md:mb-6 shadow-2xl animate-bounce relative`}>
                                {React.createElement(steps[activeStep].icon, { 
                                    size: 40, 
                                    className: "text-white md:w-12 md:h-12",
                                    strokeWidth: 1.5
                                })}
                                {/* Live data pulse ring */}
                                <div className="absolute inset-0 rounded-full border-2 border-indigo-400/50 animate-ping" />
                            </div>

                            {/* Step Title */}
                            <h3 className="text-xl md:text-2xl font-black text-white mb-2 text-center">
                                {steps[activeStep].title}
                            </h3>
                            
                            {/* Step Description */}
                            <p className="text-xs md:text-sm text-slate-300 text-center max-w-64">
                                {steps[activeStep].desc}
                            </p>

                            {/* Real-time Stats Mini Display */}
                            <div className="mt-4 flex gap-4 text-center">
                                <div>
                                    <div className="text-xs font-black text-indigo-400">{loading ? '...' : stats.activeBookings}</div>
                                    <div className="text-[6px] text-slate-500 uppercase">now</div>
                                </div>
                                <div className="w-px h-6 bg-slate-700" />
                                <div>
                                    <div className="text-xs font-black text-indigo-400">{loading ? '...' : formatNumber(stats.totalUsers)}+</div>
                                    <div className="text-[6px] text-slate-500 uppercase">users</div>
                                </div>
                            </div>

                            {/* Progress Dots */}
                            <div className="flex gap-2 mt-4 md:mt-6">
                                {steps.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setActiveStep(index)}
                                        className={`transition-all duration-300 rounded-full ${
                                            activeStep === index 
                                                ? `w-6 h-2 bg-linear-to-r ${steps[index].color}` 
                                                : 'w-2 h-2 bg-slate-700 hover:bg-slate-600'
                                        }`}
                                    />
                                ))}
                            </div>

                            {/* Arrow Hint */}
                            <div className="absolute bottom-4 right-4 opacity-50">
                                <ArrowRight size={16} className="text-slate-500 animate-pulse" />
                            </div>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
                        
                        {/* Top Right Badge */}
                        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md rounded-full px-3 py-1">
                            <div className="flex items-center gap-1">
                                <Wifi size={10} className="text-indigo-400" />
                                <span className="text-[8px] font-bold text-white uppercase">Free WiFi</span>
                            </div>
                        </div>

                        {/* Bottom Left Badge */}
                        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md rounded-full px-3 py-1">
                            <div className="flex items-center gap-1">
                                <Zap size={10} className="text-indigo-400" />
                                <span className="text-[8px] font-bold text-white uppercase">Fast Setup</span>
                            </div>
                        </div>

                        {/* Rating Badge */}
                        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md rounded-full px-3 py-1">
                            <div className="flex items-center gap-1">
                                <Star size={10} className="text-amber-400 fill-amber-400" />
                                <span className="text-[8px] font-bold text-white">4.9</span>
                            </div>
                        </div>

                        {/* Animated Map Pin */}
                        <div className="absolute bottom-12 right-12 animate-bounce">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-md animate-ping" />
                                <MapPin size={24} className="text-indigo-400 relative z-10" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;