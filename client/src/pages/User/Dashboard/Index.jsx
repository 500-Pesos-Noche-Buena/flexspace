import React, { useState, useEffect, useRef } from 'react';
import { apiGet } from '@/utils/Api';
import {
    MapPin, Calendar, Star,
    ArrowRight, Zap, Loader2, RefreshCw, Coins, Clock, TrendingUp, Sparkles, ChevronLeft, ChevronRight
} from 'lucide-react';
import ExplorerView from '@/pages/Landing/ExplorerView';
import { useAuth } from '@/context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/** --- LOADING COMPONENT --- **/
const LoadingSpinner = () => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="relative">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-3 sm:border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
            <Zap size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
        </div>
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] italic">Syncing Hub...</p>
    </div>
);

/** --- HORIZONTAL SCROLL COMPONENT --- **/
const HorizontalScroll = ({ children, title, onViewAll, viewAllLink }) => {
    const scrollContainerRef = useRef(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = direction === 'left' ? -300 : 300;
            scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowLeftArrow(scrollLeft > 20);
            setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 20);
        }
    };

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScroll);
            checkScroll();
            return () => container.removeEventListener('scroll', checkScroll);
        }
    }, [children]);

    return (
        <div className="relative">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        {title === "Workspace Explorer" ? (
                            <MapPin size={16} className="text-indigo-600 sm:w-5 sm:h-5" />
                        ) : (
                            <TrendingUp size={16} className="text-indigo-600 sm:w-5 sm:h-5" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black uppercase italic text-slate-900 tracking-tight">
                            {title}
                        </h2>
                        <p className="text-[8px] sm:text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline mt-0.5 sm:mt-1">
                            <a href={viewAllLink}>View All Hubs —</a>
                        </p>
                    </div>
                </div>

                {/* Navigation Arrows */}
                <div className="hidden sm:flex gap-2">
                    <button
                        onClick={() => scroll('left')}
                        className={`p-2 rounded-full border border-slate-200 transition-all ${showLeftArrow ? 'bg-white text-slate-700 hover:bg-indigo-50 hover:border-indigo-200' : 'opacity-30 cursor-not-allowed'}`}
                        disabled={!showLeftArrow}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className={`p-2 rounded-full border border-slate-200 transition-all ${showRightArrow ? 'bg-white text-slate-700 hover:bg-indigo-50 hover:border-indigo-200' : 'opacity-30 cursor-not-allowed'}`}
                        disabled={!showRightArrow}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Horizontal Scroll Container */}
            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto scrollbar-hide gap-4 sm:gap-6 pb-4 -mx-4 px-4 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {children}
            </div>

            {/* Mobile swipe hint */}
            <div className="flex justify-center mt-3 sm:hidden">
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                </div>
                <p className="text-[7px] text-slate-400 ml-2">Swipe to see more →</p>
            </div>
        </div>
    );
};

/** --- STAT BOX COMPONENT --- **/
const StatBox = ({ label, value, color, icon: Icon, subtitle, tooltip }) => (
    <div className="bg-white border border-slate-100 p-3 sm:p-4 rounded-2xl sm:rounded-3xl text-center hover:border-indigo-200 transition-all cursor-default shadow-sm hover:shadow-md group relative">
        <div className="flex items-center justify-center mb-1.5 sm:mb-2">
            {Icon && <Icon size={16} className={`${color} opacity-70 group-hover:opacity-100 transition-opacity sm:w-5 sm:h-5`} />}
        </div>
        <h3 className={`text-xl sm:text-2xl font-[1000] ${color} tracking-tighter`}>{value}</h3>
        <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
        {subtitle && (
            <p className="text-[6px] sm:text-[7px] text-slate-300 font-bold uppercase tracking-wider mt-0.5">{subtitle}</p>
        )}
        {tooltip && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[7px] sm:text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 hidden sm:block">
                {tooltip}
            </div>
        )}
    </div>
);

