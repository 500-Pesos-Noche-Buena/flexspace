import React, { useState, useEffect, useRef } from 'react';
import { apiPost } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';
import { Button } from '@/components/ui/button';
import {
    Compass, Upload, Plus, Trash2, Eye, Link2, Star,
    DoorOpen, CheckCircle, ExternalLink, AlertCircle,
    Loader2, Sparkles, Move, RefreshCw, X, ChevronDown,
    Info, Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/utils/cn';
import VirtualTourViewer from './VirtualTourViewer';

const DIRECTION_PRESETS = [
    { label: 'Ahead / Forward (0°)', yaw: 0 },
    { label: 'Right (90°)', yaw: Math.PI / 2 },
    { label: 'Behind (180°)', yaw: Math.PI },
    { label: 'Left (-90°)', yaw: -Math.PI / 2 },
    { label: 'Slight Right (45°)', yaw: Math.PI / 4 },
    { label: 'Slight Left (-45°)', yaw: -Math.PI / 4 },
];

export const VirtualTourEditor = ({
    spaceId,
    rooms = [],
    initialVirtualTour = null,
    initialPanoramas = [],
    onChange,
    isEditing = true
}) => {
    // Virtual tour settings state
    const [enabled, setEnabled] = useState(false);
    const [initialNodeId, setInitialNodeId] = useState('');
    const [nodes, setNodes] = useState([]);
    const [panoramas, setPanoramas] = useState([]);

    // UI state
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [saving, setSaving] = useState(false);
    const [previewNode, setPreviewNode] = useState(null);
    const [manualUrl, setManualUrl] = useState('');
    const [manualName, setManualName] = useState('');
    const [manualRoomId, setManualRoomId] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);
    const [activeTab, setActiveTab] = useState('scenes'); // 'scenes' | 'preview'

    const fileInputRef = useRef(null);

    // Initialize from props
    useEffect(() => {
        if (initialVirtualTour) {
            setEnabled(!!initialVirtualTour.enabled);
            const tourNodes = Array.isArray(initialVirtualTour.nodes) ? initialVirtualTour.nodes : [];
            setNodes(tourNodes);
            setInitialNodeId(initialVirtualTour.initial_node_id || (tourNodes[0]?.id || ''));
        }
        if (Array.isArray(initialPanoramas)) {
            setPanoramas(initialPanoramas);
        }
    }, [initialVirtualTour, initialPanoramas]);

    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    const isInitialMount = useRef(true);

    // Notify parent on state change (after initial mount)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (onChangeRef.current) {
            onChangeRef.current({
                virtualTour: {
                    enabled,
                    initial_node_id: initialNodeId || (nodes[0]?.id || null),
                    nodes
                },
                panoramaImages: panoramas
            });
        }
    }, [enabled, initialNodeId, nodes, panoramas]);

    // Handle 360 Panorama File Upload
    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (!spaceId) {
            showToast({
                icon: 'warning',
                title: 'Save Space First',
                text: 'Please save the basic space details before uploading high-resolution panoramas.'
            });
            return;
        }

        setUploading(true);
        setUploadProgress(10);

        try {
            const formData = new FormData();
            files.forEach(file => {
                formData.append('panoramas', file);
            });

            setUploadProgress(40);

            showToast({
                icon: 'info',
                title: 'Uploading 360° Panorama...',
                text: 'Storing high-resolution image in Cloudinary',
                duration: 2500
            });

            const res = await apiPost(`/space/spaces/${spaceId}/panoramas`, formData);

            setUploadProgress(90);

            if (res.success && Array.isArray(res.uploaded) && res.uploaded.length > 0) {
                const newUploaded = res.uploaded;
                const newPanos = [...panoramas, ...newUploaded];
                setPanoramas(newPanos);

                // Auto-create tour nodes for the newly uploaded panoramas
                const newNodes = newUploaded.map((url, idx) => {
                    const fallbackName = files[idx]?.name
                        ? files[idx].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
                        : `360 Scene ${nodes.length + idx + 1}`;
                    const id = `node-${Date.now()}-${idx}`;
                    return {
                        id,
                        name: fallbackName,
                        panorama: url,
                        thumbnail: url,
                        caption: fallbackName,
                        room_id: null,
                        room_name: '',
                        default_pitch: 0,
                        default_yaw: 0,
                        default_zoom: 50,
                        links: []
                    };
                });

                const updatedNodes = [...nodes, ...newNodes];
                setNodes(updatedNodes);

                if (!initialNodeId && updatedNodes.length > 0) {
                    setInitialNodeId(updatedNodes[0].id);
                }

                if (!enabled) {
                    setEnabled(true);
                }

                showToast({
                    icon: 'success',
                    title: 'Panorama Uploaded!',
                    text: `${newUploaded.length} 360° scene(s) added successfully`,
                    duration: 2000
                });
            } else {
                showToast({
                    icon: 'error',
                    title: 'Upload Failed',
                    text: res.message || 'Could not upload panorama images'
                });
            }
        } catch (error) {
            console.error('Panorama upload error:', error);
            showToast({
                icon: 'error',
                title: 'Upload Failed',
                text: error.message || 'Failed to upload panorama files to Cloudinary'
            });
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (e.target) e.target.value = '';
        }
    };

    // Add Panorama from manual Cloudinary / Web URL
    const handleAddManualUrl = () => {
        if (!manualUrl.trim()) {
            showToast({ icon: 'warning', title: 'Please enter a valid image URL' });
            return;
        }

        const id = `node-${Date.now()}`;
        const selectedRoom = rooms.find(r => String(r._id) === String(manualRoomId));

        const newNode = {
            id,
            name: manualName.trim() || (selectedRoom ? selectedRoom.name : `360 Scene ${nodes.length + 1}`),
            panorama: manualUrl.trim(),
            thumbnail: manualUrl.trim(),
            caption: manualName.trim() || '',
            room_id: selectedRoom ? selectedRoom._id : null,
            room_name: selectedRoom ? selectedRoom.name : '',
            default_pitch: 0,
            default_yaw: 0,
            default_zoom: 50,
            links: []
        };

        setPanoramas(prev => [...prev, manualUrl.trim()]);
        setNodes(prev => [...prev, newNode]);

        if (!initialNodeId) {
            setInitialNodeId(id);
        }
        if (!enabled) {
            setEnabled(true);
        }

        setManualUrl('');
        setManualName('');
        setManualRoomId('');
        setShowManualInput(false);

        showToast({ icon: 'success', title: 'Scene added successfully!', duration: 1500 });
    };

    // Update node fields
    const handleUpdateNode = (nodeId, field, value) => {
        setNodes(prev => prev.map(node => {
            if (node.id !== nodeId) return node;

            if (field === 'room_id') {
                const room = rooms.find(r => String(r._id) === String(value));
                return {
                    ...node,
                    room_id: room ? room._id : null,
                    room_name: room ? room.name : ''
                };
            }

            return { ...node, [field]: value };
        }));
    };

    // Remove scene/node
    const handleRemoveNode = async (nodeId, panoramaUrl) => {
        const confirmDelete = window.confirm('Are you sure you want to remove this 360° panorama scene?');
        if (!confirmDelete) return;

        // Clean up from local state
        const remainingNodes = nodes.filter(n => n.id !== nodeId).map(n => ({
            ...n,
            links: (n.links || []).filter(l => l.nodeId !== nodeId)
        }));
        setNodes(remainingNodes);
        setPanoramas(prev => prev.filter(p => p !== panoramaUrl));

        if (initialNodeId === nodeId) {
            setInitialNodeId(remainingNodes[0]?.id || '');
        }

        // Also call backend to remove and clean up Cloudinary if editing
        if (spaceId) {
            try {
                await apiPost(`/space/spaces/${spaceId}/remove-panorama`, {
                    panorama_url: panoramaUrl,
                    node_id: nodeId
                });
            } catch (err) {
                console.error('Error removing panorama from server:', err);
            }
        }

        showToast({ icon: 'success', title: 'Scene removed', duration: 1500 });
    };

    // Add navigation link between two scenes
    const handleAddLink = (sourceNodeId, targetNodeId, directionYaw = 0) => {
        if (!targetNodeId || sourceNodeId === targetNodeId) return;

        const targetNode = nodes.find(n => n.id === targetNodeId);
        const tooltip = targetNode ? `Go to ${targetNode.name}` : 'Move here';

        setNodes(prev => prev.map(node => {
            if (node.id !== sourceNodeId) return node;
            const existingLinks = node.links || [];
            if (existingLinks.some(l => l.nodeId === targetNodeId)) {
                return node; // already connected
            }
            return {
                ...node,
                links: [
                    ...existingLinks,
                    {
                        nodeId: targetNodeId,
                        yaw: Number(directionYaw),
                        pitch: -0.2,
                        tooltip
                    }
                ]
            };
        }));
    };

    // Remove navigation link
    const handleRemoveLink = (sourceNodeId, targetNodeId) => {
        setNodes(prev => prev.map(node => {
            if (node.id !== sourceNodeId) return node;
            return {
                ...node,
                links: (node.links || []).filter(l => l.nodeId !== targetNodeId)
            };
        }));
    };

    // Save Virtual Tour Directly to Backend
    const handleDirectSave = async () => {
        if (!spaceId) {
            showToast({ icon: 'warning', title: 'Please save the space details first' });
            return;
        }

        setSaving(true);
        try {
            const tourPayload = {
                enabled,
                initial_node_id: initialNodeId || (nodes[0]?.id || null),
                nodes
            };

            const res = await apiPost(`/space/spaces/${spaceId}/virtual-tour`, {
                virtual_tour: tourPayload,
                panorama_images: panoramas
            });

            if (res.success) {
                showToast({
                    icon: 'success',
                    title: 'Virtual Tour Saved!',
                    text: 'Tour nodes and Cloudinary panoramas updated successfully.',
                    duration: 2500
                });
            } else {
                showToast({
                    icon: 'error',
                    title: 'Save Failed',
                    text: res.message || 'Could not save tour data'
                });
            }
        } catch (error) {
            console.error('Save virtual tour error:', error);
            showToast({
                icon: 'error',
                title: 'Save Error',
                text: error.message || 'Failed to update virtual tour'
            });
        } finally {
            setSaving(false);
        }
    };

    // Prepare preview object for VirtualTourViewer
    const previewTourData = {
        enabled: true,
        initial_node_id: previewNode?.id || initialNodeId || nodes[0]?.id,
        nodes: nodes.length > 0 ? nodes : []
    };

    return (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm">
            {/* Header & Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs border border-indigo-500/20">
                        <Compass size={26} className="animate-spin-slow" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-black text-foreground uppercase tracking-tight">
                                360° Virtual Walkthrough & Panoramas
                            </h3>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center gap-1">
                                <Sparkles size={11} />
                                Interactive
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Upload equirectangular 360° photos to let guests tour your space with Google Street View-style floor navigation.
                        </p>
                    </div>
                </div>

                {/* Enable Tour Toggle */}
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none bg-muted/60 hover:bg-muted px-4 py-2 rounded-2xl border border-border transition-colors">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-xs font-black uppercase tracking-wider text-foreground">
                            {enabled ? 'Tour Enabled' : 'Tour Disabled'}
                        </span>
                    </label>

                    {isEditing && spaceId && (
                        <Button
                            type="button"
                            onClick={handleDirectSave}
                            disabled={saving || uploading}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                        >
                            {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                            {saving ? 'Saving Tour...' : 'Save Tour'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Help / Guidance Alert */}
            <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 rounded-2xl p-4 flex items-start gap-3 text-xs text-indigo-950 dark:text-indigo-200">
                <Info size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="font-bold">
                        How 360° Walkthrough Works:
                    </p>
                    <p className="text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed text-[11px]">
                        1. Upload 360° equirectangular images (e.g. from an Insta360, Ricoh Theta, panorama stitcher, or rendered architectural 3D view). All photos are securely hosted in Cloudinary.
                        <br />
                        2. Label each scene (e.g. <em>"Entrance Lobby"</em> or link to a specific room like <em>"dsadas"</em>).
                        <br />
                        3. Add navigation arrows under <strong>"Connected Scenes"</strong> so visitors can click to walk seamlessly between rooms.
                    </p>
                </div>
            </div>

            {/* Upload & Add Controls */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-foreground">
                            Scenes ({nodes.length})
                        </span>
                        {nodes.length > 0 && initialNodeId && (
                            <span className="text-[10px] text-muted-foreground font-medium">
                                • Starting scene: <strong>{nodes.find(n => n.id === initialNodeId)?.name || 'First Scene'}</strong>
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 size={13} className="animate-spin" />
                                    <span>Uploading ({uploadProgress}%)</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={13} />
                                    <span>Upload 360° Panorama</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowManualInput(!showManualInput)}
                            className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-bold transition-all border border-border flex items-center gap-1.5 cursor-pointer"
                        >
                            <Plus size={13} />
                            <span>Add from URL</span>
                        </button>

                        {spaceId && (
                            <a
                                href={`/explore/${spaceId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                title="Open Live Space Explore Page"
                            >
                                <ExternalLink size={13} />
                                <span className="hidden sm:inline">Preview Live</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* Upload Progress Bar */}
                {uploading && (
                    <div className="space-y-1.5 bg-muted p-3.5 rounded-2xl border border-border animate-in fade-in">
                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600">
                            <span>Uploading and optimizing 360° photos to Cloudinary...</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Add from URL Collapsible Box */}
                {showManualInput && (
                    <div className="bg-muted/70 border border-border rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase text-foreground">Add 360° Image via Cloudinary URL</h4>
                            <button
                                type="button"
                                onClick={() => setShowManualInput(false)}
                                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">
                                    Panorama URL (Cloudinary / Equirectangular JPG/PNG)
                                </label>
                                <input
                                    type="url"
                                    value={manualUrl}
                                    onChange={(e) => setManualUrl(e.target.value)}
                                    placeholder="https://res.cloudinary.com/.../panoramas/image.jpg"
                                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">
                                    Scene Label / Name
                                </label>
                                <input
                                    type="text"
                                    value={manualName}
                                    onChange={(e) => setManualName(e.target.value)}
                                    placeholder="e.g. Conference Room"
                                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">
                                    Link to Room (Optional)
                                </label>
                                <select
                                    value={manualRoomId}
                                    onChange={(e) => setManualRoomId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">None (Common Area)</option>
                                    {rooms.map(room => (
                                        <option key={room._id} value={room._id}>
                                            {room.name} ({room.type || 'Room'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2 flex items-end">
                                <Button
                                    type="button"
                                    onClick={handleAddManualUrl}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl"
                                >
                                    Add Scene to Tour
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Scenes List */}
            {nodes.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-3xl p-8 text-center bg-muted/20">
                    <Compass size={40} className="mx-auto text-muted-foreground/60 mb-3" />
                    <h4 className="text-sm font-black uppercase text-foreground">No 360° Scenes Added Yet</h4>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                        Upload your 360° equirectangular panoramas above to create an immersive walkthrough for your guests.
                    </p>
                    <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase px-5 py-2.5 rounded-xl shadow-md"
                    >
                        <Upload size={14} className="mr-1.5" />
                        Upload First 360° Photo
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {nodes.map((node, index) => {
                        const isInitial = initialNodeId === node.id || (!initialNodeId && index === 0);
                        const otherNodes = nodes.filter(n => n.id !== node.id);

                        return (
                            <div
                                key={node.id}
                                className={cn(
                                    "p-4 sm:p-5 rounded-2xl border transition-all bg-card/60 hover:bg-card space-y-4",
                                    isInitial
                                        ? "border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-sm"
                                        : "border-border"
                                )}
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                                    {/* Panorama Image Preview Thumbnail */}
                                    <div className="lg:col-span-4 relative group aspect-[2/1] rounded-xl overflow-hidden bg-slate-950 border border-border shrink-0">
                                        <img
                                            src={node.panorama}
                                            alt={node.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />

                                        {/* Status Badges */}
                                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                                            {isInitial && (
                                                <span className="bg-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                                                    <Star size={10} className="fill-white" />
                                                    Starting View
                                                </span>
                                            )}
                                            {node.room_name && (
                                                <span className="bg-purple-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                                                    <DoorOpen size={10} />
                                                    {node.room_name}
                                                </span>
                                            )}
                                        </div>

                                        {/* Interactive 360 Preview Button */}
                                        <button
                                            type="button"
                                            onClick={() => setPreviewNode(node)}
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-black text-xs uppercase backdrop-blur-xs cursor-pointer"
                                        >
                                            <Eye size={16} />
                                            <span>Test 360° View</span>
                                        </button>
                                    </div>

                                    {/* Scene Details Form */}
                                    <div className="lg:col-span-8 space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Scene Name */}
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                                                    Scene Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={node.name}
                                                    onChange={(e) => handleUpdateNode(node.id, 'name', e.target.value)}
                                                    placeholder="e.g. Welcome Reception"
                                                    className="w-full px-3 py-2 rounded-xl bg-muted/60 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>

                                            {/* Linked Room */}
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                                                    Linked Room
                                                </label>
                                                <select
                                                    value={node.room_id || ''}
                                                    onChange={(e) => handleUpdateNode(node.id, 'room_id', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl bg-muted/60 border border-border text-foreground text-xs font-medium focus:outline-none focus:border-indigo-500"
                                                >
                                                    <option value="">None (Common Space / Reception)</option>
                                                    {rooms.map(room => (
                                                        <option key={room._id} value={room._id}>
                                                            {room.name} ({room.type || 'Room'})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Starting View & Remove Row */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                            <div className="flex items-center gap-2">
                                                {!isInitial ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setInitialNodeId(node.id)}
                                                        className="px-3 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <Star size={12} />
                                                        <span>Set as Starting View</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                                        <CheckCircle size={13} />
                                                        First scene loaded for visitors
                                                    </span>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewNode(node)}
                                                    className="px-3 py-1 text-[11px] font-bold text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <Eye size={12} />
                                                    <span>Preview Scene</span>
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveNode(node.id, node.panorama)}
                                                className="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                                title="Delete this 360° scene"
                                            >
                                                <Trash2 size={13} />
                                                <span>Delete</span>
                                            </button>
                                        </div>

                                        {/* Connected Navigation Links */}
                                        <div className="pt-2 border-t border-border/60">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                                    <Move size={11} />
                                                    Connected Scenes / Floor Arrows ({(node.links || []).length})
                                                </span>
                                            </div>

                                            {/* Existing Links List */}
                                            {(node.links || []).length > 0 ? (
                                                <div className="flex flex-wrap gap-2 mb-2.5">
                                                    {node.links.map(link => {
                                                        const target = nodes.find(n => n.id === link.nodeId);
                                                        return (
                                                            <div
                                                                key={link.nodeId}
                                                                className="px-2.5 py-1 rounded-lg bg-muted text-[11px] font-semibold text-foreground border border-border flex items-center gap-2"
                                                            >
                                                                <Link2 size={12} className="text-indigo-500" />
                                                                <span>{target ? target.name : link.nodeId}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveLink(node.id, link.nodeId)}
                                                                    className="text-muted-foreground hover:text-red-500 p-0.5 rounded cursor-pointer"
                                                                    title="Remove connection"
                                                                >
                                                                    <X size={11} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-[11px] text-muted-foreground/70 italic mb-2">
                                                    No connections yet. Connect to other scenes so visitors can walk between them.
                                                </p>
                                            )}

                                            {/* Add Connection Dropdown */}
                                            {otherNodes.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <select
                                                        id={`connect-select-${node.id}`}
                                                        className="px-2.5 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs font-medium focus:outline-none focus:border-indigo-500"
                                                        defaultValue=""
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                handleAddLink(node.id, e.target.value);
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                    >
                                                        <option value="" disabled>+ Connect arrow to another scene...</option>
                                                        {otherNodes
                                                            .filter(on => !(node.links || []).some(l => l.nodeId === on.id))
                                                            .map(on => (
                                                                <option key={on.id} value={on.id}>
                                                                    Connect to: {on.name}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Interactive 360 Scene Preview Modal */}
            {previewNode && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                            <div className="flex items-center gap-2.5">
                                <Compass size={18} className="text-indigo-400" />
                                <div>
                                    <h4 className="text-sm font-black text-white uppercase tracking-tight">
                                        360° Preview: {previewNode.name}
                                    </h4>
                                    <span className="text-[10px] text-slate-400">
                                        Drag to rotate • Scroll to zoom • Interactive test viewer
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewNode(null)}
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Viewer */}
                        <div className="h-[460px] relative bg-black">
                            <VirtualTourViewer
                                virtualTour={previewTourData}
                                spaceName={previewNode.name}
                                rooms={rooms}
                                onBookRoom={() => showToast({ icon: 'info', title: 'Booking preview mode' })}
                                onBookSpace={() => showToast({ icon: 'info', title: 'Booking preview mode' })}
                                onBackToGallery={() => setPreviewNode(null)}
                            />
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 py-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                            <span>Image URL: <code className="text-[10px] text-indigo-400 truncate inline-block max-w-xs align-bottom">{previewNode.panorama}</code></span>
                            <Button
                                type="button"
                                onClick={() => setPreviewNode(null)}
                                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl"
                            >
                                Close Preview
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VirtualTourEditor;
