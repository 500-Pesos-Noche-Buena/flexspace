import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { getSpaceImage } from '@/utils/imageHelper';
import { MapPin, Star, Wifi, Coffee, Zap } from 'lucide-react';

const TopSpaces = ({ spaces = [] }) => {
    const displaySpaces = spaces.slice(0, 4);

    if (displaySpaces.length === 0) {
        return (
            <section id="top" className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Popular Workspaces</h2>
                        <p className="text-slate-500 text-sm max-w-2xl mx-auto">
                            Discover the most loved coworking spaces in Iloilo City, trusted by hundreds of remote workers and students.
                        </p>
                    </div>
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
                {/* SEO Header - More text for Google */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Popular Workspaces in Iloilo City</h2>
                    <p className="text-slate-500 text-sm max-w-2xl mx-auto">
                        Discover the most loved coworking spaces, study hubs, and professional workspaces 
                        trusted by hundreds of remote workers, freelancers, and students across Iloilo City.
                        Each space is verified for quality, speed, and comfort.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {displaySpaces.map((s) => (
                        <Card 
                            key={s._id} 
                            className="overflow-hidden border-slate-100 rounded-3xl hover:shadow-xl transition-all duration-300 group cursor-pointer hover:border-indigo-200"
                            onClick={() => window.location.href = `/explore/${s._id}`}
                        >
                            <CardContent className="p-4">
                                {/* Image Section */}
                                <div className="relative w-full h-40 mb-4 overflow-hidden rounded-2xl bg-slate-100">
                                    <img
                                        src={getSpaceImage(s)}
                                        alt={`${s.name} coworking space in Iloilo City`}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/placeholders/space.jpg';
                                        }}
                                    />
                                    {/* Price Badge */}
                                    <div className="absolute top-2 right-2 px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm">
                                        <span className="text-[10px] font-black text-indigo-600">₱{s.rate_hour}/hr</span>
                                    </div>
                                    {/* Quick Amenities Badges */}
                                    <div className="absolute bottom-2 left-2 flex gap-1">
                                        {s.amenities?.includes('wifi') && (
                                            <div className="bg-white/90 backdrop-blur-sm p-1 rounded-md">
                                                <Wifi size={10} className="text-indigo-500" />
                                            </div>
                                        )}
                                        {s.amenities?.includes('coffee') && (
                                            <div className="bg-white/90 backdrop-blur-sm p-1 rounded-md">
                                                <Coffee size={10} className="text-amber-500" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Space Name */}
                                <h3 className="font-black text-slate-900 text-base tracking-tight line-clamp-1">
                                    {s.name}
                                </h3>
                                
                                {/* Location */}
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                    <MapPin size={10} /> {s.district_id?.name || s.area || 'Iloilo City'}
                                </p>
                                
                                {/* Rating & Verification */}
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-1">
                                        <div className="flex items-center gap-0.5">
                                            <Star size={12} className="fill-amber-400 text-amber-400" />
                                            <span className="text-[10px] font-bold text-slate-700">{s.rating || 5.0}</span>
                                        </div>
                                        <span className="text-[8px] text-slate-300">•</span>
                                        <span className="text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded-full">Verified</span>
                                    </div>
                                    <span className="text-[8px] text-slate-400">
                                        {s.review_count || 0} reviews
                                    </span>
                                </div>

                                {/* Capacity & Available Rooms */}
                                {(s.capacity > 0 || s.available_rooms) && (
                                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-50">
                                        {s.capacity > 0 && (
                                            <div className="flex items-center gap-1">
                                                <Zap size={10} className="text-slate-400" />
                                                <span className="text-[7px] text-slate-400 font-bold">{s.capacity} seats</span>
                                            </div>
                                        )}
                                        {s.available_rooms && (
                                            <div className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <span className="text-[7px] text-slate-400 font-bold">{s.available_rooms} rooms</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Bottom CTA - More SEO text */}
                <div className="text-center mt-12 pt-6">
                    <p className="text-[10px] text-slate-400 max-w-2xl mx-auto">
                        Looking for the perfect workspace in Iloilo City? From Molo to Jaro, 
                        Mandurriao to City Proper, FlexSpace connects you with the best coworking spots 
                        featuring high-speed internet, comfortable seating, and professional environments.
                    </p>
                    <button 
                        onClick={() => window.location.href = '/spaces'}
                        className="mt-6 text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors"
                    >
                        View All Workspaces →
                    </button>
                </div>
            </div>
        </section>
    );
};

export default TopSpaces;