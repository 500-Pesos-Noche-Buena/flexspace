import React, { useEffect, useState } from 'react';
import { estimateBookingTotal } from '@/utils/bookingEstimate';
import { apiGet } from '@/utils/Api';

import { useSearchParams } from 'react-router-dom';

export default function BookingOrderSelector({ selected, onSelect, refreshKey, cartTotal, disabled }) {
    const [params, setParams] = useSearchParams();
    const [sessions, setSessions] = useState([]);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [loadedKey, setLoadedKey] = useState(null);
    const [reload, setReload] = useState(0);
    const requestedId = params.get('booking_id');
    const requestKey = `${refreshKey}:${reload}:${requestedId || ''}`;
    const loading = loadedKey !== requestKey;
    useEffect(() => {
        let active = true;
        apiGet('/space/pos/active-sessions').then(res => {
            if (!res.success) throw new Error(res.message || 'Could not load active sessions');
            if (!active) return;
            setSessions(res.data);
            setError('');
            if (requestedId) {
                const booking = res.data.find(b => b._id === requestedId);
                if (booking) onSelect(booking);
                else setError('That session is no longer active. Choose another session.');
                setParams({}, { replace: true });
            }
        }).catch(err => { if (active) setError(err.message); })
            .finally(() => { if (active) setLoadedKey(requestKey); });
        return () => { active = false; };
    }, [requestKey, requestedId, onSelect, setParams]);
    const current = sessions.find(b => b._id === selected?._id);
    const name = b => `${b.user_id?.name || b.guest_name || 'Guest'} · ${b.room_id?.name || b.space_id?.name} · ${b.ticket_number} (${b.booking_type === 'walkin' ? 'Walk-in' : 'Booking'})`;
    const visible = sessions.filter(b => b._id === selected?._id || name(b).toLowerCase().includes(search.toLowerCase()));
    const projected = Number(current?.consumable_total || 0) + cartTotal;
    const allowance = Number(current?.consumable_allowance || 0);
    return <div className="p-4 border-b border-border space-y-2 text-xs">
        <div className="flex justify-between items-center"><label htmlFor="booking-order-session" className="font-bold">Add to booking / walk-in</label>
            <button type="button" disabled={disabled || loading} onClick={() => setReload(n => n + 1)}>Refresh</button></div>
        <input aria-label="Search active sessions" className="w-full p-2 rounded-lg bg-background border border-border" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guest, room, or ticket" />
        <select id="booking-order-session" disabled={disabled || loading} className="w-full p-2 rounded-lg bg-background border border-border" value={selected?._id || ''}
            onChange={e => onSelect(sessions.find(b => b._id === e.target.value) || null)}>
            <option value="">Standalone POS sale</option>
            {selected && !current && <option value={selected._id}>{name(selected)} — unavailable, refresh or clear</option>}
            {visible.map(b => <option key={b._id} value={b._id}>{name(b)}</option>)}
        </select>
        {loading && <p>Loading active sessions…</p>}
        {error && <p role="alert" className="text-rose-600">{error}</p>}
        {!loading && !error && !sessions.length && <p>No active sessions. Check in a booking or start a walk-in first.</p>}
        {current && <div className="rounded-lg bg-muted p-3 space-y-1" aria-live="polite">
            <p className="font-semibold">{current.promo_snapshot?.promo_name || 'Room bill'}</p>
            {current.promo_snapshot?.promo_price != null && <p>Package charge: ₱{Number(current.promo_snapshot.promo_price).toFixed(2)} · {current.promo_snapshot.promo_duration_hours} hours included</p>}
            {current.promo_snapshot?.room_portion != null && <p>Room portion included in package: ₱{Number(current.promo_snapshot.room_portion).toFixed(2)}</p>}
            <p>Included product credit: ₱{allowance.toFixed(2)}</p>
            <p>Consumables so far: ₱{Number(current.consumable_total).toFixed(2)}</p>
            <p>Remaining allowance: ₱{Math.max(0, allowance - current.consumable_total).toFixed(2)}</p>
            <p>With this cart: ₱{projected.toFixed(2)}</p>
            <p className="font-semibold">Total excess with cart: ₱{Math.max(0, projected - allowance).toFixed(2)}</p>
            <p className="font-bold">Estimated full bill with cart: ₱{(estimateBookingTotal(current) - Number(current.consumable_excess || 0) + Math.max(0, projected - allowance)).toFixed(2)}</p>
            <p>Pay the package, excess products and overtime together at checkout. The excess above is only the additional product charge.</p>
        </div>}
    </div>;
}
