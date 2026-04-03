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

// How to use and Import this SweetAlert2 toast in your components:
// import { showToast } from '@/components/ui/sweetalert2'

// showToast({ icon: 'success', title: 'Login successful' })
// showToast({ icon: 'error', title: 'Something went wrong' })
// showToast({ icon: 'warning', title: 'Invalid input' })
// showToast({ icon: 'info', title: 'Saved as draft' })