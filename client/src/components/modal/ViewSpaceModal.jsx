import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, DollarSign, Users, Clock, Calendar, Award, Star, 
         Building, DoorOpen, Wifi, Wind, Sun, Coffee, Tv, Phone, 
       Printer, Car, Shield, Heart, Zap, Home, Activity, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import { getSpaceImage } from '@/utils/imageHelper';

export const ViewSpaceModal = ({ isOpen, onClose, space }) => {
    const navigate = useNavigate();
    
    if (!isOpen || !space) return null;

    const formatHours = (hours_json) => {
        if (!hours_json) return null;
        
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        return days.map((day, index) => {
            const dayData = hours_json[day];
            if (!dayData) return null;
            return (
                <div key={day} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                    <span className="text-slate-400 font-medium text-sm">{dayLabels[index]}</span>
                    <div className="text-right">
                        {dayData.active ? (
                            <span className="text-white font-bold text-sm">
                                {dayData.open} - {dayData.close}
                            </span>
                        ) : (
                            <span className="text-rose-400 text-xs font-bold">Closed</span>
                        )}
                    </div>
                </div>
            );
        }).filter(Boolean);
    };

    const getAmenityIcon = (amenity) => {
        const iconMap = {
            'WiFi': <Wifi size={14} />,
            'Air Conditioning': <Wind size={14} />,
            'Parking': <Car size={14} />,
            'Coffee': <Coffee size={14} />,
            'TV': <Tv size={14} />,
            'Phone Booth': <Phone size={14} />,
            'Printer': <Printer size={14} />,
            'Security': <Shield size={14} />,
            'Kitchen': <Zap size={14} />,
            'Meeting Room': <Users size={14} />,
            'Private Office': <Building size={14} />,
            'Event Space': <Activity size={14} />
        };
        return iconMap[amenity] || <CheckCircle size={14} />;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
            
            {/* Modal Content */}
            <div className="relative bg-[#0a0a0f] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 border border-white/10 shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-[#0a0a0f] border-b border-white/10 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Space Details</h2>
                        <p className="text-[10px] text-slate-500 mt-0.5">Complete information about this workspace</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    
                    {/* Hero Section with Main Image */}
                    <div className="relative rounded-xl overflow-hidden bg-linear-to-r from-indigo-950/50 to-purple-950/50">
                        <div className="aspect-video relative">
                            <img 
                                src={getSpaceImage(space)} 
                                alt={space.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = '/placeholders/space.jpg'; }}
                            />
                            {/* Status Badge */}
                            <div className="absolute top-4 right-4">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase backdrop-blur-md",
                                    space.status === 'Open Now' 
                                        ? "bg-emerald-500/80 text-white" 
                                        : "bg-rose-500/80 text-white"
                                )}>
                                    {space.status}
                                </span>
                            </div>
                            {/* Rating Badge */}
                            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full">
                                <Star size={14} className="text-amber-400 fill-amber-400" />
                                <span className="text-white font-bold text-sm">{space.rating?.toFixed(1) || '5.0'}</span>
                                <span className="text-slate-400 text-[10px]">({space.review_count || 0} reviews)</span>
                            </div>
                        </div>
                    </div>

                    {/* Title & Basic Info */}
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">{space.name}</h3>
                        <div className="flex items-center gap-2 text-slate-400">
                            <MapPin size={14} />
                            <span className="text-sm">{space.area || 'Location not set'}</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                            <DollarSign size={18} className="text-emerald-400 mx-auto mb-2" />
                            <p className="text-[9px] text-slate-500 font-black uppercase">Hourly Rate</p>
                            <p className="text-xl font-black text-white">₱{space.rate_hour}<span className="text-xs">/hr</span></p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                            <Users size={18} className="text-indigo-400 mx-auto mb-2" />
                            <p className="text-[9px] text-slate-500 font-black uppercase">Total Capacity</p>
                            <p className="text-xl font-black text-white">{space.capacity || 0}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                            <DoorOpen size={18} className="text-purple-400 mx-auto mb-2" />
                            <p className="text-[9px] text-slate-500 font-black uppercase">Available Rooms</p>
                            <p className="text-xl font-black text-white">{space.available_rooms || 'N/A'}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                            <Building size={18} className="text-amber-400 mx-auto mb-2" />
                            <p className="text-[9px] text-slate-500 font-black uppercase">Total Rooms</p>
                            <p className="text-xl font-black text-white">{space.room_count || 0}</p>
                        </div>
                    </div>

                    {/* Location Coordinates */}
                    {(space.lat && space.lng) && (
                        <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-2 mb-3">
                                <MapPin size={14} className="text-indigo-400" />
                                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-wider">📍 Location Coordinates</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[8px] text-slate-500 uppercase tracking-wider">Latitude</p>
                                    <p className="text-sm text-white font-mono font-bold">{space.lat}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] text-slate-500 uppercase tracking-wider">Longitude</p>
                                    <p className="text-sm text-white font-mono font-bold">{space.lng}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Operating Hours */}
                    {space.hours_json && formatHours(space.hours_json)?.length > 0 && (
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock size={14} className="text-indigo-400" />
                                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-wider">Operating Hours</p>
                            </div>
                            <div className="space-y-1">
                                {formatHours(space.hours_json)}
                            </div>
                            {space.is_open_time && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <p className="text-[8px] text-emerald-400 font-black uppercase flex items-center gap-1">
                                        <Activity size={10} /> Open Time Mode - Timer counts up
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Amenities */}
                    {space.amenities?.length > 0 && (
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-2 mb-4">
                                <Heart size={14} className="text-emerald-400" />
                                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">
                                    Amenities ({space.amenities.length})
                                </p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {space.amenities.map((amenity, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-300">
                                        {getAmenityIcon(amenity)}
                                        <span>{amenity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {space.description && (
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-3">📝 Description</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{space.description}</p>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                        <div className="grid grid-cols-2 gap-4 text-[10px]">
                            <div>
                                <p className="text-slate-500 uppercase tracking-wider">Created At</p>
                                <p className="text-white font-bold">{new Date(space.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 uppercase tracking-wider">Last Updated</p>
                                <p className="text-white font-bold">{new Date(space.updated_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 uppercase tracking-wider">Space ID</p>
                                <p className="text-white font-mono text-[9px]">{space._id}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 uppercase tracking-wider">Occupied Seats</p>
                                <p className="text-white font-bold">{space.occupied_seats || 0} / {space.capacity || 0}</p>
                            </div>
                        </div>
                    </div>

                    {/* Images Gallery */}
                    {space.images?.length > 0 && (
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-3">
                                📸 Image Gallery ({space.images.length})
                            </p>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                {space.images.slice(0, 8).map((img, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-white/5">
                                        <img 
                                            src={getSpaceImage({ ...space, image: img })} 
                                            alt={`${space.name} ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.target.src = '/placeholders/space.jpg'; }}
                                        />
                                    </div>
                                ))}
                                {space.images.length > 8 && (
                                    <div className="relative aspect-square rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
                                        <p className="text-[10px] text-slate-400">+{space.images.length - 8} more</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex gap-3 pt-4 border-t border-white/10">
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            className="flex-1 py-3 bg-white/5 text-white rounded-xl text-[10px] font-black uppercase hover:bg-white/10 transition-all"
                        >
                            Close
                        </Button>
                        <Button
                            onClick={() => {
                                onClose();
                                navigate(`/space/my-spaces/edit/${space._id}`);
                            }}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-500 transition-all"
                        >
                            Edit Space
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
