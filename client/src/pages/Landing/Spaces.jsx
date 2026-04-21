import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/utils/Api';
import { MapPin, Star, Clock, Users } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ExploreSpaces = () => {
    const navigate = useNavigate();
    const [spaces, setSpaces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSpaces = async () => {
            try {
                setLoading(true);
                const res = await apiGet('/landing/explorer');
                setSpaces(res.data?.spaces || []);
                setDistricts(res.data?.districts || []);
            } catch (err) {
                console.error("Failed to fetch spaces:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSpaces();
    }, []);

    const filteredSpaces = selectedDistrict
        ? spaces.filter(s => s.district_id?._id === selectedDistrict)
        : spaces;

    const getImageUrl = (space) => {
        const image = space.images?.[0] || space.image;
        if (image) {
            return `${API_BASE_URL}/uploads/spaces/${space.user_id}/${image}`;
        }
        return '/placeholder.jpg';
    };

    return (
        <div className="bg-white min-h-screen px-4 md:px-6 py-10">
            {/* HEADER */}
            <div className="max-w-7xl mx-auto mb-6">
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-3">
                    Explore Spaces
                </h2>
                <p className="text-slate-500 text-sm md:text-base">
                    Discover coworking spaces, cafes, and study hubs around Iloilo City.
                </p>
            </div>

            {/* FILTER */}
            <div className="max-w-7xl mx-auto mb-8 flex flex-wrap gap-3">
                <button
                    onClick={() => setSelectedDistrict('')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                        selectedDistrict === ''
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                >
                    All
                </button>

                {districts.map(d => (
                    <button
                        key={d._id}
                        onClick={() => setSelectedDistrict(d._id)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                            selectedDistrict === d._id
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                        }`}
                    >
                        {d.name}
                    </button>
                ))}
            </div>

            {/* GRID */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="animate-pulse text-slate-400">Loading spaces...</div>
                    </div>
                ) : filteredSpaces.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-400">
                        No spaces found.
                    </div>
                ) : (
                    filteredSpaces.map(space => (
                        <div
                            key={space._id}
                            onClick={() => navigate(`/explore/${space._id}`)}
                            className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                        >
                            {/* IMAGE */}
                            <div className="relative h-48 bg-slate-100 overflow-hidden">
                                <img
                                    src={getImageUrl(space)}
                                    alt={space.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                {/* Rating badge */}
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                                    <Star size={12} className="fill-amber-400 text-amber-400" />
                                    <span className="text-xs font-bold">{space.rating || 4.8}</span>
                                </div>
                                {/* Price badge */}
                                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md rounded-full px-3 py-1">
                                    <span className="text-white text-xs font-bold">₱{space.rate_hour}/hr</span>
                                </div>
                            </div>

                            {/* CONTENT */}
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-slate-900 mb-1">{space.name}</h3>
                                <div className="flex items-center gap-1 text-slate-500 text-sm mb-3">
                                    <MapPin size={14} />
                                    <span>{space.area || space.district_id?.name}</span>
                                </div>
                                
                                {/* Quick stats */}
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <Users size={12} />
                                        <span>{space.capacity || 50}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        <span>24/7</span>
                                    </div>
                                    <div className={`text-xs font-semibold ${
                                        space.status === 'Open Now' ? 'text-emerald-600' : 'text-slate-400'
                                    }`}>
                                        {space.status}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ExploreSpaces;