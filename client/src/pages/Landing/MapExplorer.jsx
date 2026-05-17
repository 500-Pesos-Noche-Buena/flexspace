import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';

const MARKER_STYLES = `
  .space-marker-custom {
    background: transparent !important;
    border: none !important;
  }

  .space-marker-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.18));
    transition: transform 0.2s ease;
    cursor: pointer;
  }

  .space-marker-wrapper:hover {
    transform: scale(1.05);
  }

  /* LABEL HIDDEN BY DEFAULT - ONLY SHOWS WHEN MARKER IS ACTIVE/CLICKED */
  .space-label {
    display: none;
    flex-direction: column;
    align-items: center;
    background: #0f172a;
    border-radius: 10px;
    padding: 5px 10px 4px;
    position: relative;
    white-space: nowrap;
    min-width: 80px;
    max-width: 160px;
  }

  .space-label::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #0f172a;
  }

  /* SHOW LABEL WHEN MARKER IS CLICKED (ACTIVE) */
  .space-marker-active .space-label {
    display: flex;
  }

  /* SHOW LABEL WHEN FOCUSED FROM PARENT */
  .space-marker-focused .space-label {
    display: flex;
  }

  .space-name {
    font-size: 10px;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: 0.02em;
    line-height: 1.2;
    text-align: center;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 140px;
  }

  .space-rate {
    font-size: 9px;
    font-weight: 700;
    color: #818cf8;
    letter-spacing: 0.01em;
    line-height: 1.2;
    display: block;
    text-align: center;
  }

  .space-pin {
    width: 10px;
    height: 10px;
    background: #6366f1;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 0 0 2px #6366f1;
    margin-top: 3px;
    transition: all 0.3s ease;
  }

  .space-marker-focused .space-label {
    background: #4f46e5;
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(79,70,229,0.4);
  }

  .space-marker-focused .space-label::after {
    border-top-color: #4f46e5;
  }

  .space-marker-focused .space-pin {
    background: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79,70,229,0.5);
    transform: scale(1.2);
  }
  
  .space-marker-active .space-pin {
    background: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79,70,229,0.5);
    transform: scale(1.1);
  }
  
  .space-marker-active .space-label {
    background: #4f46e5;
  }
  
  .space-marker-active .space-label::after {
    border-top-color: #4f46e5;
  }

  .user-location-marker {
    background: transparent !important;
    border: none !important;
  }

  .leaflet-popup-content-wrapper {
    border-radius: 14px !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.14) !important;
    border: 1px solid rgba(0,0,0,0.06) !important;
    padding: 0 !important;
  }

  .leaflet-popup-content {
    margin: 0 !important;
    padding: 0 !important;
  }

  .leaflet-popup-tip-container {
    display: none;
  }
`;

