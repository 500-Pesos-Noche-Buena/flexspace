import React, { useState, useEffect } from 'react';
import ExplorerView from './ExplorerView';
import TopSpaces from './TopSpaces';
import Features from './Features';
import HowItWorks from './HowItWorks';
import Contact from './Contact';
import CustomerReviews from './CustomerReviews';
import AdSense from '@/components/ads/AdSense'; // Import AdSense component
import { apiGet } from '@/utils/Api';

const LandingPage = () => {
    const [popularSpaces, setPopularSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalSpaces: 0,
        activeBookings: 0
    });
    const [statsLoading, setStatsLoading] = useState(true);

    // Format number with K/M suffix
    const formatNumber = (num) => {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [spacesRes, statsRes] = await Promise.all([
                    apiGet('/landing/explorer'),
                    apiGet('/landing/stats')
                ]);

                const spaces = spacesRes.data?.spaces || spacesRes.spaces || [];
                setPopularSpaces(spaces);

                if (statsRes.data) {
                    setStats({
                        totalUsers: statsRes.data.totalUsers || 0,
                        totalSpaces: statsRes.data.totalSpaces || 0,
                        activeBookings: statsRes.data.activeBookings || 0
                    });
                }
                setStatsLoading(false);
            } catch (error) {
                console.error("Error fetching data:", error);
                setStatsLoading(false);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Real-time stats polling every 10 seconds
        const interval = setInterval(async () => {
            try {
                const statsRes = await apiGet('/landing/stats');
                if (statsRes.data) {
                    setStats({
                        totalUsers: statsRes.data.totalUsers || 0,
                        totalSpaces: statsRes.data.totalSpaces || 0,
                        activeBookings: statsRes.data.activeBookings || 0
                    });
                }
            } catch (error) {
                console.error("Stats polling error:", error);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            {/* 1. HERO SECTION */}
            <div className="relative overflow-hidden pt-10 md:pt-16 pb-12 md:pb-20">
                <div className="max-w-7xl mx-auto px-4 md:px-6">

                    <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16">
                        <div className="inline-block px-3 py-1 mb-4 text-[9px] font-black tracking-widest text-indigo-600 bg-indigo-50 rounded-full uppercase">
                            Available in Iloilo City
                        </div>
                        <h1 className="text-4xl sm:text-6xl md:text-8xl font-[1000] text-slate-900 tracking-tight leading-none mb-6">
                            Work anywhere <br className="hidden md:block" />
                            <span className="text-indigo-600 italic">instantly.</span>
                        </h1>

                        {/* DYNAMIC USER COUNT - REAL TIME */}
                        <p className="text-sm md:text-xl text-slate-500 font-medium px-4 flex items-center justify-center gap-2 flex-wrap">
                            Join{' '}
                            <span className="relative">
                                <span className="font-black text-2xl md:text-3xl text-indigo-600">
                                    {loading || statsLoading ? (
                                        <span className="inline-flex items-center gap-1">
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75" />
                                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150" />
                                        </span>
                                    ) : (
                                        `${formatNumber(stats.totalUsers)}+`
                                    )}
                                </span>
                                {!loading && !statsLoading && stats.totalUsers > 0 && (
                                    <span className="absolute -top-1 -right-3 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                )}
                            </span>
                            {' '}Ilonggo professionals using the most reliable workspace map.
                        </p>

                        {/* SEO TEXT FOR GOOGLE ADSENSE */}
                        <div className="mt-6 max-w-2xl mx-auto">
                            <p className="text-xs text-slate-400 leading-relaxed">
                                FlexSpace is Iloilo City's premier coworking space aggregator, connecting remote workers,
                                freelancers, and students with the best study hubs and professional workspaces across
                                Molo, Jaro, City Proper, and nearby districts. Find your perfect workspace today!
                            </p>
                        </div>
                    </div>

                    <div className="relative group max-w-7xl mx-auto">
                        <div className="absolute -inset-1 bg-indigo-500/10 rounded-2xl md:rounded-[3.5rem] blur"></div>
                        <div className="relative bg-white rounded-2xl md:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <ExplorerView />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== AD #1 - AFTER HERO SECTION ========== */}
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                    <p className="text-[8px] text-slate-400 uppercase tracking-widest mb-2">Advertisement</p>
                    <AdSense slot="9802964286" />
                </div>
            </div>

            {/* ADDITIONAL SEO CONTENT SECTION - Helps AdSense */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-slate-50 p-6 rounded-3xl">
                        <h2 className="text-xl font-black mb-3 text-slate-900">Why Ilonggos Choose FlexSpace</h2>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            With over {loading || statsLoading ? '2,000' : formatNumber(stats.totalUsers)}+ active users and 
                            {loading || statsLoading ? ' 50' : ` ${stats.totalSpaces}`}+ premium spaces, FlexSpace has become 
                            the go-to platform for finding quality coworking spaces in Iloilo City. Our real-time 
                            availability, transparent pricing, and verified reviews ensure you find the perfect 
                            workspace for your needs.
                        </p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl">
                        <h2 className="text-xl font-black mb-3 text-slate-900">Trusted by the Iloilo Community</h2>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            From students needing quiet study areas to professionals requiring high-speed internet 
                            for video calls, FlexSpace caters to all. Our platform features spaces with fast WiFi, 
                            comfortable seating, free coffee, and 24/7 access options across Iloilo City districts.
                        </p>
                    </div>
                </div>
            </div>

            {/* ========== AD #2 - BEFORE FEATURES ========== */}
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                    <p className="text-[8px] text-slate-400 uppercase tracking-widest mb-2">Advertisement</p>
                    <AdSense slot="9802964286" />
                </div>
            </div>

            {/* Sections below */}
            <div className="px-4 md:px-0">
                <Features />
                
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="animate-pulse">
                            <div className="w-12 h-12 mx-auto bg-slate-200 rounded-full mb-4"></div>
                            <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Loading spaces...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <TopSpaces spaces={popularSpaces} />
                        
                        {/* ========== AD #3 - AFTER TOP SPACES ========== */}
                        <div className="max-w-7xl mx-auto px-4 py-4">
                            <div className="bg-slate-50 rounded-2xl p-4 text-center">
                                <p className="text-[8px] text-slate-400 uppercase tracking-widest mb-2">Advertisement</p>
                                <AdSense slot="9802964286" />
                            </div>
                        </div>
                    </>
                )}

                {/* Customer Reviews Section */}
                <CustomerReviews />

                {/* ========== AD #4 - AFTER REVIEWS ========== */}
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                        <p className="text-[8px] text-slate-400 uppercase tracking-widest mb-2">Advertisement</p>
                        <AdSense slot="9802964286" />
                    </div>
                </div>

                {/* How It Works */}
                <HowItWorks />
            </div>

            <Contact />
        </div>
    );
};

export default LandingPage;