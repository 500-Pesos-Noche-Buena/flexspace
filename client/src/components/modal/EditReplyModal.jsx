import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Loader2, X } from 'lucide-react';

export const EditReplyModal = ({ isOpen, onClose, replyText, setReplyText, onSubmit, isSubmitting }) => {
    return (
        <Modal open={isOpen} onClose={onClose} title="Edit Reply" size="md" variant="dark">
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">
                        Edit your reply
                    </label>
                    <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows="4"
                        className="w-full mt-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-amber-500 outline-none resize-none"
                        placeholder="Edit your reply..."
                        autoFocus
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors rounded-xl"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={isSubmitting || !replyText.trim()}
                        className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-amber-600 transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Update Reply'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
