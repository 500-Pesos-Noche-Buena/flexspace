import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { getImageUrl } from '@/utils/imageHelper';

export const DocumentPreviewModal = ({ isOpen, onClose, docUrl, docName }) => {
    const isImageFile = (url) => {
        return url && /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    };

    return (
        <Modal open={isOpen} onClose={onClose} title={docName || 'Document Preview'} size="xl">
            {docUrl && (
                <div className="w-full">
                    {isImageFile(docUrl) ? (
                        <img
                            src={getImageUrl(docUrl, 'document')}
                            alt={docName}
                            className="w-full max-h-[70vh] object-contain rounded-lg"
                            onError={(e) => {
                                e.target.src = '/placeholders/document.jpg';
                            }}
                        />
                    ) : (
                        <iframe
                            src={docUrl}
                            className="w-full h-[70vh] rounded-lg bg-white"
                            title={docName}
                        />
                    )}
                    <div className="mt-4 text-center">
                        <button
                            onClick={() => window.open(docUrl, '_blank')}
                            className="text-[10px] text-primary hover:text-primary/80 transition-colors"
                        >
                            Open in new window →
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};