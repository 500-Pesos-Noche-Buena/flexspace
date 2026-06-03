import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { QRCodeSVG } from "qrcode.react";
import { Star } from 'lucide-react';

export const ReviewQRModal = ({ isOpen, onClose, booking }) => {
    const [showReviewQR, setShowReviewQR] = useState(false);

    if (!booking) return null;

    return (
        <Modal open={isOpen} onClose={onClose} title="Leave a Review" size="md" variant="dark">
            <div className="text-center py-4">
                <div className="mb-4">
                    <h3 className="text-lg font-black text-white">{booking?.space_id?.name}</h3>
                    <p className="text-[10px] text-slate-500">Booking #{booking?.ticket_number}</p>
                    <p className="text-[10px] text-slate-500">Guest: {booking?.guest_name || 'Guest'}</p>
                </div>

                {!showReviewQR ? (
                    <button
                        onClick={() => setShowReviewQR(true)}
                        className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black uppercase text-sm transition-all flex items-center justify-center gap-2"
                    >
                        <Star size={18} /> Generate Review QR
                    </button>
                ) : (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6">
                        <p className="text-[10px] text-purple-400 font-black uppercase tracking-wider mb-4">
                            Customer scans to leave a review
                        </p>
                        <div className="bg-white p-4 rounded-xl flex justify-center mx-auto" style={{ width: 'fit-content' }}>
                            <QRCodeSVG
                                value={`${import.meta.env.VITE_API_URL}/api/v1/space/qr/${booking?.qr_code_token}`}
                                size={180}
                                level="H"
                                includeMargin={false}
                            />
                        </div>
                        <p className="text-[8px] text-slate-500 mt-4">
                            Share this QR code with the customer to leave a review
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};