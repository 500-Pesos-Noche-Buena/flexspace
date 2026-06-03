import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/utils/imageHelper';

export const UserLightboxModal = ({ isOpen, onClose, images, currentIndex, onPrev, onNext, spaceName }) => {
    if (!images || images.length === 0) return null;

    return (
        <Modal open={isOpen} onClose={onClose} size="full" variant="dark">
            <div className="relative w-full h-screen flex items-center justify-center bg-black/95">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                >
                    <X size={24} />
                </button>
                {images.length > 0 && (
                    <>
                        <img
                            src={getImageUrl(images[currentIndex])}
                            alt={spaceName}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => e.target.src = '/placeholders/space.jpg'}
                        />
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={onPrev}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <button
                                    onClick={onNext}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                                >
                                    <ChevronRight size={24} />
                                </button>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                                    {currentIndex + 1} / {images.length}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};