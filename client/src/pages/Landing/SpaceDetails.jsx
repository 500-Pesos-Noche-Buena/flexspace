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

const getPHDateString = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
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

    // Update this useEffect to also trigger when date changes
    useEffect(() => {
        if (selectedBookableType === 'room' && selectedRoom && bookingData.date) {
            // Clear previous availability when date/time changes
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
                // Initialize availability state for each room
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

    const getImages = () => {
        const images = [];
        if (space?.images && space.images.length > 0) {
            images.push(...space.images);
        } else if (space?.image) {
            images.push(space.image);
        }
        return images;
    };

    const nextImage = () => {
        const images = getImages();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        const images = getImages();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const openLightbox = (index) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const nextLightbox = () => {
        const images = getImages();
        setLightboxIndex((prev) => (prev + 1) % images.length);
    };

    const prevLightbox = () => {
        const images = getImages();
        setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
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
            return selectedRoom.rate_hour;
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

    const handleConfirmBooking = async () => {
        if (!isOpenTime && (!bookingData.start_time || !bookingData.end_time)) {
            showToast({ icon: 'warning', title: 'Please select start and end time' });
            return;
        }

        if (selectedBookableType === 'room' && !selectedRoom) {
            showToast({ icon: 'warning', title: 'Please select a room' });
            return;
        }

        // Double-check availability before booking
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

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Loading space details...</div>
            </div>
        );
    }

    if (!space) return null;

    const images = getImages();
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
                {/* Shopee-style Image Gallery */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-8">
                    <div className="hidden md:flex md:flex-col gap-2 order-2 md:order-1">
                        {images.slice(0, 5).map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === idx
                                        ? 'border-indigo-500 ring-2 ring-indigo-200'
                                        : 'border-transparent hover:border-indigo-300'
                                    }`}
                            >
                                <img
                                    src={getImageUrl(img)}
                                    alt={`${space.name} ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => e.target.src = '/placeholders/space.jpg'}
                                />
                            </button>
                        ))}
                        {images.length > 5 && (
                            <button
                                onClick={() => openLightbox(0)}
                                className="aspect-square rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                            >
                                +{images.length - 5}
                            </button>
                        )}
                    </div>

                    <div className="md:col-span-4 order-1 md:order-2">
                        <div className="relative aspect-video bg-slate-100 rounded-2xl overflow-hidden cursor-pointer group"
                            onClick={() => openLightbox(currentImageIndex)}>
                            {images[currentImageIndex] ? (
                                <>
                                    <img
                                        src={getImageUrl(images[currentImageIndex])}
                                        alt={space.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        onError={(e) => e.target.src = '/placeholders/space.jpg'}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <div className="bg-white/90 rounded-full p-2">
                                            <Maximize2 size={20} className="text-slate-700" />
                                        </div>
                                    </div>
                                    {images.length > 1 && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <ChevronLeft size={20} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                            <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                                                {currentImageIndex + 1} / {images.length}
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

                        {images.length > 1 && (
                            <div className="flex md:hidden gap-2 mt-3 overflow-x-auto pb-2">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentImageIndex(idx)}
                                        className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${currentImageIndex === idx
                                                ? 'border-indigo-500'
                                                : 'border-transparent'
                                            }`}
                                    >
                                        <img
                                            src={getImageUrl(img)}
                                            alt={`${space.name} ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => e.target.src = '/placeholders/space.jpg'}
                                        />
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
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900">{space.name}</h1>
                            <div className="flex flex-wrap items-center gap-3 mt-2">
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

                        {/* Rooms Section - Disabled if already booked */}
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

                                        return (
                                            <div
                                                key={room._id}
                                                className={`border rounded-xl p-3 transition-all ${isAvailable
                                                        ? 'border-slate-100 hover:shadow-md cursor-pointer hover:border-indigo-200'
                                                        : 'border-red-200 bg-red-50/50 opacity-60 cursor-not-allowed'
                                                    }`}
                                                onClick={() => {
                                                    if (isAvailable) {
                                                        setSelectedRoom(room);
                                                        setSelectedBookableType('room');
                                                        handleBookNow();
                                                    } else {
                                                        showToast({
                                                            icon: 'info',
                                                            title: 'Room Not Available',
                                                            text: 'This room is already booked for the selected date. Please choose another room or date.'
                                                        });
                                                    }
                                                }}
                                            >
                                                <div className="flex gap-3">
                                                    {room.image && (
                                                        <img
                                                            src={getImageUrl(room.image)}
                                                            alt={room.name}
                                                            className="w-16 h-16 rounded-lg object-cover"
                                                            onError={(e) => e.target.src = '/placeholders/room.jpg'}
                                                        />
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="font-bold text-sm text-slate-900">{room.name}</h4>
                                                            {!isAvailable && (
                                                                <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                                                    Booked
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Users size={12} className="text-slate-400" />
                                                            <span className="text-xs text-slate-500">Up to {room.capacity}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs font-bold text-indigo-600">₱{room.rate_hour}/hr</span>
                                                            {room.is_airconditioned && (
                                                                <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">AC</span>
                                                            )}
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

            {/* Booking Modal */}
            <Modal open={openBookingModal} onClose={() => setOpenBookingModal(false)} title="Confirm Booking" size="xl" variant="light">
                {space && (
                    <div className="space-y-5 py-2">
                        {/* Space/Room Selection Toggle */}
                        {hasRooms && (
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                                <button
                                    onClick={() => {
                                        setSelectedBookableType('space');
                                        setSelectedRoom(null);
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${selectedBookableType === 'space'
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Sofa size={16} />
                                    <span className="text-xs font-bold">Hot Desk / Open Area</span>
                                </button>
                                <button
                                    onClick={() => setSelectedBookableType('room')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${selectedBookableType === 'room'
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <DoorOpen size={16} />
                                    <span className="text-xs font-bold">Private Room</span>
                                </button>
                            </div>
                        )}

                        {/* Room Selection with Availability Status */}
                        {selectedBookableType === 'room' && rooms.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">
                                    Select a Room
                                </label>
                                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                                    {rooms.map((room) => {
                                        const availability = roomAvailability[room._id];
                                        const isAvailable = availability?.is_available !== false;

                                        return (
                                            <button
                                                key={room._id}
                                                onClick={() => {
                                                    if (isAvailable) {
                                                        setSelectedRoom(room);
                                                    } else {
                                                        showToast({
                                                            icon: 'info',
                                                            title: 'Room Not Available',
                                                            text: 'This room is already booked for the selected time.'
                                                        });
                                                    }
                                                }}
                                                disabled={!isAvailable}
                                                className={`p-3 rounded-xl border-2 text-left transition-all ${selectedRoom?._id === room._id
                                                        ? 'border-indigo-500 bg-indigo-50'
                                                        : !isAvailable
                                                            ? 'border-red-200 bg-red-50 opacity-60 cursor-not-allowed'
                                                            : 'border-slate-100 hover:border-slate-200'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <p className="font-bold text-sm text-slate-900">{room.name}</p>
                                                    {!isAvailable && (
                                                        <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                                            Booked
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Users size={10} className="text-slate-400" />
                                                    <span className="text-[10px] text-slate-500">Up to {room.capacity}</span>
                                                </div>
                                                <p className="text-xs font-bold text-indigo-600 mt-1">₱{room.rate_hour}/hr</p>
                                                <div className="flex gap-1 mt-1">
                                                    {room.is_airconditioned && (
                                                        <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                                                            Aircon
                                                        </span>
                                                    )}
                                                    {room.has_window && (
                                                        <span className="text-[8px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded">
                                                            Window
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Selected item info */}
                        <div className={`rounded-2xl p-4 ${selectedBookableType === 'room' && selectedRoom && !roomAvailable
                                ? 'bg-red-50 border border-red-200'
                                : selectedBookableType === 'space' && !spaceAvailable
                                    ? 'bg-red-50 border border-red-200'
                                    : 'bg-linear-to-r from-indigo-50 to-purple-50'
                            }`}>
                            <h3 className="font-[1000] uppercase text-sm text-slate-900">{getBookableName()}</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-[10px] text-slate-500">₱{getRatePerHour()}/hour</p>
                                <div className="flex items-center gap-1">
                                    <Users size={10} className="text-slate-400" />
                                    <p className="text-[10px] text-slate-500">Capacity: {getBookableCapacity()}</p>
                                </div>
                            </div>

                            {/* Space availability warning */}
                            {selectedBookableType === 'space' && (
                                <>
                                    {!spaceAvailable && (
                                        <div className="mt-2 flex items-center gap-1 text-red-600">
                                            <AlertCircle size={12} />
                                            <p className="text-[9px] font-bold">No available seats for this time</p>
                                        </div>
                                    )}
                                    {spaceAvailable && bookingData.date && (
                                        <div className="mt-2 flex items-center gap-1 text-emerald-600">
                                            <CheckCircle size={10} />
                                            <p className="text-[8px] font-bold">{spaceAvailability.available} seats available for this time</p>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Room availability warning */}
                            {selectedBookableType === 'room' && selectedRoom && !roomAvailable && (
                                <div className="mt-2 flex items-center gap-1 text-red-600">
                                    <AlertCircle size={12} />
                                    <p className="text-[9px] font-bold">This room is already booked for the selected time</p>
                                </div>
                            )}
                            {selectedBookableType === 'room' && selectedRoom && roomAvailable && bookingData.date && (
                                <div className="mt-2 flex items-center gap-1 text-emerald-600">
                                    <CheckCircle size={10} />
                                    <p className="text-[8px] font-bold">Available for your selected time</p>
                                </div>
                            )}
                        </div>

                        {/* Open Time Toggle */}
                        <div
                            onClick={() => setIsOpenTime(!isOpenTime)}
                            className={`flex items-center gap-4 p-5 rounded-3xl cursor-pointer transition-all border-2 ${isOpenTime ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-transparent text-slate-600'
                                }`}
                        >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isOpenTime ? 'bg-indigo-500' : 'bg-white border border-slate-200'}`}>
                                {isOpenTime && <Check size={14} className="text-white" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest italic">Open Time Booking</p>
                                <p className="text-[9px] font-bold opacity-60 uppercase">I will scan in/out whenever I arrive.</p>
                            </div>
                        </div>

                        {/* Date Picker */}
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Booking Date</label>
                            <input
                                type="date"
                                min={getPHDateString()}
                                value={bookingData.date}
                                onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 outline-none text-sm font-bold text-slate-900"
                            />
                        </div>

                        {/* Time Selection */}
                        {!isOpenTime && (
                            <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Start Time</label>
                                    <input
                                        type="time"
                                        value={bookingData.start_time}
                                        onChange={(e) => setBookingData({ ...bookingData, start_time: e.target.value })}
                                        className="w-full mt-2 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 outline-none text-sm font-bold text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">End Time</label>
                                    <input
                                        type="time"
                                        value={bookingData.end_time}
                                        onChange={(e) => setBookingData({ ...bookingData, end_time: e.target.value })}
                                        className="w-full mt-2 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 outline-none text-sm font-bold text-slate-900"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Loading indicator */}
                        {(checkingAvailability || checkingSpaceAvailability) && selectedBookableType === 'room' && (
                            <div className="flex items-center justify-center gap-2 p-2">
                                <Loader2 size={14} className="animate-spin text-indigo-500" />
                                <span className="text-[8px] text-slate-500">Checking availability...</span>
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Special Notes</label>
                            <textarea
                                placeholder="Optional notes..."
                                value={bookingData.notes}
                                onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:border-indigo-500 min-h-20 text-slate-900"
                            />
                        </div>

                        {/* Price Summary */}
                        {estimatedPrice > 0 && (
                            <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Estimated Total</span>
                                    <span className="text-sm font-bold text-slate-900">₱{estimatedPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                    <span className="text-xs font-black uppercase text-slate-900">Total to Pay</span>
                                    <span className="text-xl font-[1000] italic text-indigo-600">₱{estimatedPrice.toFixed(2)}</span>
                                </div>
                                <p className="text-[8px] text-slate-400 text-center mt-2">
                                    Final amount will be calculated based on actual time spent
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setOpenBookingModal(false)}
                                className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmBooking}
                                disabled={isBooking ||
                                    (!isOpenTime && (!bookingData.start_time || !bookingData.end_time)) ||
                                    (selectedBookableType === 'room' && (!selectedRoom || !roomAvailable)) ||
                                    (selectedBookableType === 'space' && !spaceAvailable)}
                                className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isBooking ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Booking'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Lightbox Modal */}
            <Modal open={lightboxOpen} onClose={() => setLightboxOpen(false)} size="full" variant="dark">
                <div className="relative w-full h-screen flex items-center justify-center bg-black/95">
                    <button
                        onClick={() => setLightboxOpen(false)}
                        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                    >
                        <X size={24} />
                    </button>
                    {images.length > 0 && (
                        <>
                            <img
                                src={getImageUrl(images[lightboxIndex])}
                                alt={space.name}
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => e.target.src = '/placeholders/space.jpg'}
                            />
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={prevLightbox}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button
                                        onClick={nextLightbox}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                                        {lightboxIndex + 1} / {images.length}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default SpaceDetails;