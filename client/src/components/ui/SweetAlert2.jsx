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

export const showToast = ({ icon = 'success', title = '', text = '', message = '' }) => {
    // Use text or message parameter
    const messageText = text || message || '';
    
    toast.fire({ 
        icon, 
        title,
        text: messageText
    })
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
        confirmButtonColor: '#6366f1',
        cancelButtonColor: '#1e293b',
        confirmButtonText: 'CONFIRM ACTION',
        cancelButtonText: 'CANCEL',
        background: '#111114',
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
// showToast({ icon: 'error', title: 'Email Already Exists', text: 'This email is already registered.' })
// showToast({ icon: 'success', title: 'Success!', text: 'Registration successful!' })