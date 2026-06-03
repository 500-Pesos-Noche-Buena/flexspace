import React, { useEffect, useRef, useState } from 'react';
import { XCircle, Loader2 } from 'lucide-react';
import { apiPost } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';

export const QRScannerModal = ({ booking, onClose, onSuccess }) => {
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
                    await html5QrCode.stop().catch(() => { });
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
                            () => { }
                        );
                        setScanning(true);
                    }
                },
                () => { }
            );

            setScanning(true);
        };

        startScanner().catch(console.error);

        return () => {
            instanceRef.current?.stop().catch(() => { });
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl sm:rounded-[3rem] p-5 sm:p-8 max-w-sm w-full text-center relative shadow-2xl mx-4">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-300 hover:text-slate-900 transition-colors z-10"
                >
                    <XCircle size={22} className="sm:w-6 sm:h-6" />
                </button>

                <h2 className="text-lg sm:text-xl text-slate-900 font-[1000] italic uppercase mb-1 tracking-tight">Scan Hub QR</h2>
                <p className="text-[9px] sm:text-[10px] text-slate-400 mb-1 uppercase tracking-widest font-bold">
                    {booking.ticket_number}
                </p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 mb-4 sm:mb-6 uppercase tracking-widest font-bold truncate px-2">
                    {booking.space_id?.name}
                </p>

                <style>{`
                    #qr-reader__header_message,
                    #qr-reader__status_span,
                    #qr-reader select,
                    #qr-reader img,
                    #qr-reader__dashboard_section_csr,
                    #qr-reader__dashboard_section_fsr,
                    #qr-reader__dashboard { display: none !important; }
                    #qr-reader { border: none !important; padding: 0 !important; }
                    #qr-reader video { border-radius: 1rem; width: 100% !important; }
                `}</style>

                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900 mb-4 sm:mb-6" style={{ minHeight: 260 }}>
                    <div id="qr-reader" className="w-full" />

                    {scanning && !processing && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-44 h-44 sm:w-52 sm:h-52 relative">
                                <span className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-3 sm:border-t-4 border-l-3 sm:border-l-4 border-indigo-400 rounded-tl-lg sm:rounded-tl-xl" />
                                <span className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-3 sm:border-t-4 border-r-3 sm:border-r-4 border-indigo-400 rounded-tr-lg sm:rounded-tr-xl" />
                                <span className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-3 sm:border-b-4 border-l-3 sm:border-l-4 border-indigo-400 rounded-bl-lg sm:rounded-bl-xl" />
                                <span className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-3 sm:border-b-4 border-r-3 sm:border-r-4 border-indigo-400 rounded-br-lg sm:rounded-br-xl" />
                                <span className="absolute left-0 right-0 top-1/2 h-0.5 bg-indigo-400/60 animate-pulse" />
                            </div>
                        </div>
                    )}

                    {processing && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 rounded-2xl sm:rounded-3xl">
                            <Loader2 size={24} className="text-indigo-400 animate-spin" />
                            <p className="text-[9px] sm:text-[10px] text-white font-black uppercase tracking-widest">Processing...</p>
                        </div>
                    )}
                </div>

                <p className="text-[8px] sm:text-[9px] text-indigo-500 font-black uppercase tracking-widest animate-pulse">
                    Point camera at the hub's QR code
                </p>
            </div>
        </div>
    );
};
