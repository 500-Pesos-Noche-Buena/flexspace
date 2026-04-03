import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn'; // Standard Shadcn utility

/**
 * Reusable Modal Component (Shadcn + Tailwind)
 * * @param {boolean} open - Controls visibility
 * @param {function} onClose - Function to call on close
 * @param {string} title - Header title
 * @param {string} size - 'sm', 'md', 'lg', 'xl', '2xl'
 */
export const Modal = ({ open, onClose, children, title, size = 'md' }) => {
    
    // Map your size props to Tailwind max-widths
    const sizeMap = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
    };

    return (
        <Dialog.Root open={open} onOpenChange={onClose}>
            <Dialog.Portal>
                {/* Overlay / Backdrop */}
                <Dialog.Overlay 
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
                />
                
                {/* Modal Content */}
                <Dialog.Content 
                    className={cn(
                        "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-0",
                        "border border-white/10 bg-[#111114] shadow-2xl duration-200",
                        "animate-in fade-in zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%]",
                        "sm:rounded-4xl overflow-hidden",
                        sizeMap[size] || sizeMap.md
                    )}
                >
                    {/* Header Bar */}
                    <div className="bg-indigo-600 p-6 relative">
                        <Dialog.Title className="text-xl font-black text-white tracking-tight uppercase italic">
                            {title}
                        </Dialog.Title>
                        
                        <Dialog.Close className="absolute right-5 top-5 rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-all">
                            <X size={20} />
                            <span className="sr-only">Close</span>
                        </Dialog.Close>
                    </div>

                    {/* Body */}
                    <div className="p-6 md:p-8 overflow-y-auto max-h-[80vh] text-slate-300">
                        {children}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};