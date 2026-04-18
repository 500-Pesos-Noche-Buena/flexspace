// User/Bookings/List.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import {
    XCircle, MapPin, Loader2, LogIn, LogOut,
    QrCode, ReceiptText, Zap, ScanLine
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { cn } from '@/lib/utils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getPHDateDisplay = (dateStr) => new Date(dateStr).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric'
});

const getPHTimeDisplay = (dateStr) => new Date(dateStr).toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit'
});

const STATUS_FILTERS = [
    'all', 
    'pending', 
    'confirmed', 
    'active', 
    'pending_payment',
    'completed', 
    'cancelled'
];

const statusStyles = {
    pending:         { badge: 'bg-amber-500/10 text-amber-600',    dot: 'bg-amber-500' },
    confirmed:       { badge: 'bg-emerald-500/10 text-emerald-600', dot: 'bg-emerald-500' },
    active:          { badge: 'bg-indigo-500/10 text-indigo-500',   dot: 'bg-indigo-500' },
    pending_payment: { badge: 'bg-purple-500/10 text-purple-600',   dot: 'bg-purple-500' },
    completed:       { badge: 'bg-slate-100 text-slate-500',        dot: 'bg-slate-400' },
    cancelled:       { badge: 'bg-red-500/10 text-red-500',         dot: 'bg-red-400' },
    rejected:        { badge: 'bg-red-500/10 text-red-500',         dot: 'bg-red-400' },
};

const QRScannerModal = ({ booking, onClose, onSuccess }) => {
    const instanceRef = useRef(null);
    const [scanning, setScanning] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        let html5QrCode;

        const startScanner = async () => {
            const { Html5Qrcode } = await import('html5-qrcode');

            html5QrCode = new Html5Qrcode('qr-reader', { verbose: false });
            instanceRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 220, height: 220 } },
                async (decodedText) => {
                    if (processing) return;
                    setProcessing(true);
                    await html5QrCode.stop().catch(() => {});
                    setScanning(false);

                    try {
                        const res = await apiPost('/user/bookings/scan', { token: decodedText });
                        if (res.success) {
                            const action = res.data?.check_out_at ? 'Checked out' : 'Checked in';
                            showToast({ icon: 'success', title: `${action} successfully!` });
                            onSuccess();
                            onClose();
                        }
                    } catch (err) {
                        showToast({ icon: 'error', title: err.message || 'Scan failed' });
                        setProcessing(false);
                        await html5QrCode.start(
                            { facingMode: 'environment' },
                            { fps: 10, qrbox: { width: 220, height: 220 } },
                            () => {}
                        );
                        setScanning(true);
                    }
                },
                () => {}
            );

            setScanning(true);
        };

        startScanner().catch(console.error);

        return () => {
            instanceRef.current?.stop().catch(() => {});
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-white p-8 rounded-[3rem] max-w-sm w-full text-center relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors"
                >
                    <XCircle size={24} />
                </button>

                <h2 className="text-slate-900 font-[1000] italic uppercase mb-1 tracking-tight">Scan Hub QR</h2>
                <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-widest font-bold">
                    {booking.ticket_number}
                </p>
                <p className="text-[10px] text-slate-400 mb-6 uppercase tracking-widest font-bold">
                    {booking.space_id?.name}
                </p>

                {/* Hide the injected html5-qrcode select/header UI entirely */}
                <style>{`
                    #qr-reader__header_message,
                    #qr-reader__status_span,
                    #qr-reader select,
                    #qr-reader img,
                    #qr-reader__dashboard_section_csr,
                    #qr-reader__dashboard_section_fsr,
                    #qr-reader__dashboard { display: none !important; }
                    #qr-reader { border: none !important; padding: 0 !important; }
                    #qr-reader video { border-radius: 1.5rem; width: 100% !important; }
                `}</style>

                <div className="relative overflow-hidden rounded-4xl bg-slate-900 mb-6" style={{ minHeight: 260 }}>
                    <div id="qr-reader" className="w-full" />

                    {scanning && !processing && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-52 h-52 relative">
                                <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl" />
                                <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl" />
                                <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl" />
                                <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-xl" />
                                <span className="absolute left-0 right-0 top-1/2 h-0.5 bg-indigo-400/60 animate-pulse" />
                            </div>
                        </div>
                    )}

                    {processing && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 rounded-4xl">
                            <Loader2 size={28} className="text-indigo-400 animate-spin" />
                            <p className="text-[10px] text-white font-black uppercase tracking-widest">Processing...</p>
                        </div>
                    )}
                </div>

                <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest animate-pulse">
                    Point camera at the hub's QR code
                </p>
            </div>
        </div>
    );
};

