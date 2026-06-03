import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import {
    Clock, CheckCircle2, User, LogIn, LogOut, Activity,
    QrCode, Banknote, Loader2, BadgeCheck, Users, UserPlus, Star,
    Eye, CheckCircle, CreditCard
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from "@/lib/utils";
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentQRModal, WalkinModal, ReviewQRModal, BookingDetailsModal, BookingTicketModal } from '@/components/modal';
import { useTheme } from '@/hooks/useTheme';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatPHTime = (dateStr) => new Date(dateStr).toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila'
});
const formatPHDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila'
});
const formatScanTime = (d) => d ? new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' }) : '--:--';

const BookingsIndex = () => {
    const { themeColor } = useTheme();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, active: 0, walkin: 0, online: 0, revenue: 0 });
    const [currentParams, setCurrentParams] = useState({ page: 1, search: '' });
    const [bookingType, setBookingType] = useState('all');

    // Modal state
    const [selectedQR, setSelectedQR] = useState(null);
    const [liveAmount, setLiveAmount] = useState(0);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState(null);
    const [reviewQrUrl, setReviewQrUrl] = useState(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedReviewBooking, setSelectedReviewBooking] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);
    const [isApproving, setIsApproving] = useState(false);
    const [showWalkinModal, setShowWalkinModal] = useState(false);
    const [walkinForm, setWalkinForm] = useState({
        space_id: '',
        room_id: '',
        name: '',
        is_open_time: true,
        start_time: '',
        end_time: ''
    });
    const [spaces, setSpaces] = useState([]);
    const [roomsWithAvailability, setRoomsWithAvailability] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [showPaymentQRModal, setShowPaymentQRModal] = useState(false);
    const [paymentQRData, setPaymentQRData] = useState({ amount: 0, orderNumber: '', bookingId: '', spaceId: '' });

    const paramsRef = useRef(currentParams);
    const lastDataFingerprint = useRef("");

    const getButtonColor = () => {
        const colors = {
            indigo: 'hover:bg-indigo-600',
            emerald: 'hover:bg-emerald-600',
            purple: 'hover:bg-purple-600',
            blue: 'hover:bg-blue-600',
            rose: 'hover:bg-rose-600',
            amber: 'hover:bg-amber-600',
        };
        return colors[themeColor] || colors.indigo;
    };

    // Fetch spaces
    const fetchSpaces = useCallback(async () => {
        try {
            const res = await apiGet('/space/spaces');
            setSpaces(res.data || []);
        } catch (err) {
            console.error("Failed to fetch spaces", err);
        }
    }, []);

    // Fetch rooms with availability
    const fetchRoomsWithAvailability = async (spaceId) => {
        if (!spaceId) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const roomsRes = await apiGet(`/space/spaces/${spaceId}/rooms`);
            const rooms = roomsRes.data || [];
            const roomsWithStatus = await Promise.all(
                rooms.map(async (room) => {
                    try {
                        const availRes = await apiGet(`/landing/rooms/${room._id}/availability?date=${today}&is_open_time=true`);
                        return { ...room, is_available: availRes.success ? availRes.data.is_available : true };
                    } catch {
                        return { ...room, is_available: true };
                    }
                })
            );
            setRoomsWithAvailability(roomsWithStatus);
        } catch (err) {
            console.error('Failed to fetch rooms:', err);
            setRoomsWithAvailability([]);
        }
    };

    // Fetch booking details
    const fetchBookingDetails = async (bookingId) => {
        try {
            const res = await apiGet(`/space/bookings/${bookingId}/details`);
            if (res.success) {
                setSelectedBookingDetails(res.data);
                setShowDetailsModal(true);
            }
        } catch {
            showToast({ icon: 'error', title: 'Failed to load booking details' });
        }
    };

    // Handle confirm from details modal
    const handleConfirmFromDetails = async () => {
        if (!selectedBookingDetails) return;
        setIsApproving(true);
        try {
            await apiPost(`/space/bookings/${selectedBookingDetails._id}/confirm`);
            showToast({ icon: 'success', title: 'Booking confirmed successfully!' });
            setShowDetailsModal(false);
            setSelectedBookingDetails(null);
            await fetchData(paramsRef.current, false);
        } catch (err) {
            showToast({ icon: 'error', title: err?.message || 'Failed to confirm booking' });
        } finally {
            setIsApproving(false);
        }
    };

    // Open review modal
    const openReviewModal = (booking) => {
        setSelectedReviewBooking(booking);
        setShowReviewModal(true);
    };

    const closeReviewModal = () => {
        setShowReviewModal(false);
        setSelectedReviewBooking(null);
    };

    // Walk-in check-in
    const handleWalkinCheckin = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await apiPost('/space/walkins/store', walkinForm);
            if (res.success) {
                showToast({ icon: 'success', title: 'Walk-in checked in successfully!' });
                setShowWalkinModal(false);
                setWalkinForm({ space_id: '', name: '', is_open_time: true, start_time: '', end_time: '' });
                fetchData();
            }
        } catch (err) {
            showToast({ icon: 'error', title: err?.message || 'Check-in failed' });
        } finally {
            setSubmitting(false);
        }
    };

    // Fetch data
    const fetchData = useCallback(async (params = paramsRef.current, isSilent = false) => {
        try {
            const { page, search } = params;
            const res = await apiGet(`/space/bookings?page=${page}&search=${search}&type=${bookingType}`);
            const rowData = res.data?.bookings || [];
            const total = res.data?.total || 0;
            const fetched = res.data?.stats || { total: 0, pending: 0, confirmed: 0, active: 0, walkin: 0, online: 0, revenue: 0 };
            const fp = JSON.stringify({ rowData, total, fetched });
            if (fp !== lastDataFingerprint.current) {
                lastDataFingerprint.current = fp;
                setBookings(rowData);
                setTotalCount(total);
                setStats(fetched);
                if (selectedQR?._id) {
                    const detailsRes = await apiGet(`/space/bookings/${selectedQR._id}/details`);
                    if (detailsRes.success) {
                        setSelectedQR(detailsRes.data);
                        setLiveAmount(detailsRes.data.total_amount || 0);
                    }
                }
            }
        } catch {
            if (!isSilent) showToast({ icon: 'error', title: 'Failed to sync bookings' });
        }
    }, [bookingType, selectedQR?._id]);

    const handleParamsChange = useCallback((params) => {
        setCurrentParams(params);
        setLoading(true);
        fetchData(params).finally(() => setLoading(false));
    }, [fetchData]);

    const updateStatus = async (id, action) => {
        try {
            await apiPost(`/space/bookings/${id}/${action}`);
            showToast({ icon: 'success', title: `Booking ${action}ed` });
            fetchData(paramsRef.current, false);
        } catch {
            showToast({ icon: 'error', title: 'Action failed' });
        }
    };

    const openModal = async (row) => {
        try {
            const res = await apiGet(`/space/bookings/${row._id}/details`);
            if (res.success) {
                setSelectedQR(res.data);
                setLiveAmount(res.data.total_amount || 0);
                setShowReceipt(false);
                setReceiptData(null);
            } else {
                setSelectedQR(row);
                setLiveAmount(row.total_amount || 0);
                setShowReceipt(false);
                setReceiptData(null);
            }
        } catch {
            setSelectedQR(row);
            setLiveAmount(row.total_amount || 0);
            setShowReceipt(false);
            setReceiptData(null);
        }
    };

    const closeModal = () => {
        setSelectedQR(null);
        setLiveAmount(0);
        setIsCalculating(false);
        setIsSubmitting(false);
        setShowReceipt(false);
        setReceiptData(null);
    };

    const handleCalculate = async () => {
        if (!selectedQR) return;
        setIsCalculating(true);
        try {
            const isWalkin = selectedQR.booking_type === 'walkin';
            const endpoint = isWalkin ? `/space/walkins/${selectedQR._id}/calculate` : `/space/bookings/${selectedQR._id}/calculate`;
            const res = await apiPost(endpoint);
            const updatedBooking = res.data?.booking;
            if (updatedBooking) {
                setSelectedQR(updatedBooking);
                setLiveAmount(updatedBooking.total_amount || 0);
            }
            showToast({ icon: 'success', title: 'Session frozen — collect payment' });
            await fetchData(paramsRef.current, true);
        } catch (e) {
            showToast({ icon: 'error', title: e?.message || 'Could not calculate bill' });
        } finally {
            setIsCalculating(false);
        }
    };

    const handlePaymentComplete = async ({ method, amount_received }) => {
        if (!selectedQR) return;
        setIsSubmitting(true);
        try {
            const isWalkin = selectedQR.booking_type === 'walkin';
            const endpoint = isWalkin ? `/space/walkins/${selectedQR._id}/checkout` : `/space/bookings/${selectedQR._id}/checkout`;
            const res = await apiPost(endpoint, { payment_method: method, amount_received });
            const inner = res.data;
            const bookingData = inner?.booking || selectedQR;
            const qrUrl = inner?.review_qr_url || null;
            setReceiptData(bookingData);
            setReviewQrUrl(qrUrl);
            setShowReceipt(true);
            await fetchData(paramsRef.current, false);
            showToast({ icon: 'success', title: 'Payment completed successfully!' });
        } catch (e) {
            showToast({ icon: 'error', title: e?.message || 'Checkout failed' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApplyVoucher = async (updatedBooking) => {
        if (updatedBooking) {
            setSelectedQR(updatedBooking);
            setLiveAmount(updatedBooking.total_amount || 0);
            await fetchData(paramsRef.current, true);
        }
    };

    const handleOpenOnlinePayment = ({ amount, orderNumber, bookingId, spaceId }) => {
        closeModal();
        setTimeout(() => {
            setPaymentQRData({ amount, orderNumber, bookingId, spaceId });
            setShowPaymentQRModal(true);
        }, 100);
    };

    const handleOnlinePaymentComplete = async (orderNumber) => {
        showToast({ icon: 'success', title: 'Payment confirmed!' });
        await fetchData();
        setShowPaymentQRModal(false);
    };

    // Effects
    useEffect(() => { fetchSpaces(); }, [fetchSpaces]);
    useEffect(() => { paramsRef.current = currentParams; }, [currentParams]);
    useEffect(() => { fetchData(paramsRef.current, false); }, [bookingType, fetchData]);
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            await fetchData(paramsRef.current, false);
            if (mounted) setLoading(false);
        };
        load();
        const id = setInterval(() => {
            if (mounted && document.visibilityState === 'visible') fetchData(paramsRef.current, true);
        }, 3000);
        return () => { mounted = false; clearInterval(id); };
    }, [fetchData]);

    const booking = selectedQR;
    const isActive = booking?.status === 'active';
    const isPendingPayDB = booking?.status === 'pending_payment';
    const showPayment = isPendingPayDB;

    const columns = [
        {
            header: "Ref & Time",
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-foreground font-black italic uppercase tracking-tighter">#{row.ticket_number || 'N/A'}</span>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                        {row.is_open_time ? `ALL DAY: ${formatPHDate(row.start_time)}` : `START: ${formatPHTime(row.start_time)} - END: ${formatPHTime(row.end_time)}`}
                    </span>
                </div>
            )
        },
        {
            header: "Customer",
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-primary border border-border"><User size={14} /></div>
                    <p className="text-xs text-foreground font-bold">{row.user_id?.name || row.guest_name || 'Guest'}</p>
                </div>
            )
        },
        {
            header: "Scan Logs",
            cell: (row) => (
                <div className="text-[10px] space-y-1">
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold tracking-tighter"><LogIn size={10} /> {formatScanTime(row.check_in_at)}</div>
                    <div className="flex items-center gap-1 text-primary font-bold tracking-tighter"><LogOut size={10} /> {formatScanTime(row.check_out_at)}</div>
                </div>
            )
        },
        {
            header: "Status",
            cell: (row) => {
                const styles = {
                    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    confirmed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    active: "bg-primary/10 text-primary border border-primary/20",
                    pending_payment: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
                    completed: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
                    rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                    cancelled: "bg-muted text-muted-foreground"
                };
                return (
                    <div className={cn("px-2 py-1 rounded text-[9px] font-black uppercase inline-flex items-center gap-1", styles[row.status])}>
                        {row.status === 'active' && <Activity size={10} className="animate-pulse" />}
                        {row.status === 'pending_payment' && <Banknote size={10} className="animate-pulse" />}
                        {row.status}
                    </div>
                );
            }
        },
        {
            header: "Actions",
            cell: (row) => (
                <div className="flex gap-2">
                    {row.status === 'pending' && (
                        <button onClick={() => fetchBookingDetails(row._id)} className="p-2 bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all">
                            <Eye size={14} />
                        </button>
                    )}
                    {['confirmed', 'active', 'pending_payment'].includes(row.status) && (
                        <button onClick={() => openModal(row)} className={cn("flex items-center gap-2 px-3 py-1.5 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg", row.status === 'pending_payment' ? "bg-amber-600 hover:bg-amber-500 shadow-amber-900/40" : "bg-primary hover:opacity-90 shadow-lg")}>
                            {row.status === 'pending_payment' ? (<><Banknote size={12} /> Collect</>) : row.booking_type === 'walkin' ? (<><User size={12} /> View</>) : (<><QrCode size={12} /> Show QR</>)}
                        </button>
                    )}
                    {row.status === 'completed' && row.qr_code_token && (
                        <button onClick={() => openReviewModal(row)} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-600 dark:text-purple-400 rounded-xl text-[10px] font-black uppercase transition-all hover:bg-purple-600 hover:text-white border border-purple-500/30">
                            <Star size={12} /> Review
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-10">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-foreground italic uppercase tracking-tighter">Live Hub Traffic</h1>
                <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-widest italic">Monitoring real-time check-ins.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="bg-primary/5 border-primary/10"><CardContent className="p-5 flex items-center gap-4"><div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center"><Activity size={20} className="animate-pulse text-primary" /></div><div><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Active Sessions</p><p className="text-xl font-[1000] text-foreground italic tracking-tighter">{stats.active || 0}</p></div></CardContent></Card>
                <Card className="bg-card border-border"><CardContent className="p-5 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"><Users size={20} /></div><div><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Traffic Mix</p><div className="flex items-baseline gap-2"><span className="text-xs font-black text-primary">W: {stats.walkin || 0}</span><span className="text-xs font-black text-emerald-600 dark:text-emerald-400">O: {stats.online || 0}</span></div></div></div></CardContent></Card>
                <Card className="bg-amber-500/5 border-amber-500/10"><CardContent className="p-5 flex items-center gap-4"><div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center"><Clock size={20} className="text-amber-600 dark:text-amber-400" /></div><div><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Pending</p><p className="text-xl font-[1000] text-foreground italic tracking-tighter">{stats.pending || 0}</p></div></CardContent></Card>
                <Card className="bg-emerald-500/5 border-emerald-500/10"><CardContent className="p-5 flex items-center gap-4"><div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center"><Banknote size={20} className="text-emerald-600 dark:text-emerald-400" /></div><div><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Today's Revenue</p><p className="text-xl font-[1000] text-emerald-600 dark:text-emerald-400 italic tracking-tighter">₱{(stats.revenue || 0).toLocaleString()}</p></div></CardContent></Card>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <Tabs value={bookingType} onValueChange={setBookingType} className="w-auto">
                    <TabsList className="bg-muted border border-border rounded-3xl p-1.5">
                        <TabsTrigger value="all" className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg text-muted-foreground">All</TabsTrigger>
                        <TabsTrigger value="online" className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg text-muted-foreground">Online</TabsTrigger>
                        <TabsTrigger value="walkin" className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg text-muted-foreground">Walk-ins</TabsTrigger>
                    </TabsList>
                </Tabs>
                {/* EXACT SAME PATTERN AS VOUCHERSINDEX */}
                <button
                    onClick={() => setShowWalkinModal(true)}
                    className={cn(
                        "bg-primary text-primary-foreground px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl active:scale-95",
                        getButtonColor()
                    )}
                >
                    <UserPlus size={14} /> New Walk-in
                </button>
            </div>

            <WalkinModal
                isOpen={showWalkinModal}
                onClose={() => setShowWalkinModal(false)}
                onSubmit={handleWalkinCheckin}
                formData={walkinForm}
                setFormData={setWalkinForm}
                spaces={spaces}
                roomsWithAvailability={roomsWithAvailability}
                submitting={submitting}
                fetchRoomsWithAvailability={fetchRoomsWithAvailability}
            />

            <ReviewQRModal
                isOpen={showReviewModal}
                onClose={closeReviewModal}
                booking={selectedReviewBooking}
            />

            <BookingDetailsModal
                isOpen={showDetailsModal}
                onClose={() => {
                    setShowDetailsModal(false);
                    setSelectedBookingDetails(null);
                }}
                booking={selectedBookingDetails}
                onConfirm={handleConfirmFromDetails}
                onReject={(id) => updateStatus(id, 'reject')}
                isApproving={isApproving}
            />

            <BookingTicketModal
                isOpen={!!booking}
                onClose={closeModal}
                booking={booking}
                showReceipt={showReceipt}
                receiptData={receiptData}
                isActive={isActive}
                showPayment={showPayment}
                liveAmount={liveAmount}
                isCalculating={isCalculating}
                isSubmitting={isSubmitting}
                reviewQrUrl={reviewQrUrl}
                onCalculate={handleCalculate}
                onPaymentComplete={handlePaymentComplete}
                onApplyVoucher={handleApplyVoucher}
                onOpenOnlinePayment={handleOpenOnlinePayment}
                setLiveAmount={setLiveAmount}
            />

            <PaymentQRModal
                isOpen={showPaymentQRModal}
                onClose={() => setShowPaymentQRModal(false)}
                orderNumber={paymentQRData.orderNumber}
                amount={paymentQRData.amount}
                spaceId={paymentQRData.spaceId}
                onPaymentComplete={handleOnlinePaymentComplete}
            />

            <DataTable
                columns={columns}
                data={bookings}
                loading={loading}
                totalCount={totalCount}
                onParamsChange={handleParamsChange}
                renderMobileCard={(booking) => (
                    <div key={booking._id} className="bg-card border-border p-5 rounded-[2.5rem] space-y-4 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center font-black text-primary-foreground italic">{booking.user_id?.name?.charAt(0) || booking.guest_name?.charAt(0) || 'G'}</div>
                                <div><h3 className="text-sm font-black text-foreground leading-tight">{booking.user_id?.name || booking.guest_name || 'Guest'}</h3><p className="text-[10px] font-bold text-muted-foreground">#{booking.ticket_number}</p></div>
                            </div>
                            <div className={cn("px-2 py-1 rounded text-[9px] font-black uppercase", 
                                booking.status === 'active' && "bg-primary/10 text-primary",
                                booking.status === 'pending_payment' && "bg-orange-500/10 text-orange-600 dark:text-orange-400",
                                booking.status === 'completed' && "bg-teal-500/10 text-teal-600 dark:text-teal-400",
                                booking.status === 'pending' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                booking.status === 'confirmed' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            )}>{booking.status}</div>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground"><span>{booking.space_id?.name}</span><span>₱{booking.space_id?.rate_hour}/hr</span></div>
                        <div className="flex justify-between text-[9px] text-muted-foreground"><span>{booking.is_open_time ? `ALL DAY: ${formatPHDate(booking.start_time)}` : `${formatPHTime(booking.start_time)} - ${formatPHTime(booking.end_time)}`}</span>{booking.check_in_at && <span className="text-emerald-600 dark:text-emerald-400">✓ Checked in</span>}</div>
                        <div className="flex gap-2">
                            {['confirmed', 'active', 'pending_payment'].includes(booking.status) && (
                                <button onClick={() => openModal(booking)} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all text-white", booking.status === 'pending_payment' ? "bg-amber-600 hover:bg-amber-500" : "bg-primary hover:opacity-90")}>
                                    {booking.status === 'pending_payment' ? 'Collect Payment' : booking.status === 'active' ? 'View Session' : 'Show QR'}
                                </button>
                            )}
                            {booking.status === 'completed' && booking.qr_code_token && (
                                <button onClick={() => openReviewModal(booking)} className="flex-1 py-3 bg-purple-600/20 text-purple-600 dark:text-purple-400 rounded-xl text-[10px] font-black uppercase transition-all hover:bg-purple-600 hover:text-white border border-purple-500/30 flex items-center justify-center gap-2"><Star size={12} /> Review</button>
                            )}
                            {booking.status === 'pending' && (
                                <div className="flex-1 flex gap-2">
                                    <button onClick={() => fetchBookingDetails(booking._id)} className="flex-1 py-3 bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"><Eye size={12} /> View Details</button>
                                    <button onClick={() => updateStatus(booking._id, 'reject')} className="flex-1 py-3 bg-rose-600/20 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-black uppercase hover:bg-rose-600 hover:text-white transition-all">Reject</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            />
        </div>
    );
};

export default BookingsIndex;