import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Globe, MapPin, Building2, Users, DoorOpen, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import MapExplorer from '@/pages/Landing/MapExplorer';
import { getSpaceImage } from '@/utils/imageHelper';
import { formatNumber } from '@/utils/formatNumber';
import { useTheme } from '@/hooks/useTheme';

export const SpaceDetailsModal = ({ isOpen, onClose, space }) => {
    const { themeColor } = useTheme();
    const [showMap, setShowMap] = useState(false);

    if (!space) return null;

    const getThemeColorClass = () => {
        const colors = {
            indigo: 'indigo',
            emerald: 'emerald',
            purple: 'purple',
            blue: 'blue',
            rose: 'rose',
            amber: 'amber',
        };
        return colors[themeColor] || 'indigo';
    };

    const color = getThemeColorClass();

    return (
        <Modal open={isOpen} onClose={onClose} title="Hub Specifications" size="lg">
            <div className="space-y-4 py-2">
                {/* Header with Image and Basic Info */}
                <div className="flex items-center justify-between p-5 bg-muted rounded-4xl border border-border">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-border">
                            <img
                                src={getSpaceImage(space)}
                                className="w-full h-full object-cover"
                                alt={space.name}
                                onError={(e) => { e.target.src = '/placeholders/space.jpg'; }}
                            />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-foreground uppercase italic">{space.name}</h2>
                            <p className="text-[9px] font-bold text-primary uppercase tracking-widest">{space.area}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black text-foreground italic tracking-tighter">₱{formatNumber(space.rate_hour)}<span className="text-[10px] text-muted-foreground not-italic">/hr</span></p>
                    </div>
                </div>

                {/* Map Section */}
                <div className="bg-card rounded-4xl border border-border overflow-hidden">
                    <button 
                        onClick={() => setShowMap(!showMap)} 
                        className="w-full p-5 flex items-center justify-between hover:bg-muted/50 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <Globe size={16} className="text-primary" />
                            <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Interactive Location Map</span>
                        </div>
                        <span className={`text-[10px] font-black text-primary uppercase`}>{showMap ? 'Close' : 'Open'}</span>
                    </button>
                    {showMap && (
                        <div className="h-75 w-full animate-in slide-in-from-top-2 border-t border-border">
                            <MapExplorer
                                spaces={[space]}
                                userLatLng={[space.lat, space.lng]}
                            />
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 bg-muted border border-border rounded-2xl text-center">
                        <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Seats</p>
                        <p className="text-sm font-black text-foreground italic">{formatNumber(space.capacity)}</p>
                    </div>
                    <div className="p-4 bg-muted border border-border rounded-2xl text-center">
                        <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Rooms</p>
                        <p className="text-sm font-black text-foreground italic">{formatNumber(space.available_rooms)}</p>
                    </div>
                    <div className="p-4 bg-muted border border-border rounded-2xl text-center">
                        <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Status</p>
                        <p className={`text-sm font-black uppercase tracking-tighter text-${color}-600 dark:text-${color}-400`}>{space.status}</p>
                    </div>
                    <div className="p-4 bg-muted border border-border rounded-2xl text-center">
                        <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Rating</p>
                        <p className="text-sm font-black text-amber-600 dark:text-amber-400 italic">{space.rating || 0} / 5</p>
                    </div>
                </div>

                {/* Close Button */}
                <div className="flex justify-end pt-2">
                    <button 
                        onClick={onClose} 
                        className="text-[9px] font-black uppercase text-muted-foreground hover:text-foreground transition-all tracking-widest"
                    >
                        Dismiss View
                    </button>
                </div>
            </div>
        </Modal>
    );
};