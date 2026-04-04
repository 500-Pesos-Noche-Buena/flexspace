import React, { useState, useEffect } from 'react';
import { apiGet } from '@/utils/Api';
import { Search, MapPin, Star, Loader2, ArrowRight, Zap, SlidersHorizontal, LayoutGrid } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/** --- SUB-COMPONENT: SpaceCard --- **/
const SpaceCard = ({ name, location, district, price, rating, image, tags = [] }) => {
    const imageUrl = image ? `${API_BASE_URL}/uploads/spaces/${image}` : null;

    return (
        <div className="bg-white border border-slate-100 rounded-4xl sm:rounded-[2.5rem] p-4 sm:p-5 hover:border-indigo-100 transition-all group cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col h-full">
            <div className="h-44 sm:h-52 rounded-3xl sm:rounded-4xl bg-slate-100 mb-4 sm:mb-6 overflow-hidden relative">
                {/* Floating Tags */}
                <div className="absolute top-3 left-3 flex gap-2 z-10">
                    <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-indigo-600/20">
                        <Zap size={8} fill="currentColor" /> Active
                    </span>
                </div>
                
                <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full z-10 text-[10px] font-black text-slate-900 tracking-tighter border border-slate-100">
                    ₱{price}<span className="text-slate-400 font-bold">/hr</span>
                </div>

                <img 
                    src={imageUrl || '/placeholder.jpg'} 
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                />
            </div>

            <div className="px-1 grow">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="min-w-0">
                        <p className="text-[9px] text-indigo-600 font-black uppercase tracking-[0.2em] mb-1 truncate">{district || 'Iloilo City'}</p>
                        <h3 className="text-slate-900 font-[1000] uppercase text-sm sm:text-base tracking-tight leading-none truncate">{name}</h3>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg text-amber-600 shrink-0">
                        <Star size={10} fill="currentColor" />
                        <span className="text-[10px] font-black">{rating || '5.0'}</span>
                    </div>
                </div>

                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-2">
                    <MapPin size={10} className="text-slate-300" /> {location}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-4 mb-6">
                    {(tags?.length > 0 ? tags : ["Fast WiFi", "Quiet"]).slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-slate-50 rounded-md text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Mobile-Friendly Action Button */}
            <button className="w-full py-3.5 sm:py-4 bg-slate-900 text-white rounded-[1.2rem] sm:rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 group-hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-slate-900/10">
                Book Space <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
};

/** --- MAIN COMPONENT --- **/
const SpaceIndex = () => {
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('All');

    const districts = ['All', 'City Proper', 'Jaro', 'Molo', 'Mandurriao', 'Arevalo', 'La Paz', 'Lapuz'];

    const fetchSpaces = async (query = '', district = 'All') => {
        setLoading(true);
        try {
            const districtParam = district !== 'All' ? `&district=${district}` : '';
            const res = await apiGet(`/user/spaces?search=${query}${districtParam}`);
            setSpaces(res.data || []);
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSpaces(search, selectedDistrict);
    }, [selectedDistrict]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 selection:bg-indigo-100">
            {/* --- HEADER SECTION --- */}
            <header className="bg-white border-b border-slate-100 pt-10 sm:pt-16 pb-8 sm:pb-12 px-5 sm:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
                                <LayoutGrid size={12} className="text-indigo-600" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Explore Iloilo</span>
                            </div>
                            <h1 className="text-[2.75rem] sm:text-6xl lg:text-7xl font-[1000] italic tracking-tighter uppercase text-slate-900 leading-[0.85] mb-6">
                                Find Your <br /> <span className="text-indigo-600">Workstation.</span>
                            </h1>
                            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-[0.3em] italic">
                                Premium Hubs • Real-time Availability
                            </p>
                        </div>

                        {/* Search Input - Mobile Optimized */}
                        <div className="relative w-full lg:max-w-md">
                            <div className="relative group overflow-hidden rounded-3xl sm:rounded-4xl">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10" size={18} />
                                <input 
                                    type="text"
                                    placeholder="Search location or name..."
                                    className="w-full pl-14 pr-6 py-5 sm:py-6 bg-slate-100 border-2 border-transparent rounded-3xl sm:rounded-4xl text-xs sm:text-sm font-bold focus:bg-white focus:border-indigo-600 transition-all outline-none"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchSpaces(search, selectedDistrict)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* --- DISTRICT PILLS - Mobile Horizontal Scroll --- */}
                    <div className="mt-10 sm:mt-12 overflow-hidden relative">
                        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
                            <div className="flex items-center gap-2 pr-4 border-r border-slate-100 mr-2 shrink-0">
                                <SlidersHorizontal size={14} className="text-slate-900" />
                                <span className="text-[9px] font-black uppercase text-slate-900 tracking-widest">Filter</span>
                            </div>
                            {districts.map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setSelectedDistrict(d)}
                                    className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                                        selectedDistrict === d 
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20' 
                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                    }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                        {/* Fade Effect for scroll */}
                        <div className="absolute right-0 top-0 bottom-4 w-12 bg-linear-to-l from-white to-transparent pointer-events-none hidden sm:block"></div>
                    </div>
                </div>
            </header>

            {/* --- GRID LISTING --- */}
            <main className="max-w-7xl mx-auto px-5 sm:px-8 mt-8 sm:mt-12">
                {loading ? (
                    <div className="py-32 flex flex-col items-center gap-6">
                        <div className="relative">
                            <Loader2 className="text-indigo-600 animate-spin" size={40} />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Scanning City Hubs...</p>
                    </div>
                ) : spaces.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
                        {spaces.map((space) => (
                            <SpaceCard 
                                key={space._id}
                                name={space.name}
                                district={space.district_id?.name || space.area}
                                location={space.area || 'Iloilo City'}
                                price={space.rate_hour}
                                rating={space.rating}
                                tags={space.amenities}
                                image={space.image}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-24 text-center">
                        <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Search className="text-slate-200" size={24} />
                        </div>
                        <h3 className="text-slate-900 font-black uppercase text-base italic tracking-tight">No Results Found</h3>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mt-2 mb-8">Try another district or keyword.</p>
                        <button 
                            onClick={() => { setSearch(''); setSelectedDistrict('All'); fetchSpaces('', 'All'); }}
                            className="px-8 py-3 bg-white border-2 border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm"
                        >
                            Reset
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SpaceIndex;