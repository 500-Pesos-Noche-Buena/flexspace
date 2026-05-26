import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle, Home, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaymentFailed = () => {
    return (
        <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#111114] rounded-3xl border border-white/10 p-8 text-center">
                <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                    <XCircle size={40} className="text-red-500" />
                </div>
                
                <h1 className="text-2xl font-black text-white mb-2">Payment Failed</h1>
                <p className="text-slate-400 mb-6">
                    Your payment could not be processed. Please try again.
                </p>
                
                <div className="flex gap-3">
                    <Link to="/" className="flex-1">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-500">
                            <Home size={16} className="mr-2" />
                            Return to Home
                        </Button>
                    </Link>
                    <Link to="/explore" className="flex-1">
                        <Button className="w-full bg-white/5 hover:bg-white/10 text-white">
                            <ShoppingBag size={16} className="mr-2" />
                            Browse Spaces
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PaymentFailed;