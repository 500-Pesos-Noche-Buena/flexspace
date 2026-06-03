import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, DollarSign, Users, Clock, Calendar, Award, Star, 
         Building, DoorOpen, Wifi, Wind, Sun, Coffee, Tv, Phone, 
         Printer, Car, Shield, Heart, Zap, Home, Activity, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import { getSpaceImage } from '@/utils/imageHelper';
import { useTheme } from '@/hooks/useTheme';

export const ViewSpaceModal = ({ isOpen, onClose, space }) => {
    const navigate = useNavigate();
    const { themeColor } = useTheme();
    
    if (!isOpen || !space) return null;

    const formatHours = (hours_json) => {
        if (!hours_json) return null;
        
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        return days.map((day, index) => {
            const dayData = hours_json[day];
            if (!dayData) return null;
            return (
                <div key={day} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <span className="text-muted-foreground font-medium text-sm">{dayLabels[index]}</span>
                    <div className="text-right">
                        {dayData.active ? (
                            <span className="text-foreground font-bold text-sm">
                                {dayData.open} - {dayData.close}
                            </span>
                        ) : (
                            <span className="text-rose-500 dark:text-rose-400 text-xs font-bold">Closed</span>
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

    const getButtonColor = () => {
        const colors = {
            indigo: 'bg-indigo-600 hover:bg-indigo-500',
            emerald: 'bg-emerald-600 hover:bg-emerald-500',
            purple: 'bg-purple-600 hover:bg-purple-500',
            blue: 'bg-blue-600 hover:bg-blue-500',
            rose: 'bg-rose-600 hover:bg-rose-500',
            amber: 'bg-amber-600 hover:bg-amber-500',
        };
        return colors[themeColor] || colors.indigo;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
            
            {/* Modal Content */}
            <div className="relative bg-card rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 border border-border shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Space Details</h2>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Complete information about this workspace</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    
                    {/* Hero Section with Main Image */}
                    <div className="relative rounded-xl overflow-hidden bg-linear-to-r from-primary/20 to-purple-500/20">
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
                        <h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-2">{space.name}</h3>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin size={14} />
                            <span className="text-sm">{space.area || 'Location not set'}</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-muted rounded-xl p-4 text-center border border-border">
                            <DollarSign size={18} className="text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                            <p className="text-[9px] text-muted-foreground font-black uppercase">Hourly Rate</p>
                            <p className="text-xl font-black text-foreground">₱{space.rate_hour}<span className="text-xs">/hr</span></p>
                        </div>
                        <div className="bg-muted rounded-xl p-4 text-center border border-border">
                            <Users size={18} className="text-primary mx-auto mb-2" style={{ color: `var(--theme-primary)` }} />
                            <p className="text-[9px] text-muted-foreground font-black uppercase">Total Capacity</p>
                            <p className="text-xl font-black text-foreground">{space.capacity || 0}</p>
                        </div>
                        <div className="bg-muted rounded-xl p-4 text-center border border-border">
                            <DoorOpen size={18} className="text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                            <p className="text-[9px] text-muted-foreground font-black uppercase">Available Rooms</p>
                            <p className="text-xl font-black text-foreground">{space.available_rooms || 'N/A'}</p>
                        </div>
                        <div className="bg-muted rounded-xl p-4 text-center border border-border">
                            <Building size={18} className="text-amber-600 dark:text-amber-400 mx-auto mb-2" />
                            <p className="text-[9px] text-muted-foreground font-black uppercase">Total Rooms</p>
                            <p className="text-xl font-black text-foreground">{space.room_count || 0}</p>
                        </div>
                    </div>

                    {/* Location Coordinates */}
                    {(space.lat && space.lng) && (
                        <div className="bg-muted/50 rounded-xl p-4 border border-border">
                            <div className="flex items-center gap-2 mb-3">
                                <MapPin size={14} className="text-primary" style={{ color: `var(--theme-primary)` }} />
                                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: `var(--theme-primary)` }}>📍 Location Coordinates</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Latitude</p>
                                    <p className="text-sm text-foreground font-mono font-bold">{space.lat}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Longitude</p>
                                    <p className="text-sm text-foreground font-mono font-bold">{space.lng}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Operating Hours */}
                    {space.hours_json && formatHours(space.hours_json)?.length > 0 && (
                        <div className="bg-muted rounded-xl p-4 border border-border">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock size={14} className="text-primary" style={{ color: `var(--theme-primary)` }} />
                                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: `var(--theme-primary)` }}>Operating Hours</p>
                            </div>
                            <div className="space-y-1">
                                {formatHours(space.hours_json)}
                            </div>
                            {space.is_open_time && (
                                <div className="mt-3 pt-3 border-t border-border">
                                    <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase flex items-center gap-1">
                                        <Activity size={10} /> Open Time Mode - Timer counts up
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Amenities */}
                    {space.amenities?.length > 0 && (
                        <div className="bg-muted rounded-xl p-4 border border-border">
                            <div className="flex items-center gap-2 mb-4">
                                <Heart size={14} className="text-emerald-600 dark:text-emerald-400" />
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider">
                                    Amenities ({space.amenities.length})
                                </p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {space.amenities.map((amenity, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                        {getAmenityIcon(amenity)}
                                        <span>{amenity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {space.description && (
                        <div className="bg-muted rounded-xl p-4 border border-border">
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mb-3">📝 Description</p>
                            <p className="text-sm text-foreground/80 leading-relaxed">{space.description}</p>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="bg-muted/50 rounded-xl p-4 border border-border">
                        <div className="grid grid-cols-2 gap-4 text-[10px]">
                            <div>
                                <p className="text-muted-foreground uppercase tracking-wider">Created At</p>
                                <p className="text-foreground font-bold">{new Date(space.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground uppercase tracking-wider">Last Updated</p>
                                <p className="text-foreground font-bold">{new Date(space.updated_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground uppercase tracking-wider">Space ID</p>
                                <p className="text-foreground font-mono text-[9px]">{space._id}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground uppercase tracking-wider">Occupied Seats</p>
                                <p className="text-foreground font-bold">{space.occupied_seats || 0} / {space.capacity || 0}</p>
                            </div>
                        </div>
                    </div>

                    {/* Images Gallery */}
                    {space.images?.length > 0 && (
                        <div className="bg-muted rounded-xl p-4 border border-border">
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mb-3">
                                📸 Image Gallery ({space.images.length})
                            </p>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                {space.images.slice(0, 8).map((img, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                                        <img 
                                            src={getSpaceImage({ ...space, image: img })} 
                                            alt={`${space.name} ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.target.src = '/placeholders/space.jpg'; }}
                                        />
                                    </div>
                                ))}
                                {space.images.length > 8 && (
                                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                                        <p className="text-[10px] text-muted-foreground">+{space.images.length - 8} more</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex gap-3 pt-4 border-t border-border">
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            className="flex-1 py-3 bg-muted text-foreground rounded-xl text-[10px] font-black uppercase hover:bg-muted/80 transition-all"
                        >
                            Close
                        </Button>
                        <Button
                            onClick={() => {
                                onClose();
                                navigate(`/space/my-spaces/edit/${space._id}`);
                            }}
                            className={cn(
                                "flex-1 py-3 text-white rounded-xl text-[10px] font-black uppercase transition-all",
                                getButtonColor()
                            )}
                        >
                            Edit Space
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};