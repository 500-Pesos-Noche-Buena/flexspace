import React from 'react';
import { roomPackageCredit, roomPackageDeduction } from '@/utils/roomPricing';
export default function RoomPackageChoice({ room, value, onChange, guestCount = 1 }) {
    if (!room?.has_consumable_promo || !room.consumable_packages?.length) return null;
    const selected = room.consumable_packages.find(p => p.audience === value);
    return <div className="p-3 border border-border rounded-xl space-y-2 text-sm">
        <label className="block">Consumable package
            <select required className="w-full mt-1 p-2 border border-border bg-background rounded-lg" value={selected ? value : ''} onChange={e => onChange(e.target.value)}>
                <option value="">Choose student or professional</option>
                {room.consumable_packages.map(p => <option key={p.audience} value={p.audience}>
                    {p.audience === 'student' ? 'Student' : 'Professional'} · ₱{Number(p.price).toFixed(2)}
                </option>)}
            </select>
        </label>
        {selected && <p>₱{Number(selected.price).toFixed(2)} includes {room.promo_duration_hours} hours: ₱{Number(roomPackageDeduction(room, value, guestCount)).toFixed(2)} room portion + ₱{Number(roomPackageCredit(room, value, guestCount)).toFixed(2)} food credit. The room portion is already included in the package price. Excess products and overtime are extra.</p>}
    </div>;
}
