import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { QRCodeSVG } from "qrcode.react";
import { Loader2, BadgeCheck, Banknote, QrCode, CreditCard, DoorOpen, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { showToast } from '@/components/ui/SweetAlert2';
import { apiPost } from '@/utils/Api';

export const BookingPaymentModal = ({ isOpen, onClose, booking, onPaymentComplete }) => {
    // ... payment logic from BookingsIndex
};