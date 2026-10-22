import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { X, ChevronLeft, ChevronRight, DoorOpen, Building2 } from 'lucide-react';
import { getImageUrl } from '@/utils/imageHelper';

export const UserLightboxModal = ({ isOpen, onClose, images, currentIndex, onPrev, onNext, spaceName }) => {
    if (!images || images.length === 0) return null;

    const currentImg = images[currentIndex];
    const currentUrl = typeof currentImg === 'string' ? currentImg : currentImg?.url;
    const currentTitle = typeof currentImg === 'object' && currentImg?.title ? currentImg.title : spaceName;
    const currentSubtitle = typeof currentImg === 'object' && currentImg?.subtitle ? currentImg.subtitle : null;
    const isRoom = typeof currentImg === 'object' && currentImg?.type === 'room';

    return (
        <Modal open={isOpen} onClose={onClose} size="full" variant="dark">
            <div className="relative w-full h-screen flex items-center justify-center bg-black/95">
                {/* Header Title & Badge */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-3 max-w-[calc(100vw-100px)]">
                    <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15 shadow-lg">
                        {isRoom ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-600/90 text-white rounded-md text-[10px] font-black uppercase tracking-wider">
                                <DoorOpen size={12} />
                                <span>Room</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600/90 text-white rounded-md text-[10px] font-black uppercase tracking-wider">
                                <Building2 size={12} />
                                <span>Space</span>
                            </div>
                        )}
                        <div className="text-white min-w-0">
                            <p className="font-bold text-sm sm:text-base leading-tight truncate">{currentTitle}</p>
                            {currentSubtitle && (
                                <p className="text-[11px] text-white/70 leading-tight truncate">{currentSubtitle}</p>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                    title="Close"
                >
                    <X size={24} />
                </button>

                {currentUrl && (
                    <img
                        src={getImageUrl(currentUrl)}
                        alt={currentTitle || spaceName}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => { e.target.src = '/placeholders/space.jpg'; }}
                    />
                )}

                {images.length > 1 && (
                    <>
                        <button
                            onClick={onPrev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                            title="Previous Image"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={onNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                            title="Next Image"
                        >
                            <ChevronRight size={24} />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md border border-white/10 text-white text-xs px-3.5 py-1 rounded-full font-bold shadow-md">
                            {currentIndex + 1} / {images.length}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};