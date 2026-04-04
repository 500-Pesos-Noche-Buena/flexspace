import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';

const MapExplorer = ({ spaces = [], userLatLng, onMarkerClick }) => {
    const mapRef = useRef(null);
    const markersRef = useRef(L.featureGroup());
    const userMarkerRef = useRef(null);

    const ILOILO_CENTER = [10.7202, 122.5621];

    // Helper to strictly validate coordinates
    const isValid = (coords) => {
        return Array.isArray(coords) && 
               coords.length === 2 && 
               typeof coords[0] === 'number' && !isNaN(coords[0]) && 
               typeof coords[1] === 'number' && !isNaN(coords[1]);
    };

    const handleLocateMe = () => {
        // FIX: Verify numbers exist before triggering flyTo
        if (mapRef.current && isValid(userLatLng)) {
            const [lat, lng] = userLatLng;
            mapRef.current.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
        }
    };

    useEffect(() => {
        if (!mapRef.current) {
            mapRef.current = L.map('map-container', { 
                zoomControl: false,
                attributionControl: false 
            }).setView(ILOILO_CENTER, 14);
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
            markersRef.current.addTo(mapRef.current);
            L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
        }
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                userMarkerRef.current = null;
            }
        };
    }, []);

    // Space Markers
    useEffect(() => {
        if (!mapRef.current) return;
        markersRef.current.clearLayers();
        spaces.forEach(s => {
            if (isValid([s.lat, s.lng])) {
                const m = L.circleMarker([s.lat, s.lng], {
                    radius: 8, fillColor: '#4f46e5', color: '#fff', weight: 2, fillOpacity: 1
                })
                .bindPopup(`<div class="font-black text-xs p-1">${s.name}<br/><span class="text-indigo-600">₱${s.rate_hour}/hr</span></div>`)
                .addTo(markersRef.current);
                m.on('click', () => onMarkerClick && onMarkerClick(s));
            }
        });
    }, [spaces]);

    // "You are Here" Marker Logic
    useEffect(() => {
        if (!mapRef.current || !isValid(userLatLng)) return;

        const [lat, lng] = userLatLng;

        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: `
                <div class="relative flex items-center justify-center">
                    <div class="absolute w-10 h-10 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
                    <div class="relative w-4 h-4 bg-indigo-600 border-2 border-white rounded-full shadow-lg"></div>
                    <div class="absolute -top-10 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase whitespace-nowrap shadow-2xl">
                        You are here
                    </div>
                </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        try {
            if (!userMarkerRef.current) {
                userMarkerRef.current = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
                mapRef.current.flyTo([lat, lng], 15);
            } else {
                userMarkerRef.current.setLatLng([lat, lng]);
            }
        } catch (e) {
            console.warn("Leaflet animation frame skipped to prevent crash.");
        }
    }, [userLatLng]);

    return (
        <div className="relative w-full h-full min-h-75">
            <div id="map-container" className="w-full h-full bg-slate-100" />
            {/* Button ONLY appears if location is valid */}
            {isValid(userLatLng) && (
                <button 
                    onClick={handleLocateMe} 
                    className="absolute top-4 right-4 z-1000 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 text-indigo-600 active:scale-90 transition-all"
                >
                    <Navigation size={22} fill="currentColor" />
                </button>
            )}
        </div>
    );
};

export default MapExplorer;