/** --- SPACE CARD COMPONENT (Mobile Optimized) --- **/
const SpaceCard = ({ name, location, price, rating, image, userId, tags = [] }) => {
    const imageUrl = image ? `${API_BASE_URL}/uploads/spaces/${userId}/${image}` : null;

    return (
        <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-[2.5rem] overflow-hidden hover:border-indigo-100 transition-all group cursor-pointer shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 h-full flex flex-col">
            {/* Image Container - Responsive height */}
            <div className="relative h-40 sm:h-48 bg-slate-100 overflow-hidden">
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 px-2 py-0.5 sm:px-3 sm:py-1 bg-white/90 backdrop-blur-md rounded-full z-10 text-[8px] sm:text-[9px] font-black text-slate-900 uppercase tracking-widest border border-slate-100 shadow-sm">
                    ₱{price}/hr
                </div>
                <img
                    src={imageUrl}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder.jpg';
                    }}
                />
                {/* Rating overlay on mobile */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full sm:hidden">
                    <Star size={10} fill="currentColor" className="text-amber-400" />
                    <span className="text-[10px] font-black text-white">{rating}</span>
                </div>
            </div>

            <div className="p-4 sm:p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-slate-900 font-[1000] uppercase text-xs sm:text-sm tracking-tight truncate">
                            {name}
                        </h3>
                        <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                            <MapPin size={9} className="text-indigo-600 shrink-0" />
                            <span className="truncate">{location}</span>
                        </p>
                    </div>
                    {/* Desktop rating - hidden on mobile */}
                    <div className="hidden sm:flex items-center gap-1 text-amber-500 shrink-0">
                        <Star size={12} fill="currentColor" />
                        <span className="text-xs font-black">{rating}</span>
                    </div>
                </div>

                {/* Tags - Horizontal scroll on mobile */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                    {tags && tags.length > 0 ? (
                        tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 sm:px-3 sm:py-1 bg-slate-50 rounded-lg text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
                                {tag}
                            </span>
                        ))
                    ) : (
                        <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-slate-50 rounded-lg text-[7px] sm:text-[8px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">
                            Workspace
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

/** --- STICKY CHECK-IN BUTTON (Mobile Optimized) --- **/
const StickyCheckIn = ({ show, onClick }) => (
    <div className={`fixed bottom-20 sm:bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-[90%] max-w-md z-50 transition-all duration-500 ease-in-out ${show ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
        <div className="bg-white rounded-2xl sm:rounded-[2.5rem] p-3 sm:p-4 flex items-center justify-between shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 sm:gap-4 ml-1 sm:ml-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                    <Calendar size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div>
                    <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Booking</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight italic">Ready for session</p>
                </div>
            </div>
            <button
                onClick={onClick}
                className="px-5 py-2.5 sm:px-8 sm:py-4 bg-indigo-600 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] sm:hover:scale-[1.03] transition-all shadow-lg shadow-indigo-600/20 active:scale-95 whitespace-nowrap"
            >
                Check In
            </button>
        </div>
    </div>
);

/** --- POINTS INFO BANNER --- **/
const PointsInfoBanner = ({ pointsValue, pointsValueInPesos, redemptionRatio, minPoints }) => (
    <div className="mt-4 inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
        <Coins size={12} className="text-amber-600" />
        <span className="text-[8px] sm:text-[9px] font-black uppercase text-amber-700">
            {pointsValue} points = ₱{pointsValueInPesos} savings
        </span>
        <span className="text-[6px] sm:text-[7px] text-amber-500">
            ({redemptionRatio} pts = ₱1 | min {minPoints} to redeem)
        </span>
    </div>
);

/** --- MAIN DASHBOARD --- **/
const UserDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showSticky, setShowSticky] = useState(true);

    const [stats, setStats] = useState({
        bookings: '00',
        hours: '00',
        points: '000',
        pointsValue: 0,
        hoursValue: 0,
        pointsValueInPesos: 0,
        redemptionRatio: 20,
        minPoints: 100
    });

    const [trending, setTrending] = useState([]);
    const [greeting, setGreeting] = useState({ hiligaynon: 'Maayong Adlaw', english: 'Good Day' });

    const lastDataFingerprint = useRef("");

    const fetchDashboardData = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        else setIsSyncing(true);

        try {
            const res = await apiGet('/user/dashboard');
            const freshData = res.data || res;

            const currentFingerprint = JSON.stringify(freshData);
            if (currentFingerprint !== lastDataFingerprint.current) {
                lastDataFingerprint.current = currentFingerprint;

                const totalBookings = parseInt(freshData.stats?.total_bookings) || 0;
                const totalHours = parseInt(freshData.stats?.total_hours) || 0;
                const loyaltyPoints = parseInt(freshData.stats?.loyalty_points) || 0;

                setStats({
                    bookings: String(totalBookings).padStart(2, '0'),
                    hours: String(totalHours).padStart(2, '0'),
                    points: String(loyaltyPoints).padStart(3, '0'),
                    pointsValue: loyaltyPoints,
                    hoursValue: totalHours,
                    pointsValueInPesos: freshData.stats?.points_value || 0,
                    redemptionRatio: freshData.stats?.redemption_ratio || 20,
                    minPoints: freshData.stats?.min_points || 100
                });

                setTrending(freshData.trending || []);
            }
        } catch (err) {
            console.error("Sync Error:", err);
        } finally {
            setLoading(false);
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        // Greeting Logic
        const hour = new Date().getHours();
        if (hour < 12) setGreeting({ hiligaynon: 'Maayong Buntag', english: 'Good Morning' });
        else if (hour < 18) setGreeting({ hiligaynon: 'Maayong Hapon', english: 'Good Afternoon' });
        else setGreeting({ hiligaynon: 'Maayong Gab-i', english: 'Good Evening' });

        fetchDashboardData(true);

        const handleScroll = () => {
            if (window.scrollY > 150 && window.scrollY < 1000) {
                setShowSticky(false);
            } else {
                setShowSticky(true);
            }
        };

        window.addEventListener('scroll', handleScroll);
        const handleFocus = () => fetchDashboardData(false);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    if (loading) return <LoadingSpinner />;

    const potentialSavings = stats.pointsValue;
    const avgHoursPerBooking = stats.bookings !== '00' && parseInt(stats.bookings) > 0
        ? (stats.hoursValue / parseInt(stats.bookings)).toFixed(1)
        : 0;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 sm:pb-32 selection:bg-indigo-100 animate-in fade-in duration-700">

            {/* 1. WELCOME HEADER */}
            <section className="pt-6 sm:pt-8 pb-8 sm:pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-8">
                    <div className="relative">
                        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 sm:mb-6 rounded-full bg-indigo-50 border border-indigo-100">
                            <Zap size={10} className={`text-indigo-600 fill-indigo-600 ${isSyncing ? 'animate-pulse' : ''}`} />
                            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                {isSyncing ? 'Syncing...' : 'Deep Work Mode'}
                            </span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[1000] italic tracking-tighter uppercase leading-[0.85] mb-3 sm:mb-4 text-slate-900">
                            {greeting.hiligaynon}, <br />
                            <span className="text-indigo-600 wrap-break-word">{user?.name?.split(' ')[0] || 'User'}.</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md">
                            Ready to stay productive in {greeting.english.toLowerCase()}?
                        </p>

                        {stats.pointsValue > 0 && <PointsInfoBanner
                            pointsValue={stats.pointsValue}
                            pointsValueInPesos={stats.pointsValueInPesos}
                            redemptionRatio={stats.redemptionRatio}
                            minPoints={stats.minPoints}
                        />}
                    </div>

                    {/* Stats Grid - Mobile: 3 columns, Desktop: auto */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full lg:w-auto">
                        <StatBox
                            label="Bookings"
                            value={stats.bookings}
                            color="text-indigo-600"
                            icon={Calendar}
                            tooltip={`${parseInt(stats.bookings)} total sessions`}
                        />
                        <StatBox
                            label="Hrs Saved"
                            value={stats.hours}
                            color="text-emerald-600"
                            icon={Clock}
                            subtitle={avgHoursPerBooking > 0 ? `avg ${avgHoursPerBooking}h` : ''}
                            tooltip={`${stats.hoursValue} total hours worked`}
                        />
                        <StatBox
                            label="Points"
                            value={stats.points}
                            color="text-amber-600"
                            icon={Coins}
                            subtitle={`₱${stats.pointsValueInPesos}`}
                            tooltip={`${stats.redemptionRatio} pts = ₱1 | Min ${stats.minPoints} pts`}
                        />
                    </div>
                </div>
            </section>

            {/* 2. EXPLORER HUB - Mobile Optimized */}
            <section className="px-4 sm:px-6 mb-12 sm:mb-20 max-w-7xl mx-auto">
                <div className="relative bg-white border border-slate-100 rounded-2xl sm:rounded-[3rem] overflow-hidden shadow-xl shadow-indigo-900/5">
                    <div className="p-4 sm:p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                        <div className="text-center sm:text-left">
                            <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-widest">Workspace Explorer</h2>
                            <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">
                                Live availability in Iloilo
                            </p>
                        </div>
                        {/* <div className="flex bg-slate-50 p-1 rounded-xl sm:rounded-2xl border border-slate-100 self-center sm:self-auto">
                            <button className="px-4 py-1.5 sm:px-6 sm:py-2.5 bg-indigo-600 text-white rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg">
                                List View
                            </button>
                            <button className="px-4 py-1.5 sm:px-6 sm:py-2.5 text-slate-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest hover:text-slate-900 transition-all">
                                Map View
                            </button>
                        </div> */}
                    </div>
                    <div className="min-h-75 sm:min-h-112.5">
                        <ExplorerView />
                    </div>
                </div>
            </section>

            {/* 3. TRENDING SPACES - Horizontal Scroll */}
            <section className="px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden">
                <HorizontalScroll
                    title="Trending Now"
                    viewAllLink="/user/space"
                >
                    {trending.length > 0 ? trending.map((space) => (
                        /* ADD THIS WRAPPER DIV */
                        <div key={space._id} className="w-70 sm:w-87.5 shrink-0 snap-start">
                            <SpaceCard
                                name={space.name}
                                location={space.location}
                                price={space.rate_hour}
                                rating={space.rating || 4.5}
                                tags={space.amenities}
                                image={space.image}
                                userId={space.user_id}
                            />
                        </div>
                    )) : (
                        <div className="w-full py-16 text-center">
                            {/* ... empty state ... */}
                        </div>
                    )}
                </HorizontalScroll>
            </section>

            {/* 4. STICKY CHECK-IN */}
            <StickyCheckIn show={showSticky} onClick={() => window.location.href = '/user/space'} />
        </div>
    );
};

export default UserDashboard;