const MapExplorer = ({ spaces = [], userLatLng, onMarkerClick, focusedSpace }) => {
    const mapRef = useRef(null);
    const markersRef = useRef({});
    const userMarkerRef = useRef(null);
    const boundaryRef = useRef(null);
    const styleRef = useRef(null);
    const flyToTimeoutRef = useRef(null);
    const activeMarkerIdRef = useRef(null);

    const parseCoord = (coord) => {
        if (coord === null || coord === undefined) return NaN;
        if (typeof coord === 'number') return coord;
        if (typeof coord === 'string') {
            const parsed = parseFloat(coord);
            return isNaN(parsed) ? NaN : parsed;
        }
        return NaN;
    };

    const isValid = (coords) => {
        if (!Array.isArray(coords) || coords.length !== 2) return false;
        const [lat, lng] = coords;
        const parsedLat = parseCoord(lat);
        const parsedLng = parseCoord(lng);
        return !isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0;
    };

    const getValidCoordinates = (coords) => {
        if (!Array.isArray(coords) || coords.length !== 2) return null;
        const lat = parseCoord(coords[0]);
        const lng = parseCoord(coords[1]);
        if (isNaN(lat) || isNaN(lng)) return null;
        return [lat, lng];
    };

    const ILOILO_CENTER = useMemo(() => [10.7202, 122.5621], []);

    const handleLocateMe = () => {
        if (mapRef.current && isValid(userLatLng)) {
            const coords = getValidCoordinates(userLatLng);
            if (coords) {
                mapRef.current.flyTo(coords, 16, { animate: true, duration: 1.5 });
            }
        }
    };

    const safeFlyTo = (lat, lng, zoom = 17, duration = 1) => {
        if (!mapRef.current) return false;

        const validLat = parseCoord(lat);
        const validLng = parseCoord(lng);

        if (isNaN(validLat) || isNaN(validLng)) return false;

        const size = mapRef.current.getSize();
        if (!size || size.x === 0 || size.y === 0) {
            console.warn("⚠️ Map has no size, skipping flyTo");
            return false;
        }

        try {
            mapRef.current.flyTo([validLat, validLng], zoom, {
                animate: true,
                duration: duration,
                easeLinearity: 0.5
            });
            return true;
        } catch (error) {
            console.error("❌ FlyTo error:", error);
            return false;
        }
    };

    // Clear previously active marker
    const clearActiveMarker = () => {
        if (activeMarkerIdRef.current && markersRef.current[activeMarkerIdRef.current]) {
            const prevMarker = markersRef.current[activeMarkerIdRef.current];
            if (prevMarker && prevMarker._icon) {
                prevMarker._icon.classList.remove('space-marker-active');
            }
            activeMarkerIdRef.current = null;
        }
    };

    useEffect(() => {
        if (!mapRef.current) return;
        const timer = setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
        }, 100);
        return () => clearTimeout(timer);
    });

    useEffect(() => {
        if (!styleRef.current) {
            const tag = document.createElement('style');
            tag.textContent = MARKER_STYLES;
            document.head.appendChild(tag);
            styleRef.current = tag;
        }
        return () => {
            if (styleRef.current) {
                styleRef.current.remove();
                styleRef.current = null;
            }
        };
    }, []);

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

            L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

            fetch('/iloilo-boundary.json')
                .then(res => res.json())
                .then(data => {
                    if (boundaryRef.current && mapRef.current) mapRef.current.removeLayer(boundaryRef.current);
                    boundaryRef.current = L.geoJSON(data, {
                        style: { color: '#a855f7', weight: 5, opacity: 0.8, fill: false }
                    }).addTo(mapRef.current);
                    boundaryRef.current.bringToFront();
                    if (mapRef.current && boundaryRef.current.getBounds()) {
                        mapRef.current.fitBounds(boundaryRef.current.getBounds(), { padding: [30, 30] });
                    }
                })
                .catch(err => console.error("Boundary load error:", err));
        }

        return () => {
            if (flyToTimeoutRef.current) {
                clearTimeout(flyToTimeoutRef.current);
            }
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                userMarkerRef.current = null;
                boundaryRef.current = null;
            }
        };
    }, [ILOILO_CENTER]);

    // MARKERS - label hidden by default, shows on click only
    useEffect(() => {
        if (!mapRef.current) return;

        // Clear existing markers
        Object.values(markersRef.current).forEach(marker => {
            if (marker && mapRef.current) {
                marker.remove();
            }
        });
        markersRef.current = {};
        activeMarkerIdRef.current = null;

        spaces.forEach(space => {
            const lat = parseCoord(space.lat);
            const lng = parseCoord(space.lng);

            if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                console.warn(`⚠️ Skipping marker for "${space.name}" - invalid coordinates:`, { lat, lng });
                return;
            }

            const isFocused = focusedSpace?._id === space._id;
            const shortName = space.name.length > 22 ? space.name.substring(0, 20) + '…' : space.name;

            const customIcon = L.divIcon({
                className: `space-marker-custom${isFocused ? ' space-marker-focused' : ''}`,
                html: `
                    <div class="space-marker-wrapper">
                        <div class="space-label">
                            <span class="space-name">${shortName.replace(/'/g, "\\'")}</span>
                            <span class="space-rate">₱${space.rate_hour}/hr</span>
                        </div>
                        <div class="space-pin"></div>
                    </div>
                `,
                iconSize: [160, 56],
                iconAnchor: [80, 56],
                popupAnchor: [0, -58]
            });

            const marker = L.marker([lat, lng], { icon: customIcon })
                .bindPopup(`
                    <div style="padding:12px 14px;min-width:140px;">
                        <div style="font-size:11px;font-weight:900;color:#4f46e5;margin-bottom:3px;">${space.name.replace(/'/g, "\\'")}</div>
                        <div style="font-size:10px;font-weight:700;color:#64748b;">₱${space.rate_hour}/hour</div>
                        ${space.distance ? `<div style="font-size:9px;color:#94a3b8;margin-top:3px;">${space.distance.toFixed(1)}km away</div>` : ''}
                    </div>
                `)
                .addTo(mapRef.current);

            // Click handler - show label, fly to, open popup
            marker.on('click', () => {
                console.log("📍 Marker clicked:", space.name, { lat, lng });
                
                // Clear previous active marker
                clearActiveMarker();
                
                // Mark this marker as active (shows the label)
                if (marker._icon) {
                    marker._icon.classList.add('space-marker-active');
                    activeMarkerIdRef.current = space._id;
                }
                
                safeFlyTo(lat, lng, 17, 0.8);
                if (onMarkerClick) onMarkerClick(space);
            });

            markersRef.current[space._id] = marker;
        });
        
        // Click on map to clear active marker (hide all labels)
        if (mapRef.current) {
            mapRef.current.on('click', function() {
                clearActiveMarker();
            });
        }
    }, [spaces, onMarkerClick]);

    // UPDATE focused marker style
    useEffect(() => {
        if (!mapRef.current) return;

        Object.entries(markersRef.current).forEach(([id, marker]) => {
            if (marker && marker._icon) {
                const isFocused = focusedSpace?._id === id;
                const container = marker._icon;

                if (isFocused) {
                    container.classList.add('space-marker-focused');
                    // Also clear any active marker that's not focused
                    if (activeMarkerIdRef.current && activeMarkerIdRef.current !== id) {
                        clearActiveMarker();
                    }
                } else {
                    container.classList.remove('space-marker-focused');
                }
            }
        });
    }, [focusedSpace]);

    useEffect(() => {
        if (!mapRef.current || !focusedSpace) return;

        const lat = parseCoord(focusedSpace.lat);
        const lng = parseCoord(focusedSpace.lng);

        if (isNaN(lat) || isNaN(lng)) return;

        if (flyToTimeoutRef.current) clearTimeout(flyToTimeoutRef.current);

        flyToTimeoutRef.current = setTimeout(() => {
            if (!mapRef.current) return;
            mapRef.current.invalidateSize();
            const success = safeFlyTo(lat, lng, 17, 1);
            if (success) {
                flyToTimeoutRef.current = setTimeout(() => {
                    const marker = markersRef.current[focusedSpace._id];
                    if (marker) marker.openPopup();
                    flyToTimeoutRef.current = null;
                }, 1000);
            }
        }, 150);

    }, [focusedSpace]);

    // USER LOCATION
    useEffect(() => {
        if (!mapRef.current || !isValid(userLatLng)) return;

        const coords = getValidCoordinates(userLatLng);
        if (!coords) return;

        const [lat, lng] = coords;

        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: `
                <div style="position:relative;display:flex;align-items:center;justify-content:center;width:40px;height:40px;">
                    <div style="position:absolute;width:40px;height:40px;background:#a855f7;border-radius:50%;opacity:0.18;animation:ping 1.5s ease-out infinite;"></div>
                    <div style="position:relative;width:14px;height:14px;background:#9333ea;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(147,51,234,0.5);"></div>
                    <div style="position:absolute;bottom:100%;margin-bottom:4px;background:#0f172a;color:#fff;font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;letter-spacing:0.05em;white-space:nowrap;">YOU</div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        if (!userMarkerRef.current) {
            userMarkerRef.current = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
            if (!focusedSpace) {
                safeFlyTo(lat, lng, 15, 1);
            }
        } else {
            userMarkerRef.current.setLatLng([lat, lng]);
        }
    }, [userLatLng, focusedSpace]);

    return (
        <div className="relative w-full h-full min-h-75 group">
            <div id="map-container" className="w-full h-full bg-[#f8fafc] rounded-b-4xl overflow-hidden border-t border-white/5" />

            {isValid(userLatLng) && (
                <button
                    onClick={handleLocateMe}
                    className="absolute top-4 right-4 z-1000 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-white text-purple-600 active:scale-90 transition-all hover:bg-white"
                >
                    <Navigation size={20} fill="currentColor" />
                </button>
            )}
        </div>
    );
};

export default MapExplorer;