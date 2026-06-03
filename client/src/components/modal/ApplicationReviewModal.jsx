import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { XCircle, Eye } from 'lucide-react';
import { cn } from "@/lib/utils";
import { getImageUrl } from '@/utils/imageHelper';

export const ApplicationReviewModal = ({ 
    isOpen, 
    onClose, 
    application, 
    statusFilter,
    onDecision,
    getDocumentUrl,
    isImageFile
}) => {
    if (!application) return null;

    const isPending = statusFilter === 'pending';

    return (
        <Modal open={isOpen} onClose={onClose} title={isPending ? "Review Application" : "Audit Rejected Application"} size="lg">
            <div className="space-y-6 py-2">
                <div className={cn(
                    "p-6 rounded-[2.2rem] border shadow-inner transition-all",
                    isPending ? 'bg-muted border-border' : 'bg-rose-500/5 border-rose-500/20'
                )}>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 italic">Applicant Identity</p>
                    <p className="text-2xl font-black text-foreground italic">{application.name}</p>
                    <p className="text-sm text-primary font-bold tracking-tight">{application.email}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['business_permit', 'dti_sec_reg'].map(fileKey => {
                        const fileName = application[fileKey];
                        const fileUrl = getDocumentUrl(application, fileName);
                        const isImage = isImageFile(fileName);
                        
                        return (
                            <div key={fileKey} className="group">
                                <label className="text-[10px] font-black text-muted-foreground uppercase mb-3 block italic tracking-[0.2em]">
                                    {fileKey === 'business_permit' ? 'Business Permit' : 'DTI / SEC Registration'}
                                </label>
                                <div
                                    className="aspect-video md:aspect-4/3 rounded-4xl border border-border bg-card flex items-center justify-center overflow-hidden relative shadow-2xl group-hover:border-primary/50 transition-all cursor-pointer"
                                    onClick={() => {
                                        if (fileUrl) {
                                            window.open(fileUrl, '_blank');
                                        }
                                    }}
                                >
                                    {fileName ? (
                                        isImage ? (
                                            <img
                                                src={getImageUrl(fileUrl, 'document')}
                                                className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                                                alt={fileKey}
                                                onError={(e) => { e.target.src = '/placeholders/document.jpg'; }}
                                            />
                                        ) : (
                                            <div className="text-center p-4">
                                                <svg className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                                </svg>
                                                <span className="text-[10px] text-muted-foreground font-black uppercase">PDF Document</span>
                                                <span className="text-[8px] text-primary mt-2 block">Click to view</span>
                                            </div>
                                        )
                                    ) : (
                                        <div className="text-center">
                                            <XCircle size={32} className="mx-auto text-rose-600 dark:text-rose-400/30 mb-3" />
                                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-black uppercase">Document Missing</span>
                                        </div>
                                    )}
                                </div>
                                {fileName && (
                                    <div className="text-center mt-2">
                                        <button
                                            onClick={() => window.open(fileUrl, '_blank')}
                                            className="text-[8px] text-primary hover:text-primary/80 transition-colors"
                                        >
                                            Click to view full document →
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {isPending && (
                    <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-border">
                        <button 
                            onClick={() => onDecision(application._id, 'reject')} 
                            className="flex-1 py-4.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-3xl font-black uppercase text-[10px] hover:bg-rose-500 hover:text-white transition-all order-2 md:order-1 tracking-widest"
                        >
                            Deny Application
                        </button>
                        <button 
                            onClick={() => onDecision(application._id, 'approve')} 
                            className="flex-2 py-4.5 bg-primary text-primary-foreground rounded-3xl font-black uppercase text-[10px] hover:opacity-90 shadow-xl transition-all order-1 md:order-2 tracking-widest"
                        >
                            Verify & Approve
                        </button>
                    </div>
                )}

                {!isPending && (
                    <div className="flex gap-4 pt-6 border-t border-border">
                        <button 
                            onClick={() => onDecision(application._id, 'approve')} 
                            className="w-full py-4.5 bg-primary text-primary-foreground rounded-3xl font-black uppercase text-[10px] hover:opacity-90 transition-all shadow-xl tracking-widest"
                        >
                            Reverse Decision
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};