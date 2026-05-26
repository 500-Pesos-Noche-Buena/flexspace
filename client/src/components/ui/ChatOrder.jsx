import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Banknote, QrCode, X, CheckCircle, Loader2, Store, Clock } from 'lucide-react';
import { apiGet, apiPost } from '@/utils/Api';
import { showToast } from '@/components/ui/SweetAlert2';
import { useAuth } from '@/context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';

const ChatOrder = ({ onClose, onOrderComplete }) => {
    const { user, isAuthenticated } = useAuth();
    const [cart, setCart] = useState([]);
    const [products, setProducts] = useState([]);
    const [activeSpace, setActiveSpace] = useState(null);
    const [activeBooking, setActiveBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [paymentModal, setPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPaymentQR, setShowPaymentQR] = useState(false);
    const [paymentLink, setPaymentLink] = useState('');
    const [currentOrderNumber, setCurrentOrderNumber] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('pending');
    
    const pollingRef = useRef(null);
    const fetchedRef = useRef(false);

    if (!isAuthenticated) return null;

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        
        const fetchData = async () => {
            try {
                const bookingRes = await apiGet('/user/active-booking-fast');
                
                if (bookingRes.success && bookingRes.data?.space) {
                    setActiveBooking(bookingRes.data.booking);
                    setActiveSpace(bookingRes.data.space);
                    
                    const productsRes = await apiGet('/landing/products');
                    if (productsRes.success && productsRes.data) {
                        setProducts(productsRes.data);
                    }
                } else {
                    showToast({ 
                        icon: 'warning', 
                        title: 'No Active Session', 
                        text: 'You need an active booking to order food.' 
                    });
                    onClose();
                }
            } catch (err) {
                console.error('Fetch error:', err);
                showToast({ icon: 'error', title: 'Failed to load menu' });
                onClose();
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [onClose]);

    // Payment polling
    useEffect(() => {
        if (showPaymentQR && currentOrderNumber && paymentMethod === 'online') {
            const checkStatus = async () => {
                try {
                    const res = await apiGet(`/landing/payment/status/${currentOrderNumber}`);
                    if (res.success && (res.data.is_paid || res.data.status === 'confirmed')) {
                        clearInterval(pollingRef.current);
                        setPaymentStatus('paid');
                        setTimeout(() => {
                            setShowPaymentQR(false);
                            onOrderComplete?.();
                            onClose();
                            showToast({ icon: 'success', title: 'Payment confirmed!' });
                        }, 2000);
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                }
            };
            
            pollingRef.current = setInterval(checkStatus, 3000);
            return () => {
                if (pollingRef.current) clearInterval(pollingRef.current);
            };
        }
    }, [showPaymentQR, currentOrderNumber, paymentMethod]);

    const addToCart = (product) => {
        if (!activeSpace) {
            showToast({ icon: 'warning', title: 'No active booking found' });
            return;
        }
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

    const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const calculateTax = () => calculateSubtotal() * 0.12;
    const calculateTotal = () => calculateSubtotal() + calculateTax();

    const handleCheckout = () => {
        console.log('Checkout clicked - activeSpace:', activeSpace, 'cart length:', cart.length);
        
        if (!activeSpace) {
            showToast({ icon: 'warning', title: 'No Active Session', text: 'You need an active booking to order food.' });
            return;
        }
        if (cart.length === 0) {
            showToast({ icon: 'warning', title: 'Cart is empty', text: 'Please add items to your cart first.' });
            return;
        }
        console.log('Opening payment modal');
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
                customer_name: user?.name || 'Customer',
                space_id: activeSpace._id,
                booking_id: activeBooking?._id
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
                        window.open(paymentRes.data.checkout_url, '_blank');
                    } else {
                        showToast({ icon: 'error', title: paymentRes.message || 'Failed to create payment link' });
                    }
                } else {
                    showToast({ icon: 'success', title: 'Order placed successfully! Your order is being prepared.' });
                    onOrderComplete?.();
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

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-10000 p-4">
                <div className="bg-[#0f0f12] rounded-2xl border border-white/10 p-8 text-center">
                    <Loader2 size={40} className="animate-spin text-indigo-500 mx-auto mb-4" />
                    <p className="text-white text-sm">Loading your active booking...</p>
                </div>
            </div>
        );
    }

    if (!activeSpace) {
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-10000 p-4">
                <div className="bg-[#0f0f12] rounded-2xl border border-white/10 p-6 text-center max-w-sm">
                    <Store size={48} className="mx-auto text-slate-500 mb-4" />
                    <h3 className="text-white font-black text-lg mb-2">No Active Session</h3>
                    <p className="text-slate-400 text-sm mb-4">
                        You need an active booking to order food. Please book a space first.
                    </p>
                    <button onClick={onClose} className="px-4 py-2 bg-indigo-600 rounded-xl text-white text-sm font-bold">
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Order Modal */}
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-10000 p-2 sm:p-4" style={{ zIndex: 10001 }}>
                <div className="bg-[#0f0f12] rounded-2xl border border-white/10 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-3 sm:p-4 border-b border-white/10 flex justify-between items-center bg-linear-to-r from-indigo-600/10 to-purple-600/10">
                        <div>
                            <h2 className="text-white font-black text-base sm:text-lg">🍔 Order Food & Drinks</h2>
                            <p className="text-slate-400 text-[10px] sm:text-xs">
                                Ordering from: <span className="text-indigo-400 font-bold">{activeSpace?.name}</span>
                            </p>
                            {activeBooking && (
                                <p className="text-[8px] text-emerald-400 flex items-center gap-1 mt-0.5">
                                    <Clock size={10} /> Active Session: #{activeBooking.ticket_number}
                                </p>
                            )}
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <X size={18} sm:size={20} />
                        </button>
                    </div>

                    {/* Main Content */}
                    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                        {/* Products Panel */}
                        <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 sm:px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none text-sm mb-3"
                            />

                            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto mb-3 sm:mb-4 pb-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                {filteredProducts.slice(0, 50).map(product => (
                                    <button
                                        key={product._id}
                                        onClick={() => addToCart(product)}
                                        disabled={product.stock === 0}
                                        className="bg-white/5 hover:bg-white/10 rounded-xl p-2 sm:p-3 text-left transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        <p className="text-white font-bold text-xs sm:text-sm line-clamp-2">{product.name}</p>
                                        <p className="text-indigo-400 font-bold text-[10px] sm:text-xs mt-1">₱{product.price}</p>
                                        <p className="text-[8px] text-slate-500 mt-0.5">Stock: {product.stock}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cart Panel */}
                        <div className="w-full md:w-80 bg-[#1a1a24] border-t md:border-t-0 md:border-l border-white/10 flex flex-col max-h-[40vh] md:max-h-none">
                            <div className="p-3 sm:p-4 border-b border-white/10">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart size={16} sm:size={18} className="text-indigo-400" />
                                        <h3 className="text-white font-black text-xs sm:text-sm">Your Order</h3>
                                        <span className="bg-indigo-500/20 text-indigo-400 text-[8px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full">
                                            {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                                        </span>
                                    </div>
                                    {cart.length > 0 && (
                                        <button onClick={() => setCart([])} className="text-red-400 text-[10px] sm:text-xs hover:text-red-300">Clear</button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
                                {cart.length === 0 ? (
                                    <div className="text-center py-8 sm:py-12">
                                        <ShoppingCart size={32} sm:size={40} className="mx-auto text-slate-600 mb-2" />
                                        <p className="text-slate-500 text-[10px] sm:text-xs">Cart is empty</p>
                                        <p className="text-slate-600 text-[8px] sm:text-[10px] mt-1">Add items from the menu</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.id} className="bg-white/5 rounded-xl p-2">
                                            <div className="flex justify-between">
                                                <p className="text-white font-bold text-[10px] sm:text-xs line-clamp-1">{item.name}</p>
                                                <button onClick={() => removeItem(item.id)} className="text-red-400"><Trash2 size={10} sm:size={12} /></button>
                                            </div>
                                            <p className="text-indigo-400 text-[8px] sm:text-[10px]">₱{item.price} each</p>
                                            <div className="flex justify-between items-center mt-1 sm:mt-2">
                                                <div className="flex gap-1.5 sm:gap-2">
                                                    <button onClick={() => updateQuantity(item.id, -1)} className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"><Minus size={8} sm:size={10} /></button>
                                                    <span className="text-white text-[10px] sm:text-xs w-5 sm:w-6 text-center">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.id, 1)} className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"><Plus size={8} sm:size={10} /></button>
                                                </div>
                                                <p className="text-white font-bold text-[10px] sm:text-xs">₱{(item.price * item.quantity).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="p-2 sm:p-3 border-t border-white/10">
                                    <div className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs">
                                        <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span className="text-white">₱{calculateSubtotal().toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-400">Tax (12%)</span><span className="text-white">₱{calculateTax().toFixed(2)}</span></div>
                                        <div className="flex justify-between text-sm font-bold pt-1 border-t border-white/10">
                                            <span className="text-white">Total</span><span className="text-indigo-400">₱{calculateTotal().toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <button onClick={handleCheckout} className="w-full mt-2 sm:mt-3 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold text-[10px] sm:text-xs">
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
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-10002 p-3 sm:p-4">
                    <div className="bg-[#0f0f12] rounded-2xl border border-white/10 w-full max-w-md p-4 sm:p-6">
                        <h3 className="text-white font-black text-base sm:text-lg mb-3 sm:mb-4">Select Payment Method</h3>

                        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${paymentMethod === 'cash' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                            >
                                <Banknote size={14} sm:size={16} /> Cash on Pickup
                            </button>
                            <button
                                onClick={() => setPaymentMethod('online')}
                                className={`w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${paymentMethod === 'online' ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                            >
                                <QrCode size={14} sm:size={16} /> Online Payment (GCash/PayMaya)
                            </button>
                        </div>

                        <div className="bg-indigo-500/10 rounded-xl p-2.5 sm:p-3 text-center mb-3 sm:mb-4">
                            <p className="text-[8px] sm:text-[10px] text-indigo-400 font-black uppercase">Total Amount</p>
                            <p className="text-lg sm:text-xl font-black text-white">₱{calculateTotal().toFixed(2)}</p>
                        </div>

                        <div className="flex gap-2 sm:gap-3">
                            <button onClick={() => setPaymentModal(false)} className="flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-slate-400 hover:text-white">
                                Cancel
                            </button>
                            <button onClick={processOrder} disabled={isProcessing} className="flex-1 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold text-xs sm:text-sm">
                                {isProcessing ? <Loader2 size={14} sm:size={16} className="animate-spin mx-auto" /> : 'Place Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment QR Modal */}
            {showPaymentQR && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-10003 p-3 sm:p-4">
                    <div className="bg-[#0f0f12] rounded-2xl border border-white/10 w-full max-w-md p-4 sm:p-6 text-center">
                        {paymentStatus === 'pending' ? (
                            <>
                                <div className="bg-white p-3 sm:p-4 rounded-2xl inline-block mb-3 sm:mb-4">
                                    <QRCodeSVG value={paymentLink} size={140} sm:size={180} level="H" includeMargin={true} />
                                </div>
                                <p className="text-white font-bold text-xs sm:text-sm">Scan to Pay</p>
                                <p className="text-slate-400 text-[10px] sm:text-xs mb-2 sm:mb-3">Amount: ₱{calculateTotal().toFixed(2)}</p>
                                <p className="text-emerald-400 text-[10px] sm:text-xs mb-3 sm:mb-4">Order #{currentOrderNumber}</p>
                                
                                <div className="bg-amber-500/10 rounded-xl p-2 sm:p-3 mb-3 sm:mb-4 flex items-center justify-center gap-2">
                                    <Loader2 size={12} sm:size={14} className="animate-spin text-amber-400" />
                                    <p className="text-[8px] sm:text-[10px] text-amber-400 font-black uppercase">Waiting for payment...</p>
                                </div>

                                <div className="flex gap-2 sm:gap-3">
                                    <button onClick={() => { navigator.clipboard.writeText(paymentLink); showToast({ icon: 'success', title: 'Link copied!' }); }} className="flex-1 py-1.5 sm:py-2 bg-indigo-600/20 text-indigo-400 rounded-xl text-[9px] sm:text-xs font-bold">Copy Link</button>
                                    <button onClick={() => window.open(paymentLink, '_blank')} className="flex-1 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-white text-[9px] sm:text-xs font-bold">Open Link</button>
                                </div>
                            </>
                        ) : paymentStatus === 'paid' ? (
                            <div className="py-6 sm:py-8">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                                    <CheckCircle size={24} sm:size={32} className="text-emerald-400" />
                                </div>
                                <h3 className="text-white font-black text-base sm:text-lg mb-1 sm:mb-2">Payment Confirmed!</h3>
                                <p className="text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4">₱{calculateTotal().toFixed(2)} confirmed.</p>
                                <p className="text-emerald-400 text-[10px] sm:text-sm">Your order is now being prepared.</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatOrder;