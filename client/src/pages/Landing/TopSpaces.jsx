import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TopSpaces = ({ spaces = [] }) => {
    // console.log("TopSpaces received:", spaces);
    // console.log("Number of spaces:", spaces.length);
    
    const displaySpaces = spaces.slice(0, 4);
    // console.log("Display spaces:", displaySpaces);

    const getImageUrl = (space) => {
        if (!space.image) return '/placeholder.jpg';
        
        if (space.user_id) {
            return `${API_BASE_URL}/uploads/spaces/${space.user_id}/${space.image}`;
        }
        
        return `${API_BASE_URL}/uploads/spaces/${space.image}`;
    };

    if (displaySpaces.length === 0) {
        return (
            <section id="top" className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Popular Workspaces</h2>
                    <div className="text-center py-12">
                        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">
                            No spaces available at the moment
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="top" className="py-20 bg-slate-50">
            <div className="max-w-7xl mx-auto px-6">
                <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Popular Workspaces</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {displaySpaces.map((s) => (
                        <Card 
                            key={s._id} 
                            className="overflow-hidden border-slate-100 rounded-3xl hover:shadow-xl transition-all duration-300 group cursor-pointer"
                            onClick={() => window.location.href = `/space/${s._id}`}
                        >
                            <CardContent className="p-4">
                                <div className="relative w-full h-40 mb-4 overflow-hidden rounded-2xl bg-slate-100">
                                    <img
                                        src={getImageUrl(s)}
                                        alt={s.name}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        loading="lazy"
                                        onError={(e) => {
                                            console.error("Image failed to load:", getImageUrl(s));
                                            e.target.onerror = null;
                                            e.target.src = '/placeholder.jpg';
                                        }}
                                    />
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[10px] font-black text-indigo-600">
                                        ₱{s.rate_hour}/hr
                                    </div>
                                </div>
                                <h3 className="font-black text-slate-900 text-sm tracking-tight">{s.name}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                    📍 {s.district_id?.name || s.area || 'Iloilo City'}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex items-center gap-0.5">
                                        <span className="text-amber-500">★</span>
                                        <span className="text-[10px] font-bold text-slate-600">{s.rating || 5.0}</span>
                                    </div>
                                    <span className="text-[8px] text-slate-300">•</span>
                                    <span className="text-[8px] font-bold text-emerald-600 uppercase">Verified</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TopSpaces;