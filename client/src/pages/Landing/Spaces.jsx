import React, { useEffect, useState } from 'react';
import { apiGet } from '@/utils/Api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ExploreSpaces = () => {
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

    // ✅ Filter spaces by selected district
    const filteredSpaces = selectedDistrict
        ? spaces.filter(s => s.district_id?._id === selectedDistrict)
        : spaces;

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
                    className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                        selectedDistrict === ''
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-600'
                    }`}
                >
                    All
                </button>

                {districts.map(d => (
                    <button
                        key={d._id}
                        onClick={() => setSelectedDistrict(d._id)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                            selectedDistrict === d._id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-slate-600'
                        }`}
                    >
                        {d.name}
                    </button>
                ))}
            </div>

            {/* GRID */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-slate-400">Loading spaces...</p>
                ) : filteredSpaces.length === 0 ? (
                    <p className="text-slate-400">No spaces found.</p>
                ) : (
                    filteredSpaces.map(space => (
                        <div
                            key={space._id}
                            className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all"
                        >
                            {/* IMAGE */}
                            <div className="h-48 bg-slate-100 overflow-hidden">
                                <img
                                    src={space.image ? `${API_BASE_URL}/uploads/spaces/${space.image}` : '/placeholder.jpg'}
                                    alt={space.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition"
                                />
                            </div>

                            {/* CONTENT */}
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-slate-900">{space.name}</h3>
                                <p className="text-sm text-slate-500">
                                    {space.area || space.district_id?.name || 'Unknown area'}
                                </p>
                                <div className="mt-2 flex justify-between items-center">
                                    <span className="text-indigo-600 font-semibold text-sm">{space.status}</span>
                                    <span className="text-sm text-slate-400">₱{space.rate_hour}/hr</span>
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