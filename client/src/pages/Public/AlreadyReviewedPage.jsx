import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Home } from 'lucide-react';

const AlreadyReviewedPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const bookingId = searchParams.get('booking_id');
    
    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <Card className="bg-[#111114] border-white/5 max-w-md w-full text-center p-8">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-xl font-black text-white mb-2">Already Reviewed</h2>
                <p className="text-slate-400 text-sm mb-6">
                    You've already submitted a review for this booking. Thank you for your feedback!
                </p>
                <div className="flex gap-3">
                    <Button onClick={() => navigate('/')} className="flex-1 bg-indigo-600 hover:bg-indigo-500">
                        <Home className="w-4 h-4 mr-2" />
                        Return Home
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default AlreadyReviewedPage;