import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react'; // For the Locate Me icon

const MapExplorer = ({ spaces = [], userLatLng, onMarkerClick }) => {
    const mapRef = useRef(null);
    const markersRef = useRef(L.featureGroup());
    const userMarkerRef = useRef(null);

    const ILOILO_CENTER = [10.7202, 122.5621];

    const iloiloLandBoundary = [
        [10.6865, 122.5115], [10.6952, 122.5034], [10.7081, 122.5085], [10.7185, 122.5202],
        [10.7350, 122.5310], [10.7521, 122.5450], [10.7650, 122.5650], [10.7710, 122.5850],
        [10.7580, 122.6020], [10.7420, 122.6080], [10.7250, 122.5950], [10.7100, 122.5880],
        [10.6980, 122.5850], [10.6850, 122.5750], [10.6750, 122.5550], [10.6800, 122.5300],
        [10.6865, 122.5115]
    ];

    // Function to handle automatic zoom to user
    const handleLocateMe = () => {
        if (mapRef.current && userLatLng) {
            mapRef.current.flyTo(userLatLng, 16, {
                animate: true,
                duration: 1.5
            });
        } else {
            alert("Waiting for GPS signal...");
        }
    };

    useEffect(() => {
        if (!mapRef.current) {
            mapRef.current = L.map('map-container', { 
                zoomControl: false, // We'll move it or keep it clean
                scrollWheelZoom: true 
            }).setView(ILOILO_CENTER, 14); // ZOOM IN STRAIGHT TO ILOILO
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(mapRef.current);

            // Add back your Iloilo styling
            L.polygon(iloiloLandBoundary, {
                color: '#6366f1',
                weight: 2,
                opacity: 0.3,
                fillColor: '#6366f1',
                fillOpacity: 0.05,
                interactive: false
            }).addTo(mapRef.current);

            markersRef.current.addTo(mapRef.current);
            
            // Move zoom control to bottom right (Better for Mobile)
            L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
        }

        setTimeout(() => {
            mapRef.current?.invalidateSize();
        }, 200);

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Handle Spaces Markers
    useEffect(() => {
        if (!mapRef.current || !spaces) return;
        markersRef.current.clearLayers();

        spaces.forEach(s => {
            const m = L.circleMarker([s.lat, s.lng], {
                radius: 8,
                fillColor: '#4f46e5',
                color: '#fff',
                weight: 2,
                fillOpacity: 1
            })
            .bindPopup(`<div class="font-black text-xs p-1">${s.name}<br/><span class="text-indigo-600">₱${s.rate}/hr</span></div>`)
            .addTo(markersRef.current);

            m.on('click', () => {
                mapRef.current.flyTo([s.lat, s.lng], 16);
                if (onMarkerClick) onMarkerClick(s);
            });
        });
    }, [spaces, onMarkerClick]);

    // Inside MapExplorer.jsx - Update the user location useEffect
    useEffect(() => {
        // Check if map exists AND userLatLng has valid numbers
        if (!mapRef.current || !userLatLng || isNaN(userLatLng[0]) || isNaN(userLatLng[1])) return;

        if (!userMarkerRef.current) {
            const userIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="relative flex items-center justify-center">
                        <div class="absolute w-8 h-8 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
                        <div class="relative w-4 h-4 bg-indigo-600 border-2 border-white rounded-full shadow-lg"></div>
                    </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            userMarkerRef.current = L.marker(userLatLng, { icon: userIcon })
                .addTo(mapRef.current)
                .bindPopup("<span class='font-bold'>You are here</span>");
            
            // Safety check before flying
            mapRef.current.flyTo(userLatLng, 15);
        } else {
            userMarkerRef.current.setLatLng(userLatLng);
        }
    }, [userLatLng]);

    return (
        <div className="relative w-full h-full min-h-75">
            {/* THE MAP */}
            <div id="map-container" className="w-full h-full bg-slate-100" />

            {/* AUTOMATIC ZOOM / LOCATE ME BUTTON */}
            {userLatLng && (
                <button 
                    onClick={handleLocateMe}
                    className="absolute top-4 right-4 z-1000 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 text-indigo-600 active:scale-90 transition-all hover:bg-indigo-50"
                    title="Find my location"
                >
                    <Navigation size={20} fill="currentColor" />
                </button>
            )}
            
            {/* Label */}
            <div className="absolute bottom-4 left-4 z-1000 bg-slate-900/80 backdrop-blur text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                Iloilo City Core
            </div>
        </div>
    );
};

export default MapExplorer;