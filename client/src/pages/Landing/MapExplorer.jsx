import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';

const MapExplorer = ({ spaces = [], userLatLng, onMarkerClick, focusedSpace }) => {
    const mapRef = useRef(null);
    const markersRef = useRef(L.featureGroup());
    const userMarkerRef = useRef(null);
    const boundaryRef = useRef(null);

    const ILOILO_CENTER = [10.7202, 122.5621];

    const isValid = (coords) => Array.isArray(coords) && coords.length === 2 &&
        typeof coords[0] === 'number' && !isNaN(coords[0]) &&
        typeof coords[1] === 'number' && !isNaN(coords[1]);

    const handleLocateMe = () => {
        if (mapRef.current && isValid(userLatLng)) {
            const [lat, lng] = userLatLng;
            mapRef.current.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
        }
    };

    // INIT MAP
    useEffect(() => {
        if (!mapRef.current) {
            mapRef.current = L.map('map-container', {
                zoomControl: false,
                attributionControl: false
            }).setView(ILOILO_CENTER, 13);

            L.tileLayer(
                'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                { maxZoom: 19 }
            ).addTo(mapRef.current);

            markersRef.current.addTo(mapRef.current);
            L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

            // LOAD PURPLE LINE BOUNDARY
            fetch('/iloilo-boundary.json')
                .then(res => res.json())
                .then(data => {
                    if (boundaryRef.current) mapRef.current.removeLayer(boundaryRef.current);
                    boundaryRef.current = L.geoJSON(data, {
                        style: { color: '#a855f7', weight: 5, opacity: 0.8, fill: false }
                    }).addTo(mapRef.current);
                    boundaryRef.current.bringToFront();
                    mapRef.current.fitBounds(boundaryRef.current.getBounds(), { padding: [30, 30] });
                })
                .catch(err => console.error("Boundary load error:", err));
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                userMarkerRef.current = null;
                boundaryRef.current = null;
            }
        };
    }, []);

    // MARKERS
    useEffect(() => {
        if (!mapRef.current) return;
        markersRef.current.clearLayers();

        spaces.forEach(s => {
            if (!isValid([s.lat, s.lng])) return;

            const marker = L.circleMarker([s.lat, s.lng], {
                radius: 8,
                fillColor: '#4f46e5',
                color: '#fff',
                weight: 2,
                fillOpacity: 1
            })
            .bindPopup(`<div class="font-black text-[10px] p-1 uppercase italic tracking-tighter">
                            ${s.name}<br/>
                            <span class="text-indigo-600">₱${s.rate_hour}/hr</span>
                        </div>`)
            .addTo(markersRef.current);

            // ✅ Click marker -> fly to
            marker.on('click', () => {
                if (mapRef.current) mapRef.current.flyTo([s.lat, s.lng], 17, { animate: true });
                onMarkerClick && onMarkerClick(s);
            });
        });
    }, [spaces]);

    // USER LOCATION
    useEffect(() => {
        if (!mapRef.current || !isValid(userLatLng)) return;
        const [lat, lng] = userLatLng;

        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: `
                <div class="relative flex items-center justify-center">
                    <div class="absolute w-10 h-10 bg-purple-500 rounded-full animate-ping opacity-20"></div>
                    <div class="relative w-4 h-4 bg-purple-600 border-2 border-white rounded-full shadow-lg"></div>
                    <div class="absolute -top-10 bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase whitespace-nowrap shadow-2xl">
                        You are here
                    </div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        if (!userMarkerRef.current) {
            userMarkerRef.current = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
            mapRef.current.flyTo([lat, lng], 15);
        } else {
            userMarkerRef.current.setLatLng([lat, lng]);
        }
    }, [userLatLng]);

    // ✅ FOCUS SPACE (click from sidebar)
    useEffect(() => {
        if (!mapRef.current || !focusedSpace || !isValid([focusedSpace.lat, focusedSpace.lng])) return;
        mapRef.current.flyTo([focusedSpace.lat, focusedSpace.lng], 17, { animate: true });
    }, [focusedSpace]);

    return (
        <div className="relative w-full h-full min-h-[300px]">
            <div id="map-container" className="w-full h-full bg-[#f8fafc] rounded-b-[2rem] overflow-hidden" />

            {/* Locate Button */}
            {isValid(userLatLng) && (
                <button
                    onClick={handleLocateMe}
                    className="absolute top-4 right-4 z-[1000] bg-white p-3 rounded-2xl shadow-2xl border border-slate-100 text-purple-600 active:scale-90 transition-all hover:bg-slate-50"
                >
                    <Navigation size={20} fill="currentColor" />
                </button>
            )}
        </div>
    );
};

export default MapExplorer;