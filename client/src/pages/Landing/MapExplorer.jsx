import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix: Default props to prevent "cannot read property forEach of undefined"
const MapExplorer = ({ spaces = [], userLatLng, onMarkerClick }) => {
    const mapRef = useRef(null);
    const markersRef = useRef(L.featureGroup());
    const userMarkerRef = useRef(null);

    const iloiloLandBoundary = [
        [10.6865, 122.5115], [10.6952, 122.5034], [10.7081, 122.5085], [10.7185, 122.5202],
        [10.7350, 122.5310], [10.7521, 122.5450], [10.7650, 122.5650], [10.7710, 122.5850],
        [10.7580, 122.6020], [10.7420, 122.6080], [10.7250, 122.5950], [10.7100, 122.5880],
        [10.6980, 122.5850], [10.6850, 122.5750], [10.6750, 122.5550], [10.6800, 122.5300],
        [10.6865, 122.5115]
    ];

    useEffect(() => {
        if (!mapRef.current) {
            // Ensure the element exists before initializing
            mapRef.current = L.map('map-container', { 
                zoomControl: true,
                scrollWheelZoom: false // Better for landing pages so users can scroll down
            }).setView([10.7202, 122.5621], 13);
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(mapRef.current);

            L.polygon(iloiloLandBoundary, {
                color: '#6366f1',
                weight: 2,
                opacity: 0.5,
                fillColor: '#6366f1',
                fillOpacity: 0.05,
                interactive: false
            }).addTo(mapRef.current);

            markersRef.current.addTo(mapRef.current);
        }

        // Trigger a resize to fix grey tiles
        setTimeout(() => {
            mapRef.current?.invalidateSize();
        }, 100);

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!mapRef.current || !spaces) return;
        markersRef.current.clearLayers();

        spaces.forEach(s => {
            const m = L.circleMarker([s.lat, s.lng], {
                radius: 7,
                fillColor: '#0f172a',
                color: '#fff',
                weight: 2,
                fillOpacity: 1
            })
            .bindPopup(`<div class="font-bold p-1">${s.name}</div>`)
            .addTo(markersRef.current);

            m.on('click', () => onMarkerClick && onMarkerClick(s));
        });

        if (spaces.length > 0 && !userLatLng) {
            mapRef.current.fitBounds(markersRef.current.getBounds().pad(0.2));
        }
    }, [spaces, userLatLng, onMarkerClick]);

    useEffect(() => {
        if (!mapRef.current || !userLatLng) return;

        if (!userMarkerRef.current) {
            userMarkerRef.current = L.marker(userLatLng).addTo(mapRef.current).bindPopup("You are here");
        } else {
            userMarkerRef.current.setLatLng(userLatLng);
        }
    }, [userLatLng]);

    // Fix: Ensure height is forced
    return <div id="map-container" className="w-full h-full min-h-75 bg-slate-100" />;
};

export default MapExplorer;