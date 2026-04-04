import React, { useState, useEffect, useRef } from 'react';
import { apiGet } from '@/utils/Api';
import { 
    MapPin, Calendar, Star, 
    ArrowRight, Zap, Loader2, RefreshCw 
} from 'lucide-react';
import ExplorerView from '@/pages/Landing/ExplorerView';
import { useAuth } from '@/context/AuthContext';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/** --- SUB-COMPONENTS --- **/
const StatBox = ({ label, value, color }) => (
    <div className="bg-white border border-slate-100 p-4 rounded-3xl min-w-[100px] text-center hover:border-indigo-200 transition-all cursor-default shadow-sm hover:shadow-md">
        <h3 className={`text-2xl font-[1000] ${color} tracking-tighter`}>{value}</h3>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
);

/** --- SUB-COMPONENTS --- **/
const SpaceCard = ({ name, location, price, rating, image, tags = [] }) => {
    const imageUrl = image ? `${API_BASE_URL}/uploads/spaces/${image}` : null;

    return (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 hover:border-indigo-100 transition-all group cursor-pointer shadow-sm hover:shadow-xl hover:shadow-indigo-500/5">
            <div className="h-48 rounded-[2rem] bg-slate-100 mb-6 overflow-hidden relative">
                <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full z-10 text-[9px] font-black text-slate-900 uppercase tracking-widest border border-slate-100">
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
            </div>

            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-slate-900 font-[1000] uppercase text-sm tracking-tight">{name}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                        <MapPin size={10} className="text-indigo-600" /> {location}
                    </p>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                    <Star size={12} fill="currentColor" />
                    <span className="text-xs font-black">{rating}</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
                {tags && tags.length > 0 ? (
                    tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-3 py-1 bg-slate-50 rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            {tag}
                        </span>
                    ))
                ) : (
                    <span className="px-3 py-1 bg-slate-50 rounded-lg text-[8px] font-black text-slate-300 uppercase tracking-widest">
                        Workspace
                    </span>
                )}
            </div>
        </div>
    );
};

/** --- MAIN DASHBOARD --- **/
const UserDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showSticky, setShowSticky] = useState(true); // Control visibility
    
    const [stats, setStats] = useState({ bookings: '00', hours: '00', points: '000' });
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
                
                setStats({
                    bookings: String(freshData.stats?.total_bookings || 0).padStart(2, '0'),
                    hours: String(freshData.stats?.total_hours || 0).padStart(2, '0'),
                    points: String(freshData.stats?.loyalty_points || 0).padStart(3, '0')
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

        // --- FIXED: Hide sticky when scrolling deep into the Explorer ---
        const handleScroll = () => {
            if (window.scrollY > 200 && window.scrollY < 1200) {
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

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="text-indigo-600 animate-spin" size={32} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Syncing Hub...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-32 selection:bg-indigo-100 animate-in fade-in duration-700">
            
            {/* 1. WELCOME HEADER */}
            <section className="pt-8 pb-12 px-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="relative">
                        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-indigo-50 border border-indigo-100">
                            <Zap size={12} className={`text-indigo-600 fill-indigo-600 ${isSyncing ? 'animate-pulse' : ''}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                {isSyncing ? 'Syncing...' : 'Deep Work Mode'}
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-[1000] italic tracking-tighter uppercase leading-[0.85] mb-4 text-slate-900">
                            {greeting.hiligaynon}, <br /> <span className="text-indigo-600">{user?.name?.split(' ')[0] || 'User'}.</span>
                        </h1>
                        <p className="text-sm text-slate-500 font-medium max-w-md">
                            Ready to stay productive in {greeting.english.toLowerCase()}?
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
                        <StatBox label="Bookings" value={stats.bookings} color="text-indigo-600" />
                        <StatBox label="Hrs Saved" value={stats.hours} color="text-emerald-600" />
                        <StatBox label="Points" value={stats.points} color="text-amber-600" />
                    </div>
                </div>
            </section>

            {/* 2. EXPLORER HUB */}
            <section className="px-6 mb-20 max-w-7xl mx-auto">
                <div className="relative bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-2xl shadow-indigo-900/5">
                    <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-sm font-black uppercase italic tracking-widest">Workspace Explorer</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Live availability in Iloilo</p>
                        </div>
                        <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
                            <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">List View</button>
                            <button className="px-6 py-2.5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-900 transition-all">Map View</button>
                        </div>
                    </div>
                    <div className="min-h-[450px]">
                        <ExplorerView />
                    </div>
                </div>
            </section>

            {/* 3. TRENDING SPACES */}
            <section className="px-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <Star size={20} className="text-indigo-600 fill-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase italic text-slate-900 tracking-tight">Trending Now</h2>
                            {/* Clickable Link to Index */}
                            <button 
                                onClick={() => window.location.href = '/user/space'} 
                                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline mt-1"
                            >
                                View All Hubs —
                            </button>
                        </div>
                    </div>
                    <button onClick={() => fetchDashboardData(false)} className="p-3 rounded-full hover:bg-slate-100 transition-colors">
                        <RefreshCw size={16} className={`text-slate-400 ${isSyncing ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {trending.length > 0 ? trending.map((space) => (
                        <SpaceCard 
                            key={space._id}
                            name={space.name}
                            location={space.district_id?.name || 'Iloilo City'}
                            price={space.rate_hour}
                            rating={space.rating || '5.0'}
                            tags={space.amenities}
                            image={space.image}
                            
                        />
                    )) : (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active spaces discovered yet.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* 4. STICKY CHECK-IN (FIXED) */}
            <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[100] transition-all duration-500 ease-in-out ${showSticky ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                <div className="bg-white rounded-[2.5rem] p-4 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100">
                    <div className="flex items-center gap-4 ml-2">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                            <Calendar size={22} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Booking</p>
                            <p className="text-sm font-bold text-slate-900 tracking-tight italic">Ready for session</p>
                        </div>
                    </div>
                    <button  onClick={() => window.location.href = '/user/space'}  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.03] transition-all shadow-xl shadow-indigo-600/20">
                        Check In
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;