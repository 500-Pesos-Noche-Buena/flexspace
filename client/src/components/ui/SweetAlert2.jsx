import Swal from 'sweetalert2'

export const toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    iconColor: '#fff',
    customClass: {
        popup: 'colored-toast',
    },
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer
        toast.onmouseleave = Swal.resumeTimer
    },
})

export const showToast = ({ icon = 'success', title = '' }) => {
    toast.fire({ icon, title })
}

/**
 * Custom Confirmation Dialog
 * Matches the Dark/High-Contrast UI
 */
export const showConfirm = async (title = 'Are you sure?', text = "You won't be able to revert this!") => {
    const result = await Swal.fire({
        title: title.toUpperCase(),
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#6366f1', // Indigo-600 (Primary)
        cancelButtonColor: '#1e293b',  // Slate-800 (Secondary)
        confirmButtonText: 'CONFIRM ACTION',
        cancelButtonText: 'CANCEL',
        background: '#111114',        // Deep Charcoal
        color: '#ffffff',
        customClass: {
            title: 'font-black italic tracking-tight',
            popup: 'rounded-[2.5rem] border border-white/5 shadow-2xl',
            confirmButton: 'px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest',
            cancelButton: 'px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest',
        }
    });
    return result.isConfirmed;
}

// How to use:
// import { showToast, showConfirm } from '@/components/ui/sweetalert2'
// 
// const handleDelete = async () => {
//    const confirmed = await showConfirm("Delete Space?", "This will remove the listing forever.");
//    if (confirmed) { ... }
// }