// ── Booking Card ─────────────────────────────────────────────────────────────
const BookingCard = ({ booking, onScan }) => {
    const space = booking.space_id;
    const style = statusStyles[booking.status] || statusStyles.cancelled;

    // Price Display Logic
    const rateHour = space?.rate_hour || 0;
    const isFlatRate = booking.is_open_time;
    const totalPaid = booking.total_amount || 0;

    return (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden">
            <div className="flex items-start gap-5">
                {/* Space Image/Icon */}
                <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-50">
                    {space?.image ? (
                        <img
                            src={`${API_BASE_URL}/uploads/spaces/${space.image}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            alt={space?.name}
                            onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.jpg'; }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ReceiptText size={24} />
                        </div>
                    )}
                </div>

                <div className="grow min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                            <h3 className="text-slate-900 font-[1000] uppercase text-sm tracking-tight truncate">
                                {space?.name || 'Unknown Hub'}
                            </h3>
                            
                            {/* Rate Display */}
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-lg">
                                    ₱{rateHour}{isFlatRate ? '/day' : '/hr'}
                                </p>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className={cn(
                            'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 shrink-0', 
                            style.badge
                        )}>
                            <span className={cn(
                                'w-1.5 h-1.5 rounded-full', 
                                style.dot, 
                                (booking.status === 'active' || booking.status === 'pending_payment') && 'animate-pulse'
                            )} />
                            {booking.status.replace('_', ' ')}
                        </div>
                    </div>

                    {/* Ticket & Time Info */}
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span className="text-[9px] font-black italic uppercase tracking-tighter text-indigo-600">
                            #{booking.ticket_number}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            {isFlatRate
                                ? `All Day — ${getPHDateDisplay(booking.start_time)}`
                                : `${getPHDateDisplay(booking.start_time)} · ${getPHTimeDisplay(booking.start_time)}`
                            }
                        </span>
                    </div>

                    {/* Timeline (In/Out) */}
                    {(booking.check_in_at || booking.check_out_at) && (
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                            {booking.check_in_at && (
                                <div className="flex items-center gap-1 text-emerald-600 text-[9px] font-black uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-xl">
                                    <LogIn size={10} /> {getPHTimeDisplay(booking.check_in_at)}
                                </div>
                            )}
                            {booking.check_out_at && (
                                <div className="flex items-center gap-1 text-slate-400 text-[9px] font-black uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-xl">
                                    <LogOut size={10} /> {getPHTimeDisplay(booking.check_out_at)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* --- ACTION STATES --- */}

            {/* 1. CONFIRMED (Ready to Scan In) */}
            {booking.status === 'confirmed' && (
                <div className="mt-5 pt-4 border-t border-slate-50">
                    <button
                        onClick={() => onScan(booking)}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-indigo-600 shadow-lg shadow-slate-900/20 active:scale-95"
                    >
                        <ScanLine size={14} />
                        Scan Hub QR to Check In
                    </button>
                </div>
            )}

            {/* 2. ACTIVE (Already Inside) */}
            {booking.status === 'active' && (
                <div className="mt-5 pt-4 border-t border-slate-50 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        <p className="text-[9px] text-indigo-600 font-black uppercase tracking-widest">
                            Session Active
                        </p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        Enjoy your stay! Go to counter to Check Out.
                    </p>
                </div>
            )}

            {/* 3. PENDING PAYMENT (Timer Stopped, Awaiting Cash/QR) */}
            {booking.status === 'pending_payment' && (
                <div className="mt-5 pt-4 border-t border-slate-50 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 mb-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                        </span>
                        <p className="text-[9px] text-purple-600 font-black uppercase tracking-widest">
                            Awaiting Payment
                        </p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        Please settle your bill at the counter.
                    </p>
                </div>
            )}

            {/* 4. COMPLETED (Display Final Price) */}
            {booking.status === 'completed' && (
                <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Amount Paid</p>
                    <p className="text-lg font-[1000] italic text-emerald-600 tracking-tighter">
                        ₱{totalPaid.toFixed(2)}
                    </p>
                </div>
            )}
        </div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const MyBookingsList = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [scanningBooking, setScanningBooking] = useState(null);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const statusParam = activeFilter !== 'all' ? `?status=${activeFilter}` : '';
            const res = await apiGet(`/user/bookings${statusParam}`);
            setBookings(res.data?.bookings || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [activeFilter]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-32 selection:bg-indigo-100 animate-in fade-in duration-700">
            
            {/* 1. MATCHED DASHBOARD HEADER */}
            <section className="pt-8 pb-12 px-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="relative">
                        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-indigo-50 border border-indigo-100">
                            <Zap size={12} className="text-indigo-600 fill-indigo-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                Booking History
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-[1000] italic tracking-tighter uppercase leading-[0.85] mb-4 text-slate-900">
                            My <br /><span className="text-indigo-600">Bookings.</span>
                        </h1>
                        <p className="text-sm text-slate-500 font-medium max-w-md">
                            Review your past sessions and active hub visits.
                        </p>
                    </div>

                    {/* Filter Toggle - Dashboard Style */}
                    <div className="flex bg-white p-1.5 rounded-4xl border border-slate-100 shadow-sm overflow-x-auto scrollbar-hide">
                        {STATUS_FILTERS.slice(0, 4).map((f) => ( // Showing top 4 for cleaner UI
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={cn(
                                    'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                                    activeFilter === f
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-slate-900'
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* 2. MAIN CONTENT - GRID WIDTH MATCHED */}
            <section className="px-6 max-w-7xl mx-auto">
                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="text-indigo-600 animate-spin" size={32} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Syncing History...</p>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-white/50">
                        <ReceiptText size={32} className="text-slate-200 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active records found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {bookings.map((b) => (
                            <BookingCard key={b._id} booking={b} onScan={setScanningBooking} />
                        ))}
                    </div>
                )}
            </section>

            {scanningBooking && (
                <QRScannerModal
                    booking={scanningBooking}
                    onClose={() => setScanningBooking(null)}
                    onSuccess={fetchBookings}
                />
            )}
        </div>
    );
};

export default MyBookingsList;