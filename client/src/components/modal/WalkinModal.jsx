import RoomGuestCount from '@/components/RoomGuestCount';
import { roomHourlyRate, roomRateLabel, roomPackagePrice, roomPackageLabel, roomPackageCredit, roomPackageDeduction } from '@/utils/roomPricing';
import RoomPackageChoice from '@/components/RoomPackageChoice';
import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Users, CheckCircle, Loader2, UserPlus } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useTheme } from '@/hooks/useTheme';
import { FormInput, FormSelect } from '@/components/FormValidation';

export const WalkinModal = ({
    isOpen,
    onClose,
    onSubmit,
    formData,
    setFormData,
    spaces,
    roomsWithAvailability,
    submitting,
    loadingRooms = false // New prop with default
}) => {
    const { themeColor } = useTheme();

    const getButtonHoverColor = () => {
        const colors = {
            indigo: 'hover:bg-indigo-600',
            emerald: 'hover:bg-emerald-600',
            purple: 'hover:bg-purple-600',
            blue: 'hover:bg-blue-600',
            rose: 'hover:bg-rose-600',
            amber: 'hover:bg-amber-600',
        };
        return colors[themeColor] || colors.emerald;
    };

    // Handle form field changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    // Prepare space options for FormSelect
    const spaceOptions = spaces.map(space => ({
        value: space._id,
        label: space.name
    }));

    // Get room rate helper
    const getRoomRate = () => {
        if (formData.room_id) {
            const room = roomsWithAvailability.find(r => r._id === formData.room_id);
            return roomHourlyRate(room, formData.guest_count || 1) ?? 0;
        }
        const space = spaces.find(s => s._id === formData.space_id);
        return space?.rate_hour || 0;
    };

    const selectedRoom = roomsWithAvailability.find(room => room._id === formData.room_id);

    return (
        <Modal open={isOpen} onClose={onClose} title="New Walk-in Check-in" size="md">
            <form onSubmit={onSubmit} className="space-y-4">
                {/* Space Selection */}
                <FormSelect
                    label="Select Space"
                    name="space_id"
                    value={formData.space_id}
                    onChange={handleChange}
                    required={true}
                    options={spaceOptions}
                    placeholder="Choose space..."
                />

                {/* Room Selection (Optional) */}
                {formData.space_id && (
                    <div>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                            Select Room (Optional - Leave empty for hot desk)
                        </label>
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                            {loadingRooms ? (
                                <div className="p-3 bg-muted rounded-xl text-center">
                                    <Loader2 size={24} className="animate-spin mx-auto text-primary" />
                                    <p className="text-[10px] text-muted-foreground mt-2">Loading rooms...</p>
                                </div>
                            ) : roomsWithAvailability.length === 0 ? (
                                <div className="p-3 bg-muted rounded-xl text-center">
                                    <p className="text-[10px] text-muted-foreground">No rooms available today</p>
                                </div>
                            ) : (
                                roomsWithAvailability.map((room) => (
                                    <div
                                        key={room._id}
                                        onClick={() => {
                                            if (room.is_available) {
                                                // Toggle: if this room is already selected, deselect it
                                                if (formData.room_id === room._id) {
                                                    setFormData({ ...formData, room_id: '' }); // or null
                                                } else {
                                                    setFormData({ ...formData, room_id: room._id, use_consumable_promo: true });
                                                }
                                            }
                                        }}
                                        className={cn(
                                            "p-3 rounded-xl border transition-all cursor-pointer",
                                            formData.room_id === room._id
                                                ? 'border-primary bg-primary/10'
                                                : room.is_available
                                                    ? 'border-border hover:border-primary/50'
                                                    : 'border-rose-500/30 bg-rose-500/5 opacity-60 cursor-not-allowed'
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-bold text-foreground">{room.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Users size={12} className="text-muted-foreground" />
                                                    <span className="text-[10px] text-muted-foreground">Up to {room.capacity}</span>
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{roomRateLabel(room)}</span>
                                                    {room.has_consumable_promo && <span className="block text-xs text-emerald-600">{room.promo_name}: {room.promo_duration_hours} hours · {roomPackageLabel(room)} including room; food credit is after the room deduction</span>}
                                                </div>
                                            </div>
                                            {!room.is_available ? (
                                                <span className="text-[8px] bg-rose-500/20 text-rose-600 dark:text-rose-400 px-2 py-1 rounded">Booked Today</span>
                                            ) : formData.room_id === room._id ? (
                                                <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
                                            )}
                                        </div>
                                        {room.is_airconditioned && (
                                            <span className="inline-block mt-2 text-[8px] bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">Airconditioned</span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <p className="text-[8px] text-muted-foreground mt-1">
                            {formData.room_id ? 'Guest will use private room' : 'Guest will use hot desk / open area'}
                        </p>
                    </div>
                )}

                {selectedRoom?.has_consumable_promo && (
                    <label className="block p-3 rounded-xl border border-border text-sm">
                        <input type="checkbox" className="mr-2" checked={formData.use_consumable_promo !== false}
                            onChange={e => setFormData({ ...formData, use_consumable_promo: e.target.checked })} />
                        Use room consumable promo
                        <span className="block mt-2 text-xs text-muted-foreground">
                            {formData.use_consumable_promo !== false
                                ? `Package: ${roomPackageLabel(selectedRoom)} for ${selectedRoom.promo_duration_hours} hours including room; food credit is after the room deduction. Excess and overtime are extra.`
                                : 'Regular room pricing. Products added to this booking are charged in full.'}
                        </span>
                    </label>
                )}

                {formData.use_consumable_promo !== false && <RoomPackageChoice room={selectedRoom} value={formData.promo_audience} guestCount={formData.guest_count || 1} onChange={value => setFormData({ ...formData, promo_audience: value })} />}
                <RoomGuestCount room={selectedRoom} value={formData.guest_count || 1} onChange={value => setFormData({ ...formData, guest_count: value })} />
                {selectedRoom?.has_consumable_promo && formData.use_consumable_promo !== false && roomPackagePrice(selectedRoom, formData.promo_audience) != null && <p className="text-sm">Package ₱{Number(roomPackagePrice(selectedRoom, formData.promo_audience)).toFixed(2)} − room ₱{Number(roomPackageDeduction(selectedRoom, formData.promo_audience, formData.guest_count || 1)).toFixed(2)} = food credit ₱{Number(roomPackageCredit(selectedRoom, formData.promo_audience, formData.guest_count || 1)).toFixed(2)}</p>}
                {/* Guest Name */}
                <FormInput
                    label="Guest Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required={true}
                    placeholder="Enter guest name"
                />

                {/* Open Time Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted border border-border rounded-2xl">
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Open Time (Timer counts up)</span>
                    <input
                        type="checkbox"
                        name="is_open_time"
                        className="w-5 h-5 accent-primary"
                        checked={formData.is_open_time}
                        onChange={handleChange}
                    />
                </div>

                {/* Start & End Time (if not open time) */}
                {!formData.is_open_time && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">Start Time</label>
                            <input
                                type="time"
                                name="start_time"
                                required
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-background border border-border text-foreground focus:border-primary outline-none text-sm"
                                value={formData.start_time}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1">End Time</label>
                            <input
                                type="time"
                                name="end_time"
                                required
                                className="w-full mt-2 px-4 py-3 rounded-2xl bg-background border border-border text-foreground focus:border-primary outline-none text-sm"
                                value={formData.end_time}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                )}

                {/* Rate Info */}
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl">
                    <p className="text-[8px] text-primary font-black uppercase tracking-widest">Rate Info</p>
                    <p className="text-xs text-foreground font-bold mt-1">
                        {selectedRoom?.has_consumable_promo && formData.use_consumable_promo !== false
                            ? `Package ${roomPackagePrice(selectedRoom, formData.promo_audience) == null ? "— choose a package" : "₱" + roomPackagePrice(selectedRoom, formData.promo_audience)} / ${selectedRoom.promo_duration_hours} hours; overtime ₱${getRoomRate()}/hour`
                            : `₱${getRoomRate()}/hour`}
                    </p>
                    <p className="text-[8px] text-muted-foreground mt-1">
                        {formData.room_id ? 'Private room rate applied' : 'Open area / hot desk rate applied'}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className={cn(
                            "flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-50",
                            getButtonHoverColor()
                        )}
                    >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                        Check In
                    </button>
                </div>
            </form>
        </Modal>
    );
};