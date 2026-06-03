import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Universal Modal Component - Auto-detects theme
 */
export const Modal = ({ 
    open, 
    onClose, 
    children, 
    title, 
    size = 'md', 
    showClose = true 
}) => {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // Check if dark class is present
        const checkTheme = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };
        
        checkTheme();
        
        // Listen for theme changes
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        
        // Also listen for storage events
        const handleStorageChange = () => {
            checkTheme();
        };
        
        window.addEventListener('theme-changed', handleStorageChange);
        
        return () => {
            observer.disconnect();
            window.removeEventListener('theme-changed', handleStorageChange);
        };
    }, []);
    
    const sizeMap = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        'full': 'max-w-[95vw]'
    };

    const overlayClass = isDark 
        ? "bg-black/60 backdrop-blur-sm"
        : "bg-black/30 backdrop-blur-sm";

    // Light mode specific classes
    const contentClass = isDark
        ? "bg-card border-border text-foreground"
        : "bg-white border-slate-200 text-slate-900";

    const headerClass = isDark
        ? "bg-primary text-primary-foreground"
        : "bg-slate-900 text-white";

    const closeClass = isDark
        ? "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
        : "text-white/70 hover:bg-white/20 hover:text-white";

    const bodyClass = isDark ? "bg-card" : "bg-white";

    return (
        <Dialog.Root open={open} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay 
                    className={cn(
                        "fixed inset-0 z-100 animate-in fade-in duration-300",
                        overlayClass
                    )} 
                />
                
                <Dialog.Content 
                    className={cn(
                        "fixed left-[50%] top-[50%] z-101 grid w-[95%] sm:w-full translate-x-[-50%] translate-y-[-50%] gap-0",
                        "border shadow-2xl duration-200 outline-none",
                        "animate-in fade-in zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%]",
                        "rounded-4xl sm:rounded-[3rem] overflow-hidden",
                        contentClass,
                        sizeMap[size] || sizeMap.md
                    )}
                >
                    {/* Header */}
                    {title && (
                        <div className={cn("p-6 sm:p-8 relative", headerClass)}>
                            <Dialog.Title className="text-xl sm:text-2xl font-[1000] tracking-tighter uppercase italic leading-none">
                                {title}
                            </Dialog.Title>
                            
                            {showClose && (
                                <Dialog.Close className={cn("absolute right-6 top-1/2 -translate-y-1/2 rounded-full p-2 transition-all", closeClass)}>
                                    <X size={20} />
                                </Dialog.Close>
                            )}
                        </div>
                    )}

                    {/* Body */}
                    <div className={cn(
                        "p-6 sm:p-10 overflow-y-auto max-h-[85vh]",
                        bodyClass
                    )}>
                        {children}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};