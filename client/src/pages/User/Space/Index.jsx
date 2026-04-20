// User/Space/Index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { Search, MapPin, Loader2, ArrowRight, LayoutGrid, Check, Coins } from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Modal } from '@/components/ui/Modal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getPHDateString = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
};

const SpaceIndex = () => {
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('All');
    const [userPoints, setUserPoints] = useState(0);

    const [openModal, setOpenModal] = useState(false);
    const [selectedSpace, setSelectedSpace] = useState(null);
    const [isBooking, setIsBooking] = useState(false);
    const [isOpenTime, setIsOpenTime] = useState(false);
    
    const [bookingData, setBookingData] = useState({
        date: getPHDateString(),
        start_time: '',
        end_time: '',
        notes: ''
    });

    const fetchSpaces = useCallback(async (query = '', district = 'All') => {
        setLoading(true);
        try {
            const districtParam = district !== 'All' ? `&district=${district}` : '';
            const res = await apiGet(`/user/spaces?search=${query}${districtParam}`);
            setSpaces(res.data || []);
            
            // Fetch user points when loading spaces
            const bookingsRes = await apiGet('/user/bookings?limit=1');
            if (bookingsRes.data?.points !== undefined) {
                setUserPoints(bookingsRes.data.points);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSpaces(search, selectedDistrict);
    }, [selectedDistrict, search, fetchSpaces]);

    const handleOpenBooking = (space) => {
        setSelectedSpace(space);
        setOpenModal(true);
    };

    const handleConfirmBooking = async () => {
        // Validate required fields
        if (!isOpenTime && (!bookingData.start_time || !bookingData.end_time)) {
            showToast({ icon: 'warning', title: 'Please select start and end time' });
            return;
        }

        setIsBooking(true);
        try {
            const payload = {
                space_id: selectedSpace._id,
                date: bookingData.date,
                notes: bookingData.notes,
                is_open_time: isOpenTime,
                start_time: !isOpenTime ? bookingData.start_time : null,
                end_time: !isOpenTime ? bookingData.end_time : null,
            };

            const res = await apiPost('/user/bookings', payload);

            if (res.success || res.status === 'success') {
                showToast({ icon: 'success', title: 'Booking Confirmed!' });
                setOpenModal(false);
                // Reset form
                setIsOpenTime(false);
                setBookingData({
                    date: getPHDateString(),
                    start_time: '',
                    end_time: '',
                    notes: ''
                });
                // Refresh spaces to update points display
                fetchSpaces(search, selectedDistrict);
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Booking failed' });
        } finally {
            setIsBooking(false);
        }
    };

    // Calculate estimated price (for display only)
    const calculateEstimatedPrice = () => {
        if (!selectedSpace) return 0;
        
        const rateHour = selectedSpace.rate_hour || 0;
        
        if (isOpenTime) {
            return rateHour; // Flat rate for open time
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

    const estimatedPrice = calculateEstimatedPrice();

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 selection:bg-indigo-100">
            <header className="bg-white border-b border-slate-100 pt-10 sm:pt-16 pb-8 sm:pb-12 px-5 sm:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
                                <LayoutGrid size={12} className="text-indigo-600" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Explore Iloilo</span>
                            </div>
                            <h1 className="text-[2.75rem] sm:text-6xl lg:text-7xl font-[1000] italic tracking-tighter uppercase text-slate-900 leading-[0.85] mb-6">
                                Find Your <br /> <span className="text-indigo-600">Workstation.</span>
                            </h1>
                        </div>

                        <div className="relative w-full lg:max-w-md">
                            {/* Points Display */}
                            <div className="mb-3 flex justify-end">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                                    <Coins size={14} className="text-amber-600" />
                                    <span className="text-[9px] font-black uppercase text-amber-700">
                                        Your Points: {userPoints}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="relative group overflow-hidden rounded-3xl sm:rounded-4xl">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search location..."
                                    className="w-full pl-14 pr-6 py-5 sm:py-6 bg-slate-100 border-2 border-transparent rounded-3xl sm:rounded-4xl text-xs sm:text-sm font-bold focus:bg-white focus:border-indigo-600 transition-all outline-none text-slate-900"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-5 sm:px-8 mt-8 sm:mt-12">
                {loading ? (
                    <div className="py-32 flex flex-col items-center"><Loader2 className="text-indigo-600 animate-spin" size={40} /></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
                        {spaces.map((space) => (
                            <div key={space._id} className="bg-white border border-slate-100 rounded-[2.5rem] p-5 hover:border-indigo-100 transition-all group shadow-sm hover:shadow-2xl flex flex-col h-full">
                                <div className="h-44 sm:h-52 rounded-4xl bg-slate-100 mb-6 overflow-hidden relative">
                                    <img src={space.image ? `${API_BASE_URL}/uploads/spaces/${space.image}` : '/placeholder.jpg'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                    {space.rate_hour && (
                                        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg">
                                            <p className="text-white text-[9px] font-black uppercase tracking-widest">
                                                ₱{space.rate_hour}/{space.is_open_time_allowed ? 'day' : 'hr'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="grow px-1">
                                    <h3 className="text-slate-900 font-[1000] uppercase text-base tracking-tight mb-2 truncate">{space.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mb-6"><MapPin size={10} /> {space.area}</p>
                                </div>
                                <button
                                    onClick={() => handleOpenBooking(space)}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 group-hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/10"
                                >
                                    Book Space <ArrowRight size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Modal open={openModal} onClose={() => setOpenModal(false)} title="Confirm Booking" size="xl" variant="light">
                {selectedSpace && (
                    <div className="space-y-5 py-2">
                        {/* Space Info */}
                        <div className="bg-linear-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl">
                            <h3 className="font-[1000] uppercase text-sm text-slate-900">{selectedSpace.name}</h3>
                            <p className="text-[10px] text-slate-500 mt-1">₱{selectedSpace.rate_hour}/{selectedSpace.is_open_time_allowed ? 'day' : 'hour'}</p>
                        </div>

                        {/* Open Time Toggle */}
                        <div
                            onClick={() => setIsOpenTime(!isOpenTime)}
                            className={`flex items-center gap-4 p-5 rounded-3xl cursor-pointer transition-all border-2 ${
                                isOpenTime ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-transparent text-slate-600'
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

                        {/* Time Selection (if not open time) */}
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
                                onClick={() => setOpenModal(false)} 
                                className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmBooking}
                                disabled={isBooking || (!isOpenTime && (!bookingData.start_time || !bookingData.end_time))}
                                className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isBooking ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Booking'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SpaceIndex;