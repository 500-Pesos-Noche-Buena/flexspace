import React from 'react';
import { roomHourlyRate, roomRateLabel } from '@/utils/roomPricing';
export default function RoomGuestCount({ room, value = 1, onChange }) {
    if (!room) return null;
    const rate = roomHourlyRate(room, value);
    return <label className="block p-3 border border-border rounded-xl text-sm space-y-2">
        <span>Number of guests (pax)</span>
        <input required type="number" min="1" max={room.capacity} step="1" value={value} onChange={e => onChange(e.target.value)} className="block w-full p-2 rounded-lg border border-border bg-background" />
        <span className="block text-xs text-muted-foreground">{roomRateLabel(room)}</span>
        <span className="block text-xs">{rate == null ? 'No matching rate. Check the guest count.' : `Selected hourly / overtime rate: ₱${rate.toFixed(2)}`}</span>
    </label>;
}
