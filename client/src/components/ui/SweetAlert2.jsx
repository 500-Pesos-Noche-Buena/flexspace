import Swal from 'sweetalert2'
import { cn } from '@/lib/utils'

// Function to get current theme colors
const getThemeColors = () => {
    const isDark = document.documentElement.classList.contains('dark');
    return {
        isDark,
        background: isDark ? 'var(--card)' : '#ffffff',
        color: isDark ? 'var(--foreground)' : '#1e293b',
        popupClass: isDark 
            ? 'bg-card border-border text-foreground' 
            : 'bg-white border-slate-200 text-slate-900',
        cancelButtonClass: isDark
            ? 'bg-muted text-muted-foreground hover:bg-muted/80'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
    };
};

export const toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer
        toast.onmouseleave = Swal.resumeTimer
    },
})

export const showToast = ({ icon = 'success', title = '', text = '', message = '' }) => {
    const messageText = text || message || '';
    const colors = getThemeColors();
    
    toast.fire({ 
        icon, 
        title,
        text: messageText,
        background: colors.background,
        color: colors.color,
        iconColor: icon === 'success' ? '#10b981' : icon === 'error' ? '#ef4444' : icon === 'warning' ? '#f59e0b' : '#3b82f6',
        customClass: {
            popup: cn(
                "rounded-2xl border shadow-xl",
                colors.popupClass
            ),
        }
    })
}

/**
 * Custom Confirmation Dialog
 * Supports both light and dark modes with CSS variables
 */
export const showConfirm = async (title = 'Are you sure?', text = "You won't be able to revert this!") => {
    const colors = getThemeColors();
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
    
    const result = await Swal.fire({
        title: title.toUpperCase(),
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: primaryColor || '#6366f1',
        cancelButtonColor: colors.isDark ? '#334155' : '#94a3b8',
        confirmButtonText: 'CONFIRM ACTION',
        cancelButtonText: 'CANCEL',
        background: colors.background,
        color: colors.color,
        customClass: {
            title: 'font-black italic tracking-tight text-sm',
            popup: cn(
                "rounded-[2rem] border shadow-2xl w-[90%] max-w-md",
                colors.popupClass
            ),
            confirmButton: cn(
                "px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest",
                "hover:opacity-90 transition-all"
            ),
            cancelButton: cn(
                "px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                colors.cancelButtonClass
            ),
        }
    });
    return result.isConfirmed;
}

// For dynamic theme updates
export const updateToastTheme = () => {
    const colors = getThemeColors();
    
    toast.update({
        background: colors.background,
        color: colors.color,
        customClass: {
            popup: cn(
                "rounded-2xl border shadow-xl",
                colors.popupClass
            ),
        }
    });
};

// Listen for theme changes
if (typeof window !== 'undefined') {
    window.addEventListener('theme-changed', () => {
        updateToastTheme();
    });
}