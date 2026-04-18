import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Universal Modal Component
 * @param {string} variant - 'dark' (Admin) or 'light' (User)
 */
export const Modal = ({ 
    open, 
    onClose, 
    children, 
    title, 
    size = 'md', 
    variant = 'dark', // Default to dark for your Admin dashboard
    showClose = true 
}) => {
    
    const sizeMap = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        'full': 'max-w-[95vw]'
    };

    // Dynamic styles based on variant
    const theme = {
        dark: {
            content: "bg-[#111114] border-white/10 text-slate-300",
            header: "bg-indigo-600 text-white",
            close: "text-white/70 hover:bg-white/10 hover:text-white"
        },
        light: {
            content: "bg-white border-slate-100 text-slate-900",
            header: "bg-slate-900 text-white", // Black header for user side
            close: "text-white/50 hover:bg-white/20 hover:text-white"
        }
    };

    const activeTheme = theme[variant] || theme.dark;

    return (
        <Dialog.Root open={open} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay 
                    className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
                />
                
                <Dialog.Content 
                    className={cn(
                        "fixed left-[50%] top-[50%] z-101 grid w-[95%] sm:w-full translate-x-[-50%] translate-y-[-50%] gap-0",
                        "border shadow-2xl duration-200 outline-none",
                        "animate-in fade-in zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%]",
                        "rounded-4xl sm:rounded-[3rem] overflow-hidden",
                        activeTheme.content,
                        sizeMap[size] || sizeMap.md
                    )}
                >
                    {/* Header */}
                    {title && (
                        <div className={cn("p-6 sm:p-8 relative", activeTheme.header)}>
                            <Dialog.Title className="text-xl sm:text-2xl font-[1000] tracking-tighter uppercase italic leading-none">
                                {title}
                            </Dialog.Title>
                            
                            {showClose && (
                                <Dialog.Close className={cn("absolute right-6 top-1/2 -translate-y-1/2 rounded-full p-2 transition-all", activeTheme.close)}>
                                    <X size={20} />
                                </Dialog.Close>
                            )}
                        </div>
                    )}

                    {/* Body */}
                    <div className="p-6 sm:p-10 overflow-y-auto max-h-[85vh]">
                        {children}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};