import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';
import { CompassPlugin } from '@photo-sphere-viewer/compass-plugin';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';

// PhotoSphereViewer CSS
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/virtual-tour-plugin/index.css';
import '@photo-sphere-viewer/compass-plugin/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';

import {
    Compass,
    DoorOpen,
    Building2,
    Maximize2,
    RotateCcw,
    HelpCircle,
    Info,
    Calendar,
    ChevronRight,
    Sparkles,
    X,
    Loader2
} from 'lucide-react';

// Guard against in-flight promises when React mounts/unmounts in dev/Strict mode
if (VirtualTourPlugin?.prototype && !VirtualTourPlugin.prototype.__patchedSafeDestroy) {
    VirtualTourPlugin.prototype.__patchedSafeDestroy = true;
    const origDestroy = VirtualTourPlugin.prototype.destroy;
    VirtualTourPlugin.prototype.destroy = function () {
        const dummyDatasource = {
            loadNode: () => {
                const abortErr = new Error('Loading aborted');
                abortErr.name = 'AbortError';
                return Promise.reject(abortErr);
            },
            destroy: () => {},
            clearCache: () => {},
            setNodes: () => {},
            nodes: {}
        };
        try {
            if (this.datasource && typeof this.datasource.destroy === 'function') {
                this.datasource.destroy();
            }
        } catch (e) {}
        this.datasource = dummyDatasource;
        try {
            origDestroy.call(this);
        } catch (e) {}
        this.datasource = dummyDatasource;
    };
}

/**
 * VirtualTourViewer Component
 *
 * Implements an interactive 360° virtual walkthrough tour using PhotoSphereViewer,
 * with 3D floor navigation arrows, interactive orientation compass, scene thumbnail navigation,
 * room booking hooks, and complete WebGL memory cleanup.
 */
export const VirtualTourViewer = ({
    virtualTour,
    spaceName = 'Space',
    rooms = [],
    onBookRoom,
    onBookSpace,
    onBackToGallery
}) => {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const tourPluginRef = useRef(null);

    const [currentNodeId, setCurrentNodeId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showInstructions, setShowInstructions] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const nodes = useMemo(() => {
        if (!virtualTour?.nodes || !Array.isArray(virtualTour.nodes) || virtualTour.nodes.length === 0) {
            return [];
        }
        return virtualTour.nodes;
    }, [virtualTour]);

    const hasTour = virtualTour?.enabled !== false && nodes.length > 0;

    // Determine initial node ID
    const initialNodeId = useMemo(() => {
        if (!hasTour) return null;
        if (virtualTour?.initial_node_id && nodes.some(n => n.id === virtualTour.initial_node_id)) {
            return virtualTour.initial_node_id;
        }
        return nodes[0].id;
    }, [hasTour, virtualTour, nodes]);

    // Current active node object
    const currentNode = useMemo(() => {
        if (!nodes || nodes.length === 0) return null;
        return nodes.find(n => n.id === currentNodeId) || nodes[0];
    }, [nodes, currentNodeId]);

    // Check if the current node corresponds to a specific room
    const currentRoom = useMemo(() => {
        if (!currentNode || !rooms || rooms.length === 0) return null;
        if (currentNode.room_id) {
            return rooms.find(r => String(r._id) === String(currentNode.room_id)) || null;
        }
        if (currentNode.room_name) {
            return rooms.find(r => r.name?.toLowerCase() === currentNode.room_name?.toLowerCase()) || null;
        }
        return null;
    }, [currentNode, rooms]);

    // Format nodes for PhotoSphereViewer VirtualTourPlugin
    const formattedNodes = useMemo(() => {
        return nodes.map(node => ({
            id: node.id,
            panorama: node.panorama,
            name: node.name,
            thumbnail: node.thumbnail || node.panorama,
            caption: node.caption || node.name,
            links: (node.links || []).map(link => ({
                nodeId: link.nodeId,
                position: {
                    yaw: link.yaw,
                    pitch: link.pitch ?? -0.2
                },
                tooltip: link.tooltip || `Go to ${nodes.find(n => n.id === link.nodeId)?.name || 'next room'}`
            })),
            markers: (node.markers || []).map(marker => ({
                id: marker.id,
                position: {
                    yaw: marker.yaw,
                    pitch: marker.pitch ?? 0
                },
                html: marker.html,
                tooltip: marker.tooltip
            }))
        }));
    }, [nodes]);

    useEffect(() => {
        if (!hasTour || !containerRef.current || formattedNodes.length === 0) {
            return;
        }

        setIsLoading(true);
        setCurrentNodeId(initialNodeId);

        let viewerInstance = null;

        try {
            viewerInstance = new Viewer({
                container: containerRef.current,
                loadingImg: null,
                touchmoveTwoFingers: false,
                mousewheelCtrlKey: false,
                navbar: [
                    'zoom',
                    'move',
                    'fullscreen'
                ],
                plugins: [
                    [MarkersPlugin, {}],
                    [CompassPlugin, {
                        size: '96px',
                        position: 'top right',
                        navigation: true,
                        resetPitch: false
                    }],
                    [VirtualTourPlugin, {
                        dataMode: 'client',
                        positionMode: 'manual',
                        renderMode: '3d',
                        nodes: formattedNodes.map(n => ({
                            ...n,
                            links: (n.links || []).map(l => ({ ...l, position: { ...l.position } })),
                            markers: (n.markers || []).map(m => ({ ...m, position: { ...m.position } }))
                        })),
                        startNodeId: initialNodeId,
                        preload: true,
                        linksOnCompass: true,
                        showLinkTooltip: true,
                        transitionOptions: {
                            showLoader: true,
                            speed: '20rpm',
                            effect: 'fade',
                            rotation: true
                        }
                    }]
                ]
            });

            viewerRef.current = viewerInstance;

            const tourPlugin = viewerInstance.getPlugin(VirtualTourPlugin);
            tourPluginRef.current = tourPlugin;

            // When node changes via arrows or programmatic switch
            tourPlugin.addEventListener('node-changed', (e) => {
                if (e.node) {
                    setCurrentNodeId(e.node.id);
                }
            });

            // Ready event
            viewerInstance.addEventListener('ready', () => {
                setIsLoading(false);
            }, { once: true });

            // Fullscreen change tracking
            const handleFullscreenChange = () => {
                setIsFullscreen(!!document.fullscreenElement);
            };
            document.addEventListener('fullscreenchange', handleFullscreenChange);

            return () => {
                document.removeEventListener('fullscreenchange', handleFullscreenChange);
                if (viewerInstance) {
                    try {
                        viewerInstance.destroy();
                    } catch (e) {
                        console.warn('Error destroying 360 viewer:', e);
                    }
                }
                viewerRef.current = null;
                tourPluginRef.current = null;
            };
        } catch (err) {
            console.error('Failed to initialize 360 virtual tour:', err);
            setIsLoading(false);
        }
    }, [hasTour, formattedNodes, initialNodeId]);

    // Handle switching nodes programmatically
    const handleSwitchNode = (nodeId) => {
        if (!tourPluginRef.current) return;
        try {
            tourPluginRef.current.setCurrentNode(nodeId);
            setCurrentNodeId(nodeId);
        } catch (err) {
            console.error('Error switching virtual tour node:', err);
        }
    };

    // Toggle fullscreen container
    const handleToggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen?.().catch(err => {
                viewerRef.current?.toggleFullscreen();
            });
        } else {
            document.exitFullscreen?.();
        }
    };

    // Reset view position
    const handleResetView = () => {
        if (!viewerRef.current) return;
        viewerRef.current.animate({
            yaw: 0,
            pitch: 0,
            zoom: 50,
            speed: '10rpm'
        });
    };

    // Fallback UI when 360 tour data is not configured
    if (!hasTour) {
        return (
            <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-xl">
                {/* Background decorative gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/30 pointer-events-none" />
                
                <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 shadow-inner">
                        <Compass size={32} className="animate-spin-slow" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-800/40 mb-3">
                        360° Walkthrough
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                        360° Virtual Tour Not Available Yet
                    </h3>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                        A spherical walkthrough hasn't been uploaded for <strong className="text-slate-200">{spaceName}</strong> yet. You can still inspect every angle through our high-resolution room photos and gallery!
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                        {onBackToGallery && (
                            <button
                                type="button"
                                onClick={onBackToGallery}
                                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center gap-2"
                            >
                                <Building2 size={14} />
                                <span>View Photo Gallery</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl group">
            {/* Viewer DOM Container */}
            <div
                ref={containerRef}
                className="w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] min-h-[500px] sm:min-h-[580px] max-h-[720px] bg-slate-950"
            />

            {/* Top Navigation & Info Header Bar */}
            <div className="absolute top-3.5 left-3.5 right-3.5 sm:top-4 sm:left-4 sm:right-4 z-20 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
                {/* Active Node Pill */}
                <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-2xl shadow-xl text-white">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
                        <Compass size={16} />
                    </div>
                    <div className="min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-950/70 px-1.5 py-0.5 rounded border border-indigo-800/40">
                                360° Walkthrough
                            </span>
                            {currentRoom && (
                                <span className="text-[9px] font-bold text-purple-300 bg-purple-950/70 px-1.5 py-0.5 rounded border border-purple-800/40 flex items-center gap-1">
                                    <DoorOpen size={10} /> Room
                                </span>
                            )}
                        </div>
                        <h3 className="text-xs sm:text-sm font-black text-slate-100 truncate max-w-[200px] sm:max-w-xs">
                            {currentNode?.name || spaceName}
                        </h3>
                    </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="pointer-events-auto flex items-center gap-2 ml-auto">
                    {/* If inside a room node, offer direct "Book Room" button */}
                    {currentRoom && onBookRoom && (
                        <button
                            type="button"
                            onClick={() => onBookRoom(currentRoom)}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <Calendar size={13} />
                            <span>Book {currentRoom.name}</span>
                        </button>
                    )}

                    {/* Controls Guide Button */}
                    <button
                        type="button"
                        onClick={() => setShowInstructions(prev => !prev)}
                        className="bg-slate-900/80 hover:bg-slate-800 text-slate-200 p-2 rounded-xl border border-white/10 shadow-lg backdrop-blur-md transition-all cursor-pointer"
                        title="Navigation Controls Guide"
                    >
                        <HelpCircle size={16} />
                    </button>

                    {/* Reset Camera View */}
                    <button
                        type="button"
                        onClick={handleResetView}
                        className="bg-slate-900/80 hover:bg-slate-800 text-slate-200 p-2 rounded-xl border border-white/10 shadow-lg backdrop-blur-md transition-all cursor-pointer"
                        title="Reset Camera Center"
                    >
                        <RotateCcw size={16} />
                    </button>

                    {/* Fullscreen Button */}
                    <button
                        type="button"
                        onClick={handleToggleFullscreen}
                        className="bg-slate-900/80 hover:bg-slate-800 text-slate-200 p-2 rounded-xl border border-white/10 shadow-lg backdrop-blur-md transition-all cursor-pointer"
                        title="Toggle Fullscreen"
                    >
                        <Maximize2 size={16} />
                    </button>
                </div>
            </div>

            {/* Interactive Instructions Modal/Card Overlay */}
            {showInstructions && (
                <div className="absolute top-16 right-4 z-30 max-w-xs bg-slate-900/95 backdrop-blur-lg border border-white/15 rounded-2xl p-4 text-white shadow-2xl text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="font-black text-indigo-400 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                            <Info size={13} /> Virtual Tour Controls
                        </span>
                        <button
                            type="button"
                            onClick={() => setShowInstructions(false)}
                            className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <ul className="space-y-1.5 text-slate-300">
                        <li className="flex items-start gap-2">
                            <span className="font-bold text-indigo-300">🖱️ Mouse / Touch:</span>
                            <span>Click and drag in any direction to look 360° around the space.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-bold text-indigo-300">🔍 Zoom:</span>
                            <span>Use your scroll wheel or pinch gesture to zoom in and inspect details.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-bold text-indigo-300">➡️ Floor Arrows:</span>
                            <span>Click the 3D ground arrows to walk smoothly between interconnected rooms.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-bold text-indigo-300">🧭 Compass:</span>
                            <span>Click the floating compass in the top right to rotate to cardinal orientations.</span>
                        </li>
                    </ul>
                </div>
            )}

            {/* Bottom Scene Thumbnail Strip */}
            <div className="absolute bottom-12 left-3 right-3 sm:bottom-14 sm:left-4 sm:right-4 z-20 pointer-events-none">
                <div className="pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-2xl p-2 sm:p-2.5 shadow-2xl max-w-xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 shrink-0 hidden sm:inline">
                        Rooms & Areas:
                    </span>
                    {nodes.map((node) => {
                        const isCurrent = node.id === currentNodeId;
                        return (
                            <button
                                key={node.id}
                                type="button"
                                onClick={() => handleSwitchNode(node.id)}
                                className={`group/pill flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                    isCurrent
                                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-2 ring-indigo-400/30'
                                        : 'bg-slate-900/90 text-slate-300 border-white/10 hover:border-indigo-400/40 hover:bg-slate-800'
                                }`}
                            >
                                <div className="w-6 h-6 rounded-md overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                                    <img
                                        src={node.thumbnail || node.panorama}
                                        alt={node.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                </div>
                                <span className="truncate max-w-[120px] sm:max-w-[150px]">
                                    {node.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default VirtualTourViewer;
