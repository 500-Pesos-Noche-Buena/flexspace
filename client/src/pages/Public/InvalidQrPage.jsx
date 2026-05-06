import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode, AlertTriangle, Home } from 'lucide-react';

const InvalidQrPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const error = searchParams.get('error');
    
    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <Card className="bg-[#111114] border-white/5 max-w-md w-full text-center p-8">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <QrCode className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-black text-white mb-2">Invalid QR Code</h2>
                <p className="text-slate-400 text-sm mb-2">
                    The QR code you scanned is invalid or has expired.
                </p>
                {error && (
                    <p className="text-xs text-red-400 mb-4 bg-red-500/10 p-2 rounded-lg">
                        Error: {error}
                    </p>
                )}
                <p className="text-slate-500 text-xs mb-6">
                    Please contact the space manager for assistance.
                </p>
                <div className="flex gap-3">
                    <Button onClick={() => navigate('/')} className="flex-1 bg-indigo-600 hover:bg-indigo-500">
                        <Home className="w-4 h-4 mr-2" />
                        Return Home
                    </Button>
                    <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
                        Try Again
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default InvalidQrPage;