// User/Space/Index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/Api';
import { Search, MapPin, Loader2, ArrowRight, LayoutGrid, Coins, Star, Clock, Users } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SpaceIndex = () => {
    const navigate = useNavigate();
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('All');
    const [userPoints, setUserPoints] = useState(0);

    const fetchSpaces = useCallback(async (query = '', district = 'All') => {
        setLoading(true);
        try {
            const districtParam = district !== 'All' ? `&district=${district}` : '';
            const res = await apiGet(`/user/spaces?search=${query}${districtParam}`);
            setSpaces(res.data || []);
            
            const bookingsRes = await apiGet('/user/bookings?limit=1');
            if (bookingsRes.data?.points !== undefined) {
                setUserPoints(bookingsRes.data.points);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSpaces(search, selectedDistrict);
    }, [selectedDistrict, search, fetchSpaces]);

    const handleSpaceClick = (spaceId) => {
        navigate(`/explore/${spaceId}`);
    };

    const getPrimaryImage = (space) => {
        const image = space.images?.[0] || space.image;
        
        if (!image) return '/placeholder.jpg';
        
        if (image.startsWith('http://') || image.startsWith('https://')) {
            return image;
        }
        
        return `${API_BASE_URL}/uploads/spaces/${space.user_id}/${image}`;
    };

    const getImageCount = (space) => {
        if (space.images && space.images.length > 0) {
            return space.images.length;
        }
        return space.image ? 1 : 0;
    };

    // Helper function to format time to AM/PM
    const formatTimeToAMPM = (time) => {
        if (!time) return null;
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    // Helper function to get today's hours from hours_json
    const getTodayHours = (space) => {
        if (space?.hours_json) {
            try {
                const hours = typeof space.hours_json === 'string' 
                    ? JSON.parse(space.hours_json) 
                    : space.hours_json;
                
                const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const today = days[new Date().getDay()];
                const todayHours = hours[today];
                
                if (todayHours && todayHours.active) {
                    return `${formatTimeToAMPM(todayHours.open)} - ${formatTimeToAMPM(todayHours.close)}`;
                }
                return 'Closed Today';
            } catch (e) {
                return '24/7';
            }
        }
        return '24/7';
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 selection:bg-indigo-100">
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
                        </div>

                        <div className="relative w-full lg:max-w-md">
                            <div className="mb-3 flex justify-end">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                                    <Coins size={14} className="text-amber-600" />
                                    <span className="text-[9px] font-black uppercase text-amber-700">
                                        Your Points: {userPoints}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="relative group overflow-hidden rounded-3xl sm:rounded-4xl">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search location..."
                                    className="w-full pl-14 pr-6 py-5 sm:py-6 bg-slate-100 border-2 border-transparent rounded-3xl sm:rounded-4xl text-xs sm:text-sm font-bold focus:bg-white focus:border-indigo-600 transition-all outline-none text-slate-900"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-5 sm:px-8 mt-8 sm:mt-12">
                {loading ? (
                    <div className="py-32 flex flex-col items-center"><Loader2 className="text-indigo-600 animate-spin" size={40} /></div>
                ) : spaces.length === 0 ? (
                    <div className="py-32 text-center">
                        <p className="text-slate-400 font-black uppercase tracking-widest">No spaces found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
                        {spaces.map((space) => (
                            <div 
                                key={space._id} 
                                onClick={() => handleSpaceClick(space._id)}
                                className="bg-white border border-slate-100 rounded-[2.5rem] p-5 hover:border-indigo-100 transition-all group shadow-sm hover:shadow-2xl cursor-pointer flex flex-col h-full"
                            >
                                {/* Image Section */}
                                <div className="relative h-44 sm:h-52 rounded-4xl bg-slate-100 mb-6 overflow-hidden">
                                    <img 
                                        src={getPrimaryImage(space)} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                        alt={space.name}
                                        onError={(e) => { e.target.src = '/placeholder.jpg'; }}
                                    />
                                    {/* Image count badge */}
                                    {getImageCount(space) > 1 && (
                                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg">
                                            <p className="text-white text-[8px] font-black">+{getImageCount(space) - 1}</p>
                                        </div>
                                    )}
                                    {/* Price badge */}
                                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg">
                                        <p className="text-white text-[9px] font-black uppercase tracking-widest">
                                            ₱{space.rate_hour}/hr
                                        </p>
                                    </div>
                                    {/* Rating badge */}
                                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Star size={10} className="fill-amber-400 text-amber-400" />
                                        <span className="text-[9px] font-bold">{space.rating || 4.8}</span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="grow px-1">
                                    <h3 className="text-slate-900 font-[1000] uppercase text-base tracking-tight mb-1 truncate">{space.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                        <MapPin size={10} /> {space.area || space.district_id?.name || 'Iloilo City'}
                                    </p>
                                    
                                    {/* Quick stats */}
                                    <div className="flex items-center gap-3 mt-3 text-[9px] text-slate-500">
                                        {space.capacity && (
                                            <div className="flex items-center gap-1">
                                                <Users size={10} />
                                                <span>{space.capacity}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <Clock size={10} />
                                            <span>{getTodayHours(space)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSpaceClick(space._id);
                                    }}
                                    className="mt-4 w-full py-3 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 group-hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/10"
                                >
                                    View Details <ArrowRight size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default SpaceIndex;