import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const formatPHTime = (dateStr) => new Date(dateStr).toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila'
});
const formatPHDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila'
});

export const BookingDetailsModal = ({ isOpen, onClose, booking, onConfirm, onReject, isApproving }) => {
    const { theme } = useTheme(); // Get current theme
    const isDark = theme === 'dark';
    
    if (!booking) return null;

    return (
        <Modal open={isOpen} onClose={onClose} title="Booking Details" size="lg">
            <div className="space-y-4">
                <div className={`${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'} border rounded-2xl p-4`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`text-[8px] ${isDark ? 'text-indigo-400' : 'text-indigo-600'} font-black uppercase`}>Booking ID</p>
                            <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>#{booking.ticket_number}</p>
                        </div>
                        <div className="text-right">
                            <p className={`text-[8px] ${isDark ? 'text-indigo-400' : 'text-indigo-600'} font-black uppercase`}>Type</p>
                            <p className={`text-xs font-black uppercase ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {booking.booking_type === 'walkin' ? 'Walk-in' : 'Online'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className={`${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-2xl p-4`}>
                    <p className={`text-[8px] ${isDark ? 'text-slate-500' : 'text-gray-500'} font-black uppercase mb-2`}>Customer Details</p>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Name</span>
                            <span className={`text-[10px] ${isDark ? 'text-white' : 'text-gray-900'} font-bold`}>
                                {booking.user_id?.name || booking.guest_name || 'Guest'}
                            </span>
                        </div>
                        {booking.user_id?.email && (
                            <div className="flex justify-between">
                                <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Email</span>
                                <span className={`text-[10px] ${isDark ? 'text-white' : 'text-gray-900'}`}>{booking.user_id.email}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-2xl p-4`}>
                    <p className={`text-[8px] ${isDark ? 'text-slate-500' : 'text-gray-500'} font-black uppercase mb-2`}>Booking Details</p>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Space</span>
                            <span className={`text-[10px] ${isDark ? 'text-white' : 'text-gray-900'} font-bold`}>{booking.space_id?.name}</span>
                        </div>
                        {booking.room_id && (
                            <div className="flex justify-between">
                                <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Room</span>
                                <span className="text-[10px] text-emerald-600 font-bold">
                                    {booking.room_id.name}
                                    <span className={`${isDark ? 'text-slate-500' : 'text-gray-400'} ml-1`}>(₱{booking.room_id.rate_hour}/hr)</span>
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Rate</span>
                            <span className={`text-[10px] ${isDark ? 'text-white' : 'text-gray-900'}`}>₱{booking.rate_per_hour || booking.space_id?.rate_hour}/hour</span>
                        </div>
                        <div className="flex justify-between">
                            <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Booking Type</span>
                            <span className={`text-[10px] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {booking.is_open_time ? 'Open Time' : 'Fixed Schedule'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Date</span>
                            <span className={`text-[10px] ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatPHDate(booking.start_time)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Time</span>
                            <span className={`text-[10px] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {booking.is_open_time
                                    ? 'All Day'
                                    : `${formatPHTime(booking.start_time)} - ${formatPHTime(booking.end_time)}`}
                            </span>
                        </div>
                        {booking.notes && (
                            <div className={`mt-2 pt-2 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                <p className={`text-[8px] ${isDark ? 'text-slate-500' : 'text-gray-500'} font-black uppercase mb-1`}>Notes</p>
                                <p className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{booking.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button onClick={onClose} className={`flex-1 py-3 text-[10px] font-black uppercase ${isDark ? 'text-slate-500 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors`}>
                        Cancel
                    </button>
                    <button onClick={() => onReject(booking._id)} className={`flex-1 py-3 rounded-2xl ${isDark ? 'bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white' : 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white'} font-black text-[10px] uppercase transition-all`}>
                        Reject
                    </button>
                    <button onClick={() => onConfirm(booking._id)} disabled={isApproving} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all disabled:opacity-50">
                        {isApproving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Confirm Booking
                    </button>
                </div>
            </div>
        </Modal>
    );
};