import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, X, CheckCircle, Loader2 } from 'lucide-react';
import { apiGet, apiPost } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';
import { useAuth } from '@/context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';

const ChatOrder = ({ onClose, onOrderComplete }) => {
    const { user } = useAuth();
    const [cart, setCart] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [paymentModal, setPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPaymentQR, setShowPaymentQR] = useState(false);
    const [paymentLink, setPaymentLink] = useState('');
    const [currentOrderNumber, setCurrentOrderNumber] = useState('');
    
    // Real-time payment status
    const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, paid, failed
    const [isPolling, setIsPolling] = useState(false);
    const pollingIntervalRef = useRef(null);
    const lastStatusFingerprint = useRef("");

    useEffect(() => {
        fetchProducts();
    }, []);

    // Real-time polling for payment status
    const checkPaymentStatus = useCallback(async () => {
        if (!currentOrderNumber) return;
        
        try {
            const res = await apiGet(`/landing/payment/status/${currentOrderNumber}`);
            if (res.success) {
                const newStatus = res.data.is_paid ? 'paid' : (res.data.status === 'confirmed' ? 'paid' : 'pending');
                const fingerprint = `${newStatus}-${res.data.status}`;
                
                if (fingerprint !== lastStatusFingerprint.current) {
                    lastStatusFingerprint.current = fingerprint;
                    
                    if (newStatus === 'paid') {
                        setPaymentStatus('paid');
                        // Stop polling
                        if (pollingIntervalRef.current) {
                            clearInterval(pollingIntervalRef.current);
                            pollingIntervalRef.current = null;
                        }
                        setIsPolling(false);
                        
                        // Auto close after showing success
                        setTimeout(() => {
                            setShowPaymentQR(false);
                            onOrderComplete && onOrderComplete();
                            onClose();
                            showToast({ icon: 'success', title: 'Payment confirmed!', text: 'Your order is now being prepared.' });
                        }, 2000);
                    } else if (res.data.status === 'failed') {
                        setPaymentStatus('failed');
                        if (pollingIntervalRef.current) {
                            clearInterval(pollingIntervalRef.current);
                            pollingIntervalRef.current = null;
                        }
                        setIsPolling(false);
                        showToast({ icon: 'error', title: 'Payment failed', text: 'Please try again.' });
                    }
                }
            }
        } catch (err) {
            console.error('Payment status check error:', err);
        }
    }, [currentOrderNumber, onOrderComplete, onClose]);

    // Start polling when QR modal opens
    useEffect(() => {
        if (showPaymentQR && currentOrderNumber && paymentMethod === 'online') {
            setIsPolling(true);
            setPaymentStatus('pending');
            lastStatusFingerprint.current = '';
            
            // Check every 3 seconds (like Bookings page)
            pollingIntervalRef.current = setInterval(checkPaymentStatus, 3000);
            
            return () => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
                setIsPolling(false);
            };
        }
    }, [showPaymentQR, currentOrderNumber, paymentMethod, checkPaymentStatus]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await apiGet('/landing/products');
            if (res.success && res.data) {
                setProducts(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product) => {
        if (product.stock === 0) {
            showToast({ icon: 'warning', title: `${product.name} is out of stock` });
            return;
        }

        const existing = cart.find(item => item.id === product._id);
        if (existing) {
            if (existing.quantity >= product.stock) {
                showToast({ icon: 'warning', title: `Only ${product.stock} left in stock` });
                return;
            }
            setCart(cart.map(item =>
                item.id === product._id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                id: product._id,
                name: product.name,
                price: product.price,
                quantity: 1,
                stock: product.stock
            }]);
        }
        showToast({ icon: 'success', title: `Added ${product.name}` });
    };

    const updateQuantity = (id, delta) => {
        const item = cart.find(i => i.id === id);
        const product = products.find(p => p._id === id);

        if (delta > 0 && item.quantity >= (product?.stock || 999)) {
            showToast({ icon: 'warning', title: `Only ${product?.stock} left in stock` });
            return;
        }

        if (item.quantity + delta <= 0) {
            setCart(cart.filter(i => i.id !== id));
        } else {
            setCart(cart.map(i =>
                i.id === id ? { ...i, quantity: i.quantity + delta } : i
            ));
        }
    };

    const removeItem = (id) => {
        setCart(cart.filter(i => i.id !== id));
    };

    const calculateSubtotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const calculateTax = () => {
        return calculateSubtotal() * 0.12;
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTax();
    };

    const handleCheckout = () => {
        if (cart.length === 0) {
            showToast({ icon: 'warning', title: 'Cart is empty' });
            return;
        }
        setPaymentModal(true);
    };

    const processOrder = async () => {
        setIsProcessing(true);
        try {
            const orderData = {
                items: cart.map(item => ({
                    product_id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                })),
                payment_method: paymentMethod,
                special_instructions: null,
                customer_name: user?.name || 'Customer'
            };

            const res = await apiPost('/user/orders', orderData);

            if (res.success) {
                if (paymentMethod === 'online') {
                    const paymentRes = await apiPost('/landing/payment/create-link', {
                        amount: calculateTotal(),
                        order_number: res.data.order_number,
                        customer_name: user?.name || 'Customer',
                        payment_method: 'gcash'
                    });

                    if (paymentRes.success && paymentRes.data.checkout_url) {
                        setCurrentOrderNumber(res.data.order_number);
                        setPaymentLink(paymentRes.data.checkout_url);
                        setShowPaymentQR(true);
                        setPaymentModal(false);
                        // Open payment link in new tab
                        window.open(paymentRes.data.checkout_url, '_blank');
                    } else {
                        showToast({ icon: 'error', title: paymentRes.message || 'Failed to create payment link' });
                    }
                } else {
                    showToast({ icon: 'success', title: 'Order placed successfully! Your order is being prepared.' });
                    onOrderComplete && onOrderComplete();
                    onClose();
                }
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Order failed' });
        } finally {
            setIsProcessing(false);
        }
    };

    const categories = [
        { id: 'all', name: 'All' },
        { id: 'food', name: 'Food' },
        { id: 'beverage', name: 'Drinks' },
        { id: 'snacks', name: 'Snacks' },
        { id: 'merch', name: 'Merch' },
    ];

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
        return matchesSearch && matchesCategory && product.is_available !== false;
    });

    return (
        <>
            {/* Order Modal */}
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-10000 p-4" style={{ zIndex: 10001 }}>
                <div className="bg-[#0f0f12] rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-linear-to-r from-indigo-600/10 to-purple-600/10">
                        <div>
                            <h2 className="text-white font-black text-lg">🍔 Order Food & Drinks</h2>
                            <p className="text-slate-400 text-xs">Ordering as: <span className="text-indigo-400">{user?.name || 'Guest'}</span></p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                        {/* Products Panel */}
                        <div className="flex-1 p-4 overflow-y-auto">
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Search items..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none text-sm"
                                />
                            </div>

                            <div className="flex gap-2 overflow-x-auto mb-4 pb-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat.id
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                            }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredProducts.map(product => (
                                        <button
                                            key={product._id}
                                            onClick={() => addToCart(product)}
                                            disabled={product.stock === 0}
                                            className="bg-white/5 hover:bg-white/10 rounded-xl p-3 text-left transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                        >
                                            <p className="text-white font-bold text-sm">{product.name}</p>
                                            <p className="text-indigo-400 font-bold text-xs mt-1">₱{product.price}</p>
                                            <p className="text-[10px] text-slate-500 mt-1">Stock: {product.stock}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Cart Panel */}
                        <div className="w-80 bg-[#1a1a24] border-l border-white/10 flex flex-col">
                            <div className="p-4 border-b border-white/10">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart size={18} className="text-indigo-400" />
                                        <h3 className="text-white font-black text-sm">Your Order</h3>
                                        <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full">
                                            {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                                        </span>
                                    </div>
                                    {cart.length > 0 && (
                                        <button onClick={() => setCart([])} className="text-red-400 text-xs hover:text-red-300">
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {cart.length === 0 ? (
                                    <div className="text-center py-12">
                                        <ShoppingCart size={40} className="mx-auto text-slate-600 mb-2" />
                                        <p className="text-slate-500 text-xs">Cart is empty</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.id} className="bg-white/5 rounded-xl p-2">
                                            <div className="flex justify-between">
                                                <p className="text-white font-bold text-xs">{item.name}</p>
                                                <button onClick={() => removeItem(item.id)} className="text-red-400">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                            <p className="text-indigo-400 text-[10px]">₱{item.price} each</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex gap-2">
                                                    <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center">
                                                        <Minus size={10} />
                                                    </button>
                                                    <span className="text-white text-xs w-6 text-center">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center">
                                                        <Plus size={10} />
                                                    </button>
                                                </div>
                                                <p className="text-white font-bold text-xs">₱{(item.price * item.quantity).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="p-3 border-t border-white/10">
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Subtotal</span>
                                            <span className="text-white">₱{calculateSubtotal().toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Tax (12%)</span>
                                            <span className="text-white">₱{calculateTax().toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-bold pt-1 border-t border-white/10">
                                            <span className="text-white">Total</span>
                                            <span className="text-indigo-400">₱{calculateTotal().toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCheckout}
                                        className="w-full mt-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold text-xs"
                                    >
                                        Checkout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Method Modal */}
            {paymentModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-10002 p-4" style={{ zIndex: 10002 }}>
                    <div className="bg-[#0f0f12] rounded-2xl border border-white/10 w-full max-w-md p-6">
                        <h3 className="text-white font-black text-lg mb-4">Select Payment Method</h3>

                        <div className="space-y-3 mb-6">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${paymentMethod === 'cash' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                    }`}
                            >
                                <Banknote size={16} /> Cash on Pickup
                            </button>
                            <button
                                onClick={() => setPaymentMethod('online')}
                                className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${paymentMethod === 'online' ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                    }`}
                            >
                                <QrCode size={16} /> Online Payment (GCash/PayMaya)
                            </button>
                        </div>

                        <div className="bg-indigo-500/10 rounded-xl p-3 text-center mb-4">
                            <p className="text-[10px] text-indigo-400 font-black uppercase">Total Amount</p>
                            <p className="text-xl font-black text-white">₱{calculateTotal().toFixed(2)}</p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setPaymentModal(false)} className="flex-1 py-2 text-sm font-bold text-slate-400 hover:text-white">
                                Cancel
                            </button>
                            <button onClick={processOrder} disabled={isProcessing} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold text-sm">
                                {isProcessing ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Place Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment QR Modal with Real-time Status */}
            {showPaymentQR && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-10003 p-4" style={{ zIndex: 10003 }}>
                    <div className="bg-[#0f0f12] rounded-2xl border border-white/10 w-full max-w-md p-6 text-center">
                        {paymentStatus === 'pending' ? (
                            <>
                                <div className="bg-white p-4 rounded-2xl inline-block mb-4">
                                    <QRCodeSVG value={paymentLink} size={180} level="H" includeMargin={true} />
                                </div>
                                <p className="text-white font-bold text-sm">Scan to Pay</p>
                                <p className="text-slate-400 text-xs mb-3">Amount: ₱{calculateTotal().toFixed(2)}</p>
                                <p className="text-emerald-400 text-xs mb-4">Order #{currentOrderNumber}</p>
                                
                                {/* Real-time status indicator */}
                                <div className="bg-amber-500/10 rounded-xl p-3 mb-4 flex items-center justify-center gap-2">
                                    <Loader2 size={14} className="animate-spin text-amber-400" />
                                    <p className="text-[10px] text-amber-400 font-black uppercase">Waiting for payment confirmation...</p>
                                </div>

                                <div className="flex gap-3 mb-3">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(paymentLink);
                                            showToast({ icon: 'success', title: 'Link copied!' });
                                        }}
                                        className="flex-1 py-2 bg-indigo-600/20 text-indigo-400 rounded-xl text-xs font-bold"
                                    >
                                        Copy Link
                                    </button>
                                    <button
                                        onClick={() => {
                                            window.open(paymentLink, '_blank');
                                        }}
                                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-white text-xs font-bold"
                                    >
                                        Open Link
                                    </button>
                                </div>
                            </>
                        ) : paymentStatus === 'paid' ? (
                            <div className="py-8">
                                <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle size={32} className="text-emerald-400" />
                                </div>
                                <h3 className="text-white font-black text-lg mb-2">Payment Confirmed!</h3>
                                <p className="text-slate-400 text-sm mb-4">
                                    Payment of ₱{calculateTotal().toFixed(2)} has been confirmed.
                                </p>
                                <p className="text-emerald-400 text-sm">Your order is now being prepared.</p>
                            </div>
                        ) : paymentStatus === 'failed' ? (
                            <div className="py-8">
                                <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                                    <XCircle size={32} className="text-red-400" />
                                </div>
                                <h3 className="text-white font-black text-lg mb-2">Payment Failed</h3>
                                <p className="text-slate-400 text-sm mb-4">
                                    Payment could not be processed.
                                </p>
                                <button
                                    onClick={() => {
                                        setShowPaymentQR(false);
                                        setPaymentStatus('pending');
                                    }}
                                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-bold text-sm"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatOrder;