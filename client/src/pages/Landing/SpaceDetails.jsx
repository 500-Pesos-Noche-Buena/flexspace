import { roomHourlyRate, roomPackagePrice } from '@/utils/roomPricing';
// pages/SpaceDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/utils/Api';
import { useAuth } from '@/context/AuthContext';
import {
    ArrowLeft, MapPin, Wifi, Coffee, Users, Clock, Star,
    ChevronLeft, ChevronRight, Image as ImageIcon,
    CheckCircle, Award, Maximize2, X, Shield,
    Sun, Moon, DoorOpen, Building2, ChevronDown, Calendar,
    Loader2, Check, Sofa, Grid3x3, AlertCircle
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { getSpaceImage, getImageUrl } from '@/utils/imageHelper';
import { UserBookingModal, UserLightboxModal } from '@/components/modal';

const ROOM_TYPE_LABELS = {
    private_office: 'Private Office',
    meeting_room: 'Meeting Room',
    conference_room: 'Conference Room',
    event_space: 'Event Space',
    study_room: 'Study Room',
    pod: 'Pod / Booth',
    shared_desk: 'Shared Desk',
};

const formatRoomType = (type) => {
    if (!type) return 'Room';
    return ROOM_TYPE_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getPHDateString = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
};

// Helper function to check if space is open on a specific date
const isSpaceOpenOnDate = (space, dateStr) => {
    if (!space?.hours_json) return true;

    const date = new Date(dateStr);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = days[date.getDay()];

    const daySchedule = space.hours_json[dayOfWeek];
    return daySchedule?.active === true;
};

// Helper function to check if time is within operating hours
const isWithinOperatingHours = (space, dateStr, startTime, endTime) => {
    if (!space?.hours_json) return true;

    const date = new Date(dateStr);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = days[date.getDay()];

    const daySchedule = space.hours_json[dayOfWeek];

    if (!daySchedule?.active) return false;

    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const openMinutes = timeToMinutes(daySchedule.open);
    const closeMinutes = timeToMinutes(daySchedule.close);

    // For open time booking, just check if today is open
    if (!startTime || !endTime) {
        return true;
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    return startMinutes >= openMinutes && endMinutes <= closeMinutes;
};

const SpaceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [space, setSpace] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [showFullSchedule, setShowFullSchedule] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('all');

    // Space availability for open area (capacity)
    const [spaceAvailability, setSpaceAvailability] = useState({
        total_capacity: 0,
        occupied: 0,
        available: 0,
        is_available: true
    });
    const [checkingSpaceAvailability, setCheckingSpaceAvailability] = useState(false);

    // Room availability states
    const [roomAvailability, setRoomAvailability] = useState({});
    const [checkingAvailability, setCheckingAvailability] = useState(false);

    // Booking Modal State
    const [openBookingModal, setOpenBookingModal] = useState(false);
    const [isBooking, setIsBooking] = useState(false);
    const [isOpenTime, setIsOpenTime] = useState(false);
    const [selectedBookableType, setSelectedBookableType] = useState('space');
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [bookingData, setBookingData] = useState({
        date: getPHDateString(),
        start_time: '',
        end_time: '',
        notes: ''
    });

    useEffect(() => {
        fetchSpaceDetails();
        fetchRooms();
    }, [id]);

    // Check space availability when date/time changes
    useEffect(() => {
        if (selectedBookableType === 'space' && bookingData.date) {
            checkSpaceAvailability();
        }
    }, [bookingData.date, bookingData.start_time, bookingData.end_time, isOpenTime, selectedBookableType]);

    useEffect(() => {
        if (selectedBookableType === 'room' && selectedRoom && bookingData.date) {
            if (selectedRoom) {
                setRoomAvailability(prev => ({
                    ...prev,
                    [selectedRoom._id]: { is_available: true, checking: true }
                }));
            }

            const timer = setTimeout(() => {
                checkRoomAvailability();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [selectedRoom?._id, bookingData.date, bookingData.start_time, bookingData.end_time, isOpenTime, selectedBookableType]);

    const fetchSpaceDetails = async () => {
        setLoading(true);
        try {
            const res = await apiGet(`/landing/space/${id}`);
            if (res.success) {
                setSpace(res.data);
            } else {
                showToast({ icon: 'error', title: 'Space not found' });
                navigate('/explore');
            }
        } catch (err) {
            console.error('Failed to fetch space details:', err);
            showToast({ icon: 'error', title: 'Failed to load space details' });
        } finally {
            setLoading(false);
        }
    };

    const fetchRooms = async () => {
        try {
            const res = await apiGet(`/landing/spaces/${id}/rooms`);
            if (res.success) {
                setRooms(res.data);
                const initialAvailability = {};
                for (const room of res.data) {
                    initialAvailability[room._id] = { is_available: true, checking: false };
                }
                setRoomAvailability(initialAvailability);
            }
        } catch (err) {
            console.error('Failed to fetch rooms:', err);
            setRooms([]);
        }
    };

    const checkSpaceAvailability = async () => {
        if (!space || !bookingData.date) return;

        setCheckingSpaceAvailability(true);
        try {
            const formattedDate = bookingData.date.split('T')[0];
            const params = new URLSearchParams({
                date: formattedDate,
                is_open_time: isOpenTime ? 'true' : 'false'
            });

            if (!isOpenTime && bookingData.start_time && bookingData.end_time) {
                params.append('start_time', bookingData.start_time);
                params.append('end_time', bookingData.end_time);
            }

            const res = await apiGet(`/landing/spaces/${space._id}/availability?${params}`);

            if (res.success) {
                setSpaceAvailability({
                    total_capacity: space.capacity || 0,
                    occupied: res.data.occupied_seats || 0,
                    available: (space.capacity || 0) - (res.data.occupied_seats || 0),
                    is_available: res.data.available_seats > 0
                });
            }
        } catch (err) {
            console.error('Space availability check failed:', err);
        } finally {
            setCheckingSpaceAvailability(false);
        }
    };

    const checkRoomAvailability = async () => {
        if (!selectedRoom || !bookingData.date) return;

        // Don't check availability if space is closed on selected date
        if (!isSpaceOpenOnDate(space, bookingData.date)) {
            setRoomAvailability(prev => ({
                ...prev,
                [selectedRoom._id]: {
                    is_available: false,
                    checking: false,
                    conflicting_bookings: []
                }
            }));
            return;
        }

        setCheckingAvailability(true);
        try {
            const formattedDate = bookingData.date.split('T')[0];
            const params = new URLSearchParams({
                date: formattedDate,
                is_open_time: isOpenTime ? 'true' : 'false'
            });

            if (!isOpenTime && bookingData.start_time && bookingData.end_time) {
                params.append('start_time', bookingData.start_time);
                params.append('end_time', bookingData.end_time);
            }

            const res = await apiGet(`/landing/rooms/${selectedRoom._id}/availability?${params}`);

            if (res.success) {
                setRoomAvailability(prev => ({
                    ...prev,
                    [selectedRoom._id]: {
                        is_available: res.data.is_available,
                        checking: false,
                        conflicting_bookings: res.data.conflicting_bookings
                    }
                }));
            }
        } catch (err) {
            console.error('Room availability check failed:', err);
        } finally {
            setCheckingAvailability(false);
        }
    };

    // Build combined list of space and room images with metadata
    const allGalleryImages = React.useMemo(() => {
        const list = [];

        // 1. Space images
        if (space?.images && Array.isArray(space.images) && space.images.length > 0) {
            space.images.forEach((url, idx) => {
                if (url) {
                    list.push({
                        url,
                        type: 'space',
                        title: space.name,
                        subtitle: `${space.area || space.district_id?.name || 'Coworking Space'} · Space Overview`,
                        filterKey: 'space',
                        badge: 'Space Overview',
                        id: `space-${idx}`
                    });
                }
            });
        } else if (space?.image) {
            list.push({
                url: space.image,
                type: 'space',
                title: space.name,
                subtitle: `${space.area || space.district_id?.name || 'Coworking Space'} · Space Overview`,
                filterKey: 'space',
                badge: 'Space Overview',
                id: `space-primary`
            });
        }

        // 2. Room images
        if (Array.isArray(rooms) && rooms.length > 0) {
            rooms.forEach(room => {
                const roomImgs = Array.isArray(room.images) && room.images.length > 0
                    ? room.images
                    : (room.image ? [room.image] : []);

                roomImgs.forEach((url, idx) => {
                    if (url) {
                        list.push({
                            url,
                            type: 'room',
                            title: room.name,
                            subtitle: `${formatRoomType(room.type)} · Up to ${room.capacity} pax · ₱${room.rate_hour}/hr`,
                            roomName: room.name,
                            roomId: room._id,
                            roomType: room.type,
                            room: room,
                            filterKey: `room-${room._id}`,
                            badge: room.name,
                            id: `room-${room._id}-${idx}`
                        });
                    }
                });
            });
        }

        return list;
    }, [space, rooms]);

    // Generate filter tabs
    const filterTabs = React.useMemo(() => {
        const tabs = [];
        const totalCount = allGalleryImages.length;
        if (totalCount === 0) return [];

        tabs.push({
            id: 'all',
            label: 'All Photos',
            count: totalCount,
            icon: 'all'
        });

        const spaceCount = allGalleryImages.filter(img => img.type === 'space').length;
        if (spaceCount > 0) {
            tabs.push({
                id: 'space',
                label: 'Space Overview',
                count: spaceCount,
                icon: 'space'
            });
        }

        if (Array.isArray(rooms)) {
            rooms.forEach(room => {
                const count = allGalleryImages.filter(img => img.roomId === room._id).length;
                if (count > 0) {
                    tabs.push({
                        id: `room-${room._id}`,
                        label: room.name,
                        count,
                        icon: 'room',
                        room
                    });
                }
            });
        }

        return tabs;
    }, [allGalleryImages, rooms]);

    // Active displayed images based on active filter
    const displayImages = React.useMemo(() => {
        if (selectedFilter === 'all') return allGalleryImages;
        return allGalleryImages.filter(img => img.filterKey === selectedFilter);
    }, [allGalleryImages, selectedFilter]);

    // Auto-adjust current index when displayImages changes
    useEffect(() => {
        if (currentImageIndex >= displayImages.length && displayImages.length > 0) {
            setCurrentImageIndex(0);
        }
    }, [displayImages.length, currentImageIndex]);

    const nextImage = () => {
        if (displayImages.length === 0) return;
        setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
    };

    const prevImage = () => {
        if (displayImages.length === 0) return;
        setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    };

    const openLightbox = (index) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const nextLightbox = () => {
        if (displayImages.length === 0) return;
        setLightboxIndex((prev) => (prev + 1) % displayImages.length);
    };

    const prevLightbox = () => {
        if (displayImages.length === 0) return;
        setLightboxIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    };

    const handleViewRoomPhotos = (room, e) => {
        if (e) e.stopPropagation();
        const roomFilterKey = `room-${room._id}`;
        const hasPhotos = allGalleryImages.some(img => img.roomId === room._id);
        if (hasPhotos) {
            setSelectedFilter(roomFilterKey);
            setCurrentImageIndex(0);
            const galleryElem = document.getElementById('space-image-gallery');
            if (galleryElem) {
                galleryElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            showToast({
                icon: 'info',
                title: 'No Photos Available',
                text: `${room.name} does not have photos uploaded yet.`
            });
        }
    };

    const handleOpenRoomLightbox = (room, e) => {
        if (e) e.stopPropagation();
        const roomPhotos = allGalleryImages.filter(img => img.roomId === room._id);
        if (roomPhotos.length > 0) {
            setSelectedFilter(`room-${room._id}`);
            setCurrentImageIndex(0);
            setLightboxIndex(0);
            setLightboxOpen(true);
        } else {
            showToast({
                icon: 'info',
                title: 'No Photos Available',
                text: `${room.name} does not have photos uploaded yet.`
            });
        }
    };

    const formatTimeToAMPM = (time) => {
        if (!time) return '--:--';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const getOperatingHours = () => {
        if (space?.hours_json) {
            try {
                const hours = typeof space.hours_json === 'string'
                    ? JSON.parse(space.hours_json)
                    : space.hours_json;
                return hours;
            } catch (e) {
                return null;
            }
        }
        return null;
    };

    const operatingHours = getOperatingHours();

    const getTodayAccess = () => {
        if (!operatingHours) return '24/7 Available';

        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = days[new Date().getDay()];
        const todayHours = operatingHours[today];

        if (todayHours && todayHours.active) {
            return `${formatTimeToAMPM(todayHours.open)} - ${formatTimeToAMPM(todayHours.close)}`;
        }
        return 'Closed Today';
    };

    const getWeeklySchedule = () => {
        if (!operatingHours) return [];

        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        return days.map((day, index) => {
            const hours = operatingHours[day];
            if (hours && hours.active) {
                return {
                    day: dayLabels[index],
                    open: formatTimeToAMPM(hours.open),
                    close: formatTimeToAMPM(hours.close),
                    active: true
                };
            }
            return {
                day: dayLabels[index],
                open: 'Closed',
                close: '',
                active: false
            };
        });
    };

    const weeklySchedule = getWeeklySchedule();

    const getRatePerHour = () => {
        if (selectedBookableType === 'room' && selectedRoom) {
            return roomHourlyRate(selectedRoom, bookingData.guest_count || 1) ?? 0;
        }
        return space?.rate_hour || 0;
    };

    const getBookableName = () => {
        if (selectedBookableType === 'room' && selectedRoom) {
            return selectedRoom.name;
        }
        return space?.name || 'Space';
    };

    const getBookableCapacity = () => {
        if (selectedBookableType === 'room' && selectedRoom) {
            return selectedRoom.capacity;
        }
        return space?.capacity || 0;
    };

    const isRoomAvailable = () => {
        if (!selectedRoom) return true;
        const availability = roomAvailability[selectedRoom._id];
        return availability?.is_available !== false;
    };

    const isSpaceAvailable = () => {
        return spaceAvailability.available > 0;
    };

    const calculateEstimatedPrice = () => {
        const rateHour = getRatePerHour();
        const packagePrice = selectedBookableType === 'room' ? roomPackagePrice(selectedRoom, bookingData.promo_audience) : null;
        if (packagePrice != null) {
            const start = new Date(`2000-01-01T${bookingData.start_time || '00:00'}`);
            const end = new Date(`2000-01-01T${bookingData.end_time || '00:00'}`);
            const minutes = isOpenTime ? 0 : Math.max(0, Math.ceil((end - start) / 60000) - selectedRoom.promo_duration_hours * 60);
            return Number(packagePrice) + (Math.floor(minutes / 60) + (minutes % 60 > 30 ? 1 : minutes % 60 / 60)) * rateHour;
        }

        if (isOpenTime) {
            return rateHour;
        }

        if (bookingData.start_time && bookingData.end_time) {
            const start = new Date(`2000-01-01 ${bookingData.start_time}`);
            const end = new Date(`2000-01-01 ${bookingData.end_time}`);
            const hours = (end - start) / (1000 * 60 * 60);
            if (hours > 0) {
                return rateHour * hours;
            }
        }

        return 0;
    };

    const isSpaceClosedOnSelectedDate = () => {
        return !isSpaceOpenOnDate(space, bookingData.date);
    };

    const isTimeOutsideHours = () => {
        if (isOpenTime) return false;
        if (!bookingData.start_time || !bookingData.end_time) return false;
        return !isWithinOperatingHours(space, bookingData.date, bookingData.start_time, bookingData.end_time);
    };

    const isBookingDisabled = () => {
        if (isBooking) return true;
        if (selectedBookableType === 'room' && selectedRoom) {
            const count = Number(bookingData.guest_count || 1);
            if (!Number.isSafeInteger(count) || count < 1 || count > selectedRoom.capacity || roomHourlyRate(selectedRoom, count) == null) return true;
            if (selectedRoom.consumable_packages?.length && roomPackagePrice(selectedRoom, bookingData.promo_audience) == null) return true;
        }

        // Check if space is closed on selected date
        if (isSpaceClosedOnSelectedDate()) return true;

        // Check if time is outside operating hours
        if (isTimeOutsideHours()) return true;

        if (!isOpenTime && (!bookingData.start_time || !bookingData.end_time)) return true;

        if (selectedBookableType === 'room' && (!selectedRoom || !roomAvailable)) return true;

        if (selectedBookableType === 'space' && !spaceAvailable) return true;

        return false;
    };

    const handleConfirmBooking = async () => {
        if (!isOpenTime && (!bookingData.start_time || !bookingData.end_time)) {
            showToast({ icon: 'warning', title: 'Please select start and end time' });
            return;
        }

        if (selectedBookableType === 'room' && !selectedRoom) {
            showToast({ icon: 'warning', title: 'Please select a room' });
            return;
        }

        // Check if space is closed on selected date
        if (isSpaceClosedOnSelectedDate()) {
            showToast({ icon: 'error', title: 'Space is closed on this date' });
            return;
        }

        // Check if time is outside operating hours
        if (isTimeOutsideHours()) {
            showToast({ icon: 'error', title: 'Selected time is outside operating hours' });
            return;
        }

        if (selectedBookableType === 'space' && !isSpaceAvailable()) {
            showToast({ icon: 'error', title: 'No available seats for the selected time' });
            return;
        }

        if (selectedBookableType === 'room' && selectedRoom && !isRoomAvailable()) {
            showToast({ icon: 'error', title: 'This room is no longer available for the selected time' });
            return;
        }

        setIsBooking(true);
        try {
            const payload = {
                bookable_type: selectedBookableType,
                promo_audience: bookingData.promo_audience,
                guest_count: Number(bookingData.guest_count || 1),
                space_id: space._id,
                room_id: selectedBookableType === 'room' ? selectedRoom._id : null,
                date: bookingData.date,
                notes: bookingData.notes,
                is_open_time: isOpenTime,
                start_time: !isOpenTime ? bookingData.start_time : null,
                end_time: !isOpenTime ? bookingData.end_time : null,
            };

            const res = await apiPost('/user/bookings', payload);

            if (res.success || res.status === 'success') {
                showToast({ icon: 'success', title: 'Booking Confirmed!' });
                setOpenBookingModal(false);
                setIsOpenTime(false);
                setSelectedBookableType('space');
                setSelectedRoom(null);
                setBookingData({
                    date: getPHDateString(),
                    start_time: '',
                    end_time: '',
                    notes: ''
                });
                navigate('/user/bookings');
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Booking failed' });
        } finally {
            setIsBooking(false);
        }
    };

    const handleBookNow = () => {
        if (!isAuthenticated) {
            showToast({
                icon: 'info',
                title: 'Login Required',
                text: 'Please login to book this space'
            });
            navigate('/login');
            return;
        }

        setSelectedBookableType('space');
        setSelectedRoom(null);
        setIsOpenTime(false);
        setBookingData({
            date: getPHDateString(),
            start_time: '',
            end_time: '',
            notes: ''
        });
        setOpenBookingModal(true);
    };

    const estimatedPrice = calculateEstimatedPrice();
    const roomAvailable = isRoomAvailable();
    const spaceAvailable = isSpaceAvailable();
    const isClosedOnSelectedDate = isSpaceClosedOnSelectedDate();
    const isOutsideHours = isTimeOutsideHours();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Loading space details...</div>
            </div>
        );
    }

    if (!space) return null;

    const currentImg = displayImages[currentImageIndex];
    const amenities = space.amenities || [];
    const hasRooms = rooms.length > 0;

    return (
        <div className="min-h-screen bg-white pb-12">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <button
                        onClick={() => {
                            if (isAuthenticated) {
                                navigate('/user/space');
                            } else {
                                navigate('/spaces');
                            }
                        }}
                        className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft size={20} /> Back to {isAuthenticated ? 'My Spaces' : 'Explore'}
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Gallery Filter Tabs */}
                {filterTabs.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
                        {filterTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setSelectedFilter(tab.id);
                                    setCurrentImageIndex(0);
                                }}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                                    selectedFilter === tab.id
                                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                            >
                                {tab.icon === 'all' && <Grid3x3 size={13} />}
                                {tab.icon === 'space' && <Building2 size={13} />}
                                {tab.icon === 'room' && (
                                    <DoorOpen size={13} className={selectedFilter === tab.id ? 'text-white' : 'text-purple-600'} />
                                )}
                                <span>{tab.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    selectedFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Image Gallery */}
                <div id="space-image-gallery" className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-8">
                    {/* Desktop Thumbnails Column */}
                    <div className="hidden md:flex md:flex-col gap-2 order-2 md:order-1">
                        {displayImages.slice(0, 5).map((img, idx) => (
                            <button
                                key={img.id || idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer group ${
                                    currentImageIndex === idx
                                        ? 'border-indigo-500 ring-2 ring-indigo-200'
                                        : 'border-transparent hover:border-indigo-300'
                                }`}
                                title={img.type === 'room' ? `Room: ${img.title}` : `Space: ${img.title}`}
                            >
                                <img
                                    src={getImageUrl(img.url)}
                                    alt={img.title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => { e.target.src = img.type === 'room' ? '/placeholders/room.jpg' : '/placeholders/space.jpg'; }}
                                />
                                <span className={`absolute top-1 left-1 p-0.5 rounded text-white text-[8px] font-bold shadow-xs ${
                                    img.type === 'room' ? 'bg-purple-600/90' : 'bg-indigo-600/90'
                                }`}>
                                    {img.type === 'room' ? <DoorOpen size={10} /> : <Building2 size={10} />}
                                </span>
                            </button>
                        ))}
                        {displayImages.length > 5 && (
                            <button
                                onClick={() => openLightbox(0)}
                                className="aspect-square rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                                +{displayImages.length - 5}
                            </button>
                        )}
                    </div>

                    {/* Hero Main Image Viewer */}
                    <div className="md:col-span-4 order-1 md:order-2">
                        <div
                            className="relative aspect-video bg-slate-100 rounded-2xl overflow-hidden cursor-pointer group shadow-xs"
                            onClick={() => openLightbox(currentImageIndex)}
                        >
                            {currentImg ? (
                                <>
                                    <img
                                        src={getImageUrl(currentImg.url)}
                                        alt={currentImg.title || space.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        onError={(e) => { e.target.src = currentImg.type === 'room' ? '/placeholders/room.jpg' : '/placeholders/space.jpg'; }}
                                    />

                                    {/* Overlay Badge identifying Room / Space */}
                                    <div className="absolute top-3.5 left-3.5 z-10 bg-slate-900/85 backdrop-blur-md text-white px-3.5 py-2 rounded-xl border border-white/15 shadow-lg flex items-center gap-2.5">
                                        {currentImg.type === 'room' ? (
                                            <>
                                                <div className="w-7 h-7 rounded-lg bg-purple-500/25 text-purple-300 flex items-center justify-center shrink-0">
                                                    <DoorOpen size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[8px] font-black uppercase tracking-wider text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded">
                                                            Room Photo
                                                        </span>
                                                        {currentImg.roomType && (
                                                            <span className="text-[9px] text-slate-300 font-medium">
                                                                {formatRoomType(currentImg.roomType)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs sm:text-sm font-black text-white mt-0.5 truncate max-w-[200px] sm:max-w-[340px]">
                                                        {currentImg.title}
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-7 h-7 rounded-lg bg-indigo-500/25 text-indigo-300 flex items-center justify-center shrink-0">
                                                    <Building2 size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[8px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                                                        Space Overview
                                                    </span>
                                                    <p className="text-xs sm:text-sm font-black text-white mt-0.5 truncate max-w-[200px] sm:max-w-[340px]">
                                                        {space.name}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Quick action button for room */}
                                    {currentImg.type === 'room' && currentImg.room && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedRoom(currentImg.room);
                                                setSelectedBookableType('room');
                                                handleBookNow();
                                            }}
                                            className="absolute bottom-3.5 left-3.5 z-10 bg-purple-600/90 hover:bg-purple-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 backdrop-blur-xs cursor-pointer"
                                        >
                                            <DoorOpen size={13} />
                                            <span>Book {currentImg.title}</span>
                                        </button>
                                    )}

                                    {/* Hover zoom icon */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                        <div className="bg-white/90 rounded-full p-2.5 shadow-lg">
                                            <Maximize2 size={20} className="text-slate-800" />
                                        </div>
                                    </div>

                                    {/* Previous / Next buttons */}
                                    {displayImages.length > 1 && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                title="Previous Image"
                                            >
                                                <ChevronLeft size={20} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                title="Next Image"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                            <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-md">
                                                {currentImageIndex + 1} / {displayImages.length}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon size={48} className="text-slate-300" />
                                </div>
                            )}
                        </div>

                        {/* Mobile thumbnails scroll strip */}
                        {displayImages.length > 1 && (
                            <div className="flex md:hidden gap-2 mt-3 overflow-x-auto pb-2 scrollbar-none">
                                {displayImages.map((img, idx) => (
                                    <button
                                        key={img.id || idx}
                                        onClick={() => setCurrentImageIndex(idx)}
                                        className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                                            currentImageIndex === idx
                                                ? 'border-indigo-500'
                                                : 'border-transparent'
                                        }`}
                                    >
                                        <img
                                            src={getImageUrl(img.url)}
                                            alt={img.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.target.src = img.type === 'room' ? '/placeholders/room.jpg' : '/placeholders/space.jpg'; }}
                                        />
                                        <span className={`absolute top-0.5 left-0.5 p-0.5 rounded text-white text-[7px] ${
                                            img.type === 'room' ? 'bg-purple-600' : 'bg-indigo-600'
                                        }`}>
                                            {img.type === 'room' ? <DoorOpen size={8} /> : <Building2 size={8} />}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Space Info */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="border-b border-slate-100 pb-4 mb-4">
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 wrap-break-word">
                                {space.name && space.name.length > 60
                                    ? space.name.substring(0, 57) + '...'
                                    : space.name}
                            </h1>                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                <div className="flex items-center gap-1">
                                    <MapPin size={14} className="text-slate-400" />
                                    <span className="text-sm text-slate-600">{space.area || space.district_id?.name || 'Iloilo City'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Star size={14} className="fill-amber-400 text-amber-400" />
                                    <span className="text-sm font-bold">{space.rating?.toFixed(1) || '5.0'}</span>
                                    <span className="text-slate-400 text-sm">({space.review_count || 0} reviews)</span>
                                </div>
                                <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${space.status === 'Open Now'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {space.status}
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-50 rounded-xl p-4 mb-6">
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-indigo-600">₱{space.rate_hour}</span>
                                <span className="text-slate-500">/hour</span>
                            </div>
                        </div>

                        {/* Rooms Section */}
                        {hasRooms && (
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <DoorOpen size={18} className="text-indigo-500" />
                                    <h3 className="font-black text-slate-900">Available Rooms</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {rooms.map((room) => {
                                        const availability = roomAvailability[room._id];
                                        const isAvailable = availability?.is_available !== false;
                                        const roomImgs = Array.isArray(room.images) && room.images.length > 0
                                            ? room.images
                                            : (room.image ? [room.image] : []);
                                        const primaryImg = roomImgs[0];

                                        return (
                                            <div
                                                key={room._id}
                                                className={`border rounded-2xl p-4 transition-all relative ${
                                                    isAvailable
                                                        ? 'border-slate-200/80 hover:shadow-md hover:border-indigo-300 bg-white'
                                                        : 'border-red-200 bg-red-50/40 opacity-70 cursor-not-allowed'
                                                }`}
                                            >
                                                <div className="flex gap-4 items-start">
                                                    {/* Room Image with Photo Badge */}
                                                    <div
                                                        onClick={(e) => {
                                                            if (roomImgs.length > 0) {
                                                                handleOpenRoomLightbox(room, e);
                                                            }
                                                        }}
                                                        className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 border border-slate-200/80 bg-slate-100 ${
                                                            roomImgs.length > 0 ? 'cursor-pointer group/img' : ''
                                                        }`}
                                                        title={roomImgs.length > 0 ? `Click to view ${roomImgs.length} room photos` : room.name}
                                                    >
                                                        {primaryImg ? (
                                                            <>
                                                                <img
                                                                    src={getImageUrl(primaryImg, 'room')}
                                                                    alt={room.name}
                                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                                                                    onError={(e) => { e.target.src = '/placeholders/room.jpg'; }}
                                                                />
                                                                {roomImgs.length > 1 && (
                                                                    <span className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                                                                        <ImageIcon size={10} />
                                                                        <span>{roomImgs.length}</span>
                                                                    </span>
                                                                )}
                                                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                                                                    <div className="bg-white/90 p-1.5 rounded-full text-slate-800 shadow-xs">
                                                                        <Maximize2 size={12} />
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                                                                <DoorOpen size={24} />
                                                                <span className="text-[9px] mt-1 font-bold">No photo</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Room Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <span className="text-[9px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md inline-block mb-1">
                                                                    {formatRoomType(room.type)}
                                                                </span>
                                                                <h4 className="font-black text-base text-slate-900 leading-snug truncate" title={room.name}>
                                                                    {room.name}
                                                                </h4>
                                                            </div>
                                                            {!isAvailable ? (
                                                                <span className="text-[9px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full shrink-0">
                                                                    Booked
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">
                                                                    Available
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            <div className="flex items-center gap-1 text-slate-500 text-xs">
                                                                <Users size={12} className="text-slate-400" />
                                                                <span>Up to {room.capacity} pax</span>
                                                            </div>
                                                            <span className="text-sm font-black text-indigo-600">₱{room.rate_hour}/hr</span>
                                                            {room.is_airconditioned && (
                                                                <span className="text-[9px] bg-cyan-50 text-cyan-700 font-bold px-1.5 py-0.5 rounded">
                                                                    AC
                                                                </span>
                                                            )}
                                                        </div>

                                                        {room.description && (
                                                            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                                                                {room.description}
                                                            </p>
                                                        )}

                                                        {/* Action buttons */}
                                                        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
                                                            {roomImgs.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleViewRoomPhotos(room, e)}
                                                                    className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <ImageIcon size={12} />
                                                                    <span>View Photos ({roomImgs.length})</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                disabled={!isAvailable}
                                                                onClick={() => {
                                                                    if (isAvailable) {
                                                                        setSelectedRoom(room);
                                                                        setSelectedBookableType('room');
                                                                        handleBookNow();
                                                                    }
                                                                }}
                                                                className="ml-auto px-3.5 py-1 text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-all cursor-pointer"
                                                            >
                                                                Book Room
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {space.description && (
                            <div className="mb-6">
                                <h3 className="font-black text-slate-900 mb-3">About this space</h3>
                                <p className="text-slate-600 leading-relaxed">{space.description}</p>
                            </div>
                        )}

                        {amenities.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-black text-slate-900 mb-3">Amenities</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {amenities.map((amenity, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                                            <CheckCircle size={14} className="text-emerald-500" />
                                            {amenity}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-slate-400" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Total Capacity</p>
                                    <p className="font-bold text-slate-900">{space.capacity || 0} people</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={18} className="text-slate-400" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Today's Hours</p>
                                    <p className="font-bold text-slate-900">{getTodayAccess()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Award size={18} className="text-slate-400" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Rewards</p>
                                    <p className="font-bold text-slate-900">Earn points</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Wifi size={18} className="text-slate-400" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Internet</p>
                                    <p className="font-bold text-slate-900">Fiber WiFi</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={() => setShowFullSchedule(!showFullSchedule)}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Clock size={18} className="text-indigo-500" />
                                    <span className="font-black text-slate-900">Weekly Schedule</span>
                                </div>
                                <ChevronDown className={`transition-transform ${showFullSchedule ? 'rotate-180' : ''}`} size={18} />
                            </button>

                            {showFullSchedule && (
                                <div className="mt-3 bg-white border border-slate-100 rounded-xl overflow-hidden">
                                    {weeklySchedule.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex justify-between items-center p-3 ${idx !== weeklySchedule.length - 1 ? 'border-b border-slate-100' : ''
                                                } ${item.active ? 'hover:bg-slate-50' : 'bg-slate-50/50'}`}
                                        >
                                            <span className={`font-bold text-sm ${item.active ? 'text-slate-900' : 'text-slate-400'}`}>
                                                {item.day}
                                            </span>
                                            <span className={`text-sm ${item.active ? 'text-slate-600' : 'text-slate-400'}`}>
                                                {item.active ? `${item.open} - ${item.close}` : 'Closed'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Book Now Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden sticky top-24 shadow-lg">
                            <div className="p-6">
                                <Button
                                    onClick={handleBookNow}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-black text-sm"
                                >
                                    Book Now
                                </Button>

                                <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Users size={14} /> Total Capacity: {space.capacity || 50} people
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Clock size={14} /> {getTodayAccess()}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Award size={14} /> Earn points on every booking
                                    </div>
                                    {hasRooms && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <DoorOpen size={14} /> {rooms.length} private rooms available
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <UserBookingModal
                isOpen={openBookingModal}
                onClose={() => setOpenBookingModal(false)}
                space={space}
                rooms={rooms}
                selectedBookableType={selectedBookableType}
                setSelectedBookableType={setSelectedBookableType}
                selectedRoom={selectedRoom}
                setSelectedRoom={setSelectedRoom}
                bookingData={bookingData}
                setBookingData={setBookingData}
                isOpenTime={isOpenTime}
                setIsOpenTime={setIsOpenTime}
                isClosedOnSelectedDate={isClosedOnSelectedDate}
                isOutsideHours={isOutsideHours}
                spaceAvailable={spaceAvailable}
                roomAvailable={roomAvailable}
                checkingAvailability={checkingAvailability}
                checkingSpaceAvailability={checkingSpaceAvailability}
                estimatedPrice={estimatedPrice}
                isBooking={isBooking}
                handleConfirmBooking={handleConfirmBooking}
                isBookingDisabled={isBookingDisabled}
                hasRooms={hasRooms}
                roomAvailability={roomAvailability}
                spaceAvailability={spaceAvailability}
                getPHDateString={getPHDateString}
            />

            {/* Lightbox Modal */}
            <UserLightboxModal
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                images={displayImages}
                currentIndex={lightboxIndex}
                onPrev={prevLightbox}
                onNext={nextLightbox}
                spaceName={space?.name}
            />
        </div>
    );
};

export default SpaceDetails;