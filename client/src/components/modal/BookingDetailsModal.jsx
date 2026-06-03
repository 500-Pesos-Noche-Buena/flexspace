import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Loader2, CheckCircle2 } from 'lucide-react';

const formatPHTime = (dateStr) => new Date(dateStr).toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila'
});
const formatPHDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila'
});

export const BookingDetailsModal = ({ isOpen, onClose, booking, onConfirm, onReject, isApproving }) => {
    if (!booking) return null;

    return (
        <Modal open={isOpen} onClose={onClose} title="Booking Details" size="lg" variant="dark">
            <div className="space-y-4">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[8px] text-indigo-400 font-black uppercase">Booking ID</p>
                            <p className="text-sm font-black text-white">#{booking.ticket_number}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[8px] text-indigo-400 font-black uppercase">Type</p>
                            <p className="text-xs font-black text-white uppercase">
                                {booking.booking_type === 'walkin' ? 'Walk-in' : 'Online'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-4">
                    <p className="text-[8px] text-slate-500 font-black uppercase mb-2">Customer Details</p>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-slate-400">Name</span>
                            <span className="text-[10px] text-white font-bold">
                                {booking.user_id?.name || booking.guest_name || 'Guest'}
                            </span>
                        </div>
                        {booking.user_id?.email && (
                            <div className="flex justify-between">
                                <span className="text-[10px] text-slate-400">Email</span>
                                <span className="text-[10px] text-white">{booking.user_id.email}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-4">
                    <p className="text-[8px] text-slate-500 font-black uppercase mb-2">Booking Details</p>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-slate-400">Space</span>
                            <span className="text-[10px] text-white font-bold">{booking.space_id?.name}</span>
                        </div>
                        {booking.room_id && (
                            <div className="flex justify-between">
                                <span className="text-[10px] text-slate-400">Room</span>
                                <span className="text-[10px] text-emerald-400 font-bold">
                                    {booking.room_id.name}
                                    <span className="text-slate-500 ml-1">(₱{booking.room_id.rate_hour}/hr)</span>
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-[10px] text-slate-400">Rate</span>
                            <span className="text-[10px] text-white">₱{booking.rate_per_hour || booking.space_id?.rate_hour}/hour</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[10px] text-slate-400">Booking Type</span>
                            <span className="text-[10px] text-white">
                                {booking.is_open_time ? 'Open Time' : 'Fixed Schedule'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[10px] text-slate-400">Date</span>
                            <span className="text-[10px] text-white">{formatPHDate(booking.start_time)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[10px] text-slate-400">Time</span>
                            <span className="text-[10px] text-white">
                                {booking.is_open_time
                                    ? 'All Day'
                                    : `${formatPHTime(booking.start_time)} - ${formatPHTime(booking.end_time)}`}
                            </span>
                        </div>
                        {booking.notes && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                                <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Notes</p>
                                <p className="text-[9px] text-slate-400">{booking.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button onClick={() => onReject(booking._id)} className="flex-1 py-3 rounded-2xl bg-red-600/20 text-red-400 font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all">
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