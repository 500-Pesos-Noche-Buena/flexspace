import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { QRCodeSVG } from "qrcode.react";
import { Star, MapPin, Users } from 'lucide-react';

export const ReviewQRModal = ({ isOpen, onClose, space }) => {
    const [showReviewQR, setShowReviewQR] = useState(false);

    if (!space) return null;

    const reviewUrl = `${import.meta.env.VITE_API_URL}/api/v1/space/review/space/${space._id}`;

    return (
        <Modal open={isOpen} onClose={onClose} title="Review QR Code" size="md" variant="dark">
            <div className="text-center py-4">
                <div className="mb-4">
                    <h3 className="text-lg font-black text-white">{space.name}</h3>
                    <div className="flex items-center justify-center gap-4 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <MapPin size={12} /> {space.address || 'Iloilo City'}
                        </span>
                        <span className="flex items-center gap-1">
                            <Users size={12} /> Capacity: {space.capacity || 'N/A'}
                        </span>
                    </div>
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
                            Customer scans to leave a review for this space
                        </p>
                        <div className="bg-white p-4 rounded-xl flex justify-center mx-auto" style={{ width: 'fit-content' }}>
                            <QRCodeSVG
                                value={reviewUrl}
                                size={180}
                                level="H"
                                includeMargin={false}
                            />
                        </div>
                        <p className="text-[8px] text-slate-500 mt-4 break-all">
                            {reviewUrl}
                        </p>
                        <p className="text-[8px] text-slate-500 mt-2">
                            Share this QR code with customers to leave a review
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};