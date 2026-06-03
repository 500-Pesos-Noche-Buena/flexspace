import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Trash2 } from 'lucide-react';

export const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, productName, spaceName }) => {
    return (
        <Modal open={isOpen} onClose={onClose} title="Delete Product" size="sm">
            <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={28} className="text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="text-lg font-black text-foreground mb-2">Delete {productName}?</h3>
                <p className="text-[10px] text-muted-foreground mb-6">
                    This action cannot be undone. The product will be permanently removed from {spaceName}'s inventory.
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="flex-1 py-3 rounded-2xl bg-rose-600 text-white font-black text-[10px] uppercase hover:bg-rose-500 transition-all">
                        Delete Permanently
                    </button>
                </div>
            </div>
        </Modal>
    );
};