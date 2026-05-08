// User/Space/Index.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/utils/Api';
import { 
    Search, MapPin, Loader2, ArrowRight, LayoutGrid, Coins, Star, Clock, 
    Users, Filter, X, Grid3x3, List, Wifi, Coffee, ParkingCircle, Wind,
    Sparkles, TrendingUp, ChevronDown, ChevronUp, Heart
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { cn } from '@/utils/cn';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SpaceIndex = () => {
    const navigate = useNavigate();
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('All');
    const [districts, setDistricts] = useState([]);
    const [userPoints, setUserPoints] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [priceRange, setPriceRange] = useState({ min: 0, max: 500 });
    const [sortBy, setSortBy] = useState('rating'); // rating, price_low, price_high, newest
    const observerRef = useRef(null);
    const lastSpaceRef = useRef(null);

    // Fetch districts for filter
    const fetchDistricts = useCallback(async () => {
        try {
            const res = await apiGet('/user/districts');
            setDistricts(res.data || []);
        } catch (err) {
            console.error("Failed to fetch districts:", err);
        }
    }, []);

    const fetchSpaces = useCallback(async (pageNum = 1, isLoadMore = false) => {
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }
        
        try {
            const districtParam = selectedDistrict !== 'All' ? `&district=${selectedDistrict}` : '';
            const sortParam = `&sort=${sortBy}`;
            const priceParam = `&minPrice=${priceRange.min}&maxPrice=${priceRange.max}`;
            
            const res = await apiGet(`/user/spaces?search=${search}${districtParam}${sortParam}${priceParam}&page=${pageNum}&limit=12`);
            
            const newSpaces = res.data || [];
            const total = res.total || 0;
            
            setTotalCount(total);
            setHasMore(pageNum * 12 < total);
            
            if (isLoadMore) {
                setSpaces(prev => [...prev, ...newSpaces]);
            } else {
                setSpaces(newSpaces);
            }
            
            // Get user points
            const bookingsRes = await apiGet('/user/bookings?limit=1');
            if (bookingsRes.data?.points !== undefined) {
                setUserPoints(bookingsRes.data.points);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            showToast({ icon: 'error', title: 'Failed to load spaces' });
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [search, selectedDistrict, sortBy, priceRange]);

    // Initial load
    useEffect(() => {
        fetchDistricts();
        fetchSpaces(1, false);
        setPage(1);
    }, [search, selectedDistrict, sortBy, priceRange]);

    // Reset pagination when filters change
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchSpaces(1, false);
    }, [search, selectedDistrict, sortBy, priceRange.min, priceRange.max]);

    // Infinite scroll observer
    useEffect(() => {
        if (loadingMore) return;
        
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchSpaces(nextPage, true);
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );
        
        if (lastSpaceRef.current) {
            observer.observe(lastSpaceRef.current);
        }
        
        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, page, spaces.length]);

    const handleSpaceClick = (spaceId) => {
        navigate(`/explore/${spaceId}`);
    };

    const getPrimaryImage = (space) => {
        const image = space.images?.[0] || space.image;
        if (!image) return '/placeholder.jpg';
        if (image.startsWith('http')) return image;
        return `${API_BASE_URL}/uploads/spaces/${space.user_id}/${image}`;
    };

    const getImageCount = (space) => {
        if (space.images && space.images.length > 0) return space.images.length;
        return space.image ? 1 : 0;
    };

    const formatTimeToAMPM = (time) => {
        if (!time) return null;
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

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
                return 'Closed';
            } catch (e) {
                return '24/7';
            }
        }
        return space.is_open_time ? 'Open Now' : '24/7';
    };

    // Get top 3 amenities to display
    const getDisplayAmenities = (amenities) => {
        if (!amenities || amenities.length === 0) return [];
        return amenities.slice(0, 3);
    };

    // Sort options
    const sortOptions = [
        { value: 'rating', label: 'Top Rated', icon: <Star size={14} /> },
        { value: 'price_low', label: 'Price: Low to High', icon: <TrendingUp size={14} /> },
        { value: 'price_high', label: 'Price: High to Low', icon: <TrendingUp size={14} className="rotate-180" /> },
        { value: 'newest', label: 'Newest First', icon: <Sparkles size={14} /> },
    ];

    return (
        <div className="min-h-screen bg-linear-to-b from-slate-50 to-white pb-24 selection:bg-indigo-100">
            {/* Hero Header */}
            <header className="relative bg-white border-b border-slate-100 pt-10 sm:pt-16 pb-12 sm:pb-16 px-5 sm:px-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-50 z-0" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-50 rounded-full blur-3xl opacity-30 z-0" />
                
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
                                <LayoutGrid size={12} className="text-indigo-600" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">
                                    {totalCount} Workspaces Available
                                </span>
                            </div>
                            <h1 className="text-[2.5rem] sm:text-5xl lg:text-6xl font-[1000] italic tracking-tighter uppercase text-slate-900 leading-[0.9] mb-4">
                                Find Your <br /> 
                                <span className="text-indigo-600 bg-linear-to-r from-indigo-600 to-indigo-500 bg-clip-text">
                                    Perfect Workspace.
                                </span>
                            </h1>
                            <p className="text-slate-500 text-sm max-w-md">
                                Discover the best coworking spaces across Iloilo City. Filter by district, price, and amenities.
                            </p>
                        </div>

                        {/* Points Card */}
                        <div className="bg-linear-to-r from-amber-500 to-amber-600 rounded-2xl p-4 shadow-xl shadow-amber-500/20 min-w-45">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Coins size={20} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-white/70 uppercase tracking-wider">Your Points</p>
                                    <p className="text-2xl font-black text-white">{userPoints}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-5 sm:px-8 mt-6 sm:mt-10">
                {/* Search and Filters Bar */}
                <div className="sticky top-20 z-40 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-slate-100 p-4 mb-8">
                    {/* Search Row */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or area..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-indigo-400 transition-all outline-none"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black uppercase tracking-wider text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all"
                            >
                                <Filter size={16} />
                                Filters
                                {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            
                            <div className="flex bg-slate-100 rounded-xl p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "p-2 rounded-lg transition-all",
                                        viewMode === 'grid' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400"
                                    )}
                                >
                                    <Grid3x3 size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "p-2 rounded-lg transition-all",
                                        viewMode === 'list' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400"
                                    )}
                                >
                                    <List size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Expanded Filters */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* District Filter */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">District</label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setSelectedDistrict('All')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                                selectedDistrict === 'All' 
                                                    ? "bg-indigo-600 text-white shadow-md" 
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            )}
                                        >
                                            All
                                        </button>
                                        {districts.map(district => (
                                            <button
                                                key={district._id}
                                                onClick={() => setSelectedDistrict(district.name)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                                    selectedDistrict === district.name 
                                                        ? "bg-indigo-600 text-white shadow-md" 
                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                )}
                                            >
                                                {district.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Sort By */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Sort By</label>
                                    <div className="flex flex-wrap gap-2">
                                        {sortOptions.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => setSortBy(option.value)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                                                    sortBy === option.value 
                                                        ? "bg-indigo-600 text-white shadow-md" 
                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                )}
                                            >
                                                {option.icon}
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Price Range */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Price Range (₱/hr)</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            placeholder="Min"
                                            value={priceRange.min}
                                            onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                        />
                                        <span className="text-slate-400">—</span>
                                        <input
                                            type="number"
                                            placeholder="Max"
                                            value={priceRange.max}
                                            onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) || 500 }))}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Count */}
                <div className="flex justify-between items-center mb-6">
                    <p className="text-xs text-slate-500">
                        Showing <span className="font-bold text-slate-900">{spaces.length}</span> of <span className="font-bold text-slate-900">{totalCount}</span> spaces
                    </p>
                    {loadingMore && <Loader2 size={16} className="animate-spin text-indigo-500" />}
                </div>

                {/* Loading State */}
                {loading && spaces.length === 0 ? (
                    <div className="py-32 flex flex-col items-center justify-center">
                        <Loader2 className="text-indigo-600 animate-spin mb-4" size={48} />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Loading workspaces...</p>
                    </div>
                ) : spaces.length === 0 ? (
                    <div className="py-32 text-center bg-slate-50 rounded-3xl">
                        <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <MapPin size={32} className="text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No spaces found</p>
                        <p className="text-slate-300 text-xs mt-2">Try adjusting your filters</p>
                    </div>
                ) : (
                    <>
                        {/* Grid/List View */}
                        <div className={cn(
                            "grid gap-6",
                            viewMode === 'grid' 
                                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                                : "grid-cols-1"
                        )}>
                            {spaces.map((space, index) => (
                                <div 
                                    key={space._id} 
                                    ref={index === spaces.length - 1 ? lastSpaceRef : null}
                                    onClick={() => handleSpaceClick(space._id)}
                                    className={cn(
                                        "bg-white border border-slate-100 rounded-3xl hover:border-indigo-200 transition-all group cursor-pointer shadow-sm hover:shadow-xl",
                                        viewMode === 'list' ? "flex gap-6 p-5" : "flex flex-col p-4"
                                    )}
                                >
                                    {/* Image Section */}
                                    <div className={cn(
                                        "relative rounded-2xl bg-slate-100 overflow-hidden",
                                        viewMode === 'list' ? "w-48 h-32 shrink-0" : "h-44 mb-4"
                                    )}>
                                        <img 
                                            src={getPrimaryImage(space)} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                            alt={space.name}
                                            onError={(e) => { e.target.src = '/placeholder.jpg'; }}
                                        />
                                        {getImageCount(space) > 1 && (
                                            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-lg">
                                                <p className="text-white text-[8px] font-black">+{getImageCount(space) - 1}</p>
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Star size={10} className="fill-amber-400 text-amber-400" />
                                            <span className="text-[9px] font-bold">{space.rating?.toFixed(1) || 5.0}</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className={cn("flex-1", viewMode === 'list' ? "flex flex-col" : "")}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="text-slate-900 font-[1000] text-base tracking-tight line-clamp-1">
                                                    {space.name}
                                                </h3>
                                                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                                                    <MapPin size={10} /> {space.location}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-indigo-600">₱{space.rate_hour}</p>
                                                <p className="text-[8px] text-slate-400 -mt-1">/hour</p>
                                            </div>
                                        </div>

                                        {/* Amenities - Dynamic */}
                                        {getDisplayAmenities(space.amenities).length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {getDisplayAmenities(space.amenities).map((amenity, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 bg-slate-100 rounded-full text-[8px] text-slate-600 font-bold uppercase tracking-wider">
                                                        {amenity}
                                                    </span>
                                                ))}
                                                {space.amenities?.length > 3 && (
                                                    <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[8px] text-slate-400 font-bold">
                                                        +{space.amenities.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Quick Stats */}
                                        <div className="flex items-center gap-4 mt-3 text-[9px] text-slate-500">
                                            {space.capacity > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <Users size={10} />
                                                    <span>{space.capacity} seats</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                                <Clock size={10} />
                                                <span>{getTodayHours(space)}</span>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSpaceClick(space._id);
                                            }}
                                            className="mt-4 w-full py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 group-hover:bg-indigo-600 transition-all"
                                        >
                                            View Details <ArrowRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Loading More Indicator */}
                        {loadingMore && (
                            <div className="py-8 flex justify-center">
                                <Loader2 className="text-indigo-500 animate-spin" size={24} />
                                <span className="ml-2 text-xs text-slate-500">Loading more spaces...</span>
                            </div>
                        )}

                        {/* End of results */}
                        {!hasMore && spaces.length > 0 && (
                            <div className="py-8 text-center">
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">You've reached the end</p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default SpaceIndex;