import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { getSpaceImage } from '@/utils/imageHelper';

const TopSpaces = ({ spaces = [] }) => {
    const displaySpaces = spaces.slice(0, 4);
    
    // Debug: Log the first space to see its structure
    console.log("TopSpaces received data:", spaces);
    console.log("First space:", displaySpaces[0]);

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
                    {displaySpaces.map((s) => {
                        // Debug each space's image
                        console.log(`Space ${s.name}:`, {
                            image: s.image,
                            imageType: typeof s.image,
                            imageStartsWithHttp: s.image?.startsWith('http'),
                            fullSpace: s
                        });
                        
                        return (
                            <Card 
                                key={s._id} 
                                className="overflow-hidden border-slate-100 rounded-3xl hover:shadow-xl transition-all duration-300 group cursor-pointer"
                                onClick={() => window.location.href = `/explore/${s._id}`}
                            >
                                <CardContent className="p-4">
                                    <div className="relative w-full h-40 mb-4 overflow-hidden rounded-2xl bg-slate-100">
                                        <img
                                            src={getSpaceImage(s)}
                                            alt={s.name}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            loading="lazy"
                                            onError={(e) => {
                                                console.error("Image failed to load for:", s.name, "Image URL:", getSpaceImage(s));
                                                e.target.onerror = null;
                                                e.target.src = '/placeholders/space.jpg';
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
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default TopSpaces;