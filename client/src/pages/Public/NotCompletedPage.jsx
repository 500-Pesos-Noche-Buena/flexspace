import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Calendar, Home } from 'lucide-react';

const NotCompletedPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const bookingId = searchParams.get('booking_id');
    const status = searchParams.get('status');
    
    const getStatusMessage = () => {
        switch(status) {
            case 'confirmed':
                return 'Your booking is confirmed but not yet completed.';
            case 'active':
                return 'You are currently checked in. Please complete your session first.';
            case 'cancelled':
                return 'This booking was cancelled.';
            case 'pending':
                return 'This booking is still pending confirmation.';
            default:
                return 'This booking has not been completed yet.';
        }
    };
    
    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <Card className="bg-[#111114] border-white/5 max-w-md w-full text-center p-8">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-black text-white mb-2">Booking Not Completed</h2>
                <p className="text-slate-400 text-sm mb-2">
                    {getStatusMessage()}
                </p>
                <p className="text-slate-500 text-xs mb-6">
                    You can only leave a review after your booking is completed.
                </p>
                {bookingId && (
                    <p className="text-[10px] text-slate-600 mb-4">
                        Booking ID: {bookingId}
                    </p>
                )}
                <div className="flex gap-3">
                    <Button onClick={() => navigate('/')} className="flex-1 bg-indigo-600 hover:bg-indigo-500">
                        <Home className="w-4 h-4 mr-2" />
                        Return Home
                    </Button>
                    {bookingId && (
                        <Button onClick={() => navigate(`/explore/${bookingId}`)} variant="outline" className="flex-1">
                            View Booking
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default NotCompletedPage;