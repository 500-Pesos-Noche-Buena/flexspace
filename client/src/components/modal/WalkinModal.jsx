import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Users, CheckCircle, Loader2, UserPlus } from 'lucide-react';
import { cn } from "@/lib/utils";

export const WalkinModal = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    formData, 
    setFormData, 
    spaces, 
    roomsWithAvailability, 
    submitting, 
    fetchRoomsWithAvailability 
}) => {
    return (
        <Modal open={isOpen} onClose={onClose} title="New Walk-in Check-in" size="md" variant="dark">
            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Space</label>
                    <select
                        required
                        className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-emerald-500 outline-none text-sm"
                        value={formData.space_id}
                        onChange={async (e) => {
                            const spaceId = e.target.value;
                            setFormData({ ...formData, space_id: spaceId, room_id: '' });
                            if (spaceId) {
                                await fetchRoomsWithAvailability(spaceId);
                            }
                        }}
                    >
                        <option value="" className="bg-[#111114]">Choose space...</option>
                        {spaces.map(s => (
                            <option key={s._id} value={s._id} className="bg-[#111114]">{s.name}</option>
                        ))}
                    </select>
                </div>

                {formData.space_id && (
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            Select Room (Optional - Leave empty for hot desk)
                        </label>
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                            {roomsWithAvailability.length === 0 ? (
                                <div className="p-3 bg-white/5 rounded-xl text-center">
                                    <p className="text-[10px] text-slate-500">No rooms available today</p>
                                </div>
                            ) : (
                                roomsWithAvailability.map((room) => (
                                    <div
                                        key={room._id}
                                        onClick={() => {
                                            if (room.is_available) {
                                                setFormData({ ...formData, room_id: room._id });
                                            }
                                        }}
                                        className={`p-3 rounded-xl border transition-all cursor-pointer ${formData.room_id === room._id
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : room.is_available
                                                ? 'border-white/10 hover:border-emerald-500/50'
                                                : 'border-red-500/30 bg-red-500/5 opacity-60 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-bold text-white">{room.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Users size={12} className="text-slate-400" />
                                                    <span className="text-[10px] text-slate-400">Up to {room.capacity}</span>
                                                    <span className="text-[10px] text-emerald-400">₱{room.rate_hour}/hr</span>
                                                </div>
                                            </div>
                                            {!room.is_available ? (
                                                <span className="text-[8px] bg-red-500/20 text-red-400 px-2 py-1 rounded">Booked Today</span>
                                            ) : formData.room_id === room._id ? (
                                                <CheckCircle size={16} className="text-emerald-500" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border border-white/20" />
                                            )}
                                        </div>
                                        {room.is_airconditioned && (
                                            <span className="inline-block mt-2 text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Airconditioned</span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <p className="text-[8px] text-slate-600 mt-1">
                            {formData.room_id ? 'Guest will use private room' : 'Guest will use hot desk / open area'}
                        </p>
                    </div>
                )}

                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Guest Name</label>
                    <input
                        type="text"
                        required
                        placeholder="Enter guest name"
                        className="w-full mt-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-emerald-500 outline-none text-sm"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Open Time (Timer counts up)</span>
                    <input
                        type="checkbox"
                        className="w-5 h-5 accent-emerald-500"
                        checked={formData.is_open_time}
                        onChange={(e) => setFormData({ ...formData, is_open_time: e.target.checked })}
                    />
                </div>

                {!formData.is_open_time && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Start Time</label>
                            <input
                                type="time"
                                required
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-white focus:border-emerald-500 outline-none text-sm"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">End Time</label>
                            <input
                                type="time"
                                required
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-white focus:border-emerald-500 outline-none text-sm"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest">Rate Info</p>
                    <p className="text-xs text-white font-bold mt-1">
                        ₱{formData.room_id
                            ? roomsWithAvailability.find(r => r._id === formData.room_id)?.rate_hour
                            : spaces.find(s => s._id === formData.space_id)?.rate_hour || 0}/hour
                    </p>
                    <p className="text-[8px] text-slate-500 mt-1">
                        {formData.room_id ? 'Private room rate applied' : 'Open area / hot desk rate applied'}
                    </p>
                </div>

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all disabled:opacity-50">
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                        Check In
                    </button>
                </div>
            </form>
        </Modal>
    );
};