import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/utils/Api';
import { QRCodeSVG } from 'qrcode.react';
import {
    ShoppingCart, Plus, Minus, Trash2, CreditCard,
    Banknote, QrCode, Search, Package, Coffee,
    Sandwich, Cookie, Users, Loader2, Percent, History, X, CheckCircle,
    ExternalLink, Copy, Download, User, Smartphone, Receipt
} from 'lucide-react';
import { showToast } from '@/components/ui/SweetAlert2';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import PaymentQRModal from '@/components/PaymentQRModal';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return 'Invalid Date';
    }
};

const POS = () => {
    const [cart, setCart] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [paymentModal, setPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [amountReceived, setAmountReceived] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState('percentage');
    const [discountValue, setDiscountValue] = useState('');
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [recentOrders, setRecentOrders] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // QR and Payment states
    const [qrPaymentImage, setQrPaymentImage] = useState(null);
    const [paymentLink, setPaymentLink] = useState('');
    const [showPaymentLink, setShowPaymentLink] = useState(false);
    const [copied, setCopied] = useState(false);

    const [hasPayMongoKey, setHasPayMongoKey] = useState(false);

    const [generatedPaymentLink, setGeneratedPaymentLink] = useState('');
    const [showPaymentQR, setShowPaymentQR] = useState(false);
    const [currentOrderId, setCurrentOrderId] = useState('');

    const [paymentCompleted, setPaymentCompleted] = useState(false);
    const [pollingInterval, setPollingInterval] = useState(null);


    const checkPaymentStatus = async () => {
        if (!currentOrderId) return;

        try {
            // Fetch all orders to find the current one
            const res = await apiGet('/space/orders');
            if (res.success) {
                const order = res.data.find(o => o.order_number === currentOrderId);
                // Check if payment is confirmed (status = 'confirmed' or payment_status = 'paid')
                if (order && (order.status === 'confirmed' || order.payment_status === 'paid')) {
                    // Payment confirmed!
                    setPaymentCompleted(true);

                    // Stop polling
                    if (pollingInterval) {
                        clearInterval(pollingInterval);
                        setPollingInterval(null);
                    }

                    // Close QR modal and show success
                    setTimeout(() => {
                        setShowPaymentQR(false);
                        showToast({ icon: 'success', title: 'Payment confirmed!', text: `Order ${currentOrderId} is now being prepared` });
                        resetOrder();
                        fetchRecentOrders();
                    }, 2000);
                }
            }
        } catch (err) {
            console.error('Failed to check payment status:', err);
        }
    };


    // Start polling when QR modal opens
    useEffect(() => {
        if (showPaymentQR && currentOrderId) {
            // Check every 3 seconds
            const interval = setInterval(checkPaymentStatus, 3000);
            setPollingInterval(interval);

            return () => {
                if (interval) clearInterval(interval);
            };
        }
    }, [showPaymentQR, currentOrderId]);



    const checkPayMongoStatus = async () => {
        try {
            const res = await apiGet('/space/payment/key-status');
            if (res.success) {
                setHasPayMongoKey(res.data.has_paymongo_key);
            }
        } catch (err) {
            console.error('Failed to check PayMongo status:', err);
        }
    };

    const fetchPaymentQR = async () => {
        try {
            const res = await apiGet('/space/owner/payment-qr');
            console.log('Payment QR Response:', res);
            if (res.success && res.data?.business_payment_qr) {
                setQrPaymentImage(res.data.business_payment_qr);
            } else {
                console.log('No QR code found in response:', res.data);
            }
        } catch (err) {
            console.error('Failed to fetch payment QR:', err);
        }
    };


    useEffect(() => {
        fetchProducts();
        fetchRecentOrders();
        fetchSpaceOwner();
        fetchPaymentQR();
        checkPayMongoStatus();
    }, []);

    const fetchSpaceOwner = async () => {
        try {
            const res = await apiGet('/space/owner');
            if (res.success && res.data) {
                if (res.data.business_payment_qr) {
                    setQrPaymentImage(res.data.business_payment_qr);
                }
            }
        } catch (err) {
            console.error('Failed to fetch space owner:', err);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiGet('/space/products');
            if (res.success && res.data) {
                setProducts(res.data);
                if (res.data.length === 0) {
                    setError('No products found. Please add products in Inventory first.');
                }
            } else {
                setError('Failed to load products');
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
            setError(err.message || 'Connection error. Make sure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentOrders = async () => {
        try {
            const res = await apiGet('/space/orders/recent');
            if (res.success && res.data) {
                setRecentOrders(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch recent orders:', err);
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

    const calculateDiscountAmount = () => {
        if (discountType === 'percentage') {
            return calculateSubtotal() * (discount / 100);
        }
        return discount;
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTax() - calculateDiscountAmount();
    };

    const applyDiscount = () => {
        const value = parseFloat(discountValue);
        if (isNaN(value) || value <= 0) {
            showToast({ icon: 'warning', title: 'Enter valid discount' });
            return;
        }
        if (discountType === 'percentage' && value > 100) {
            showToast({ icon: 'warning', title: 'Percentage cannot exceed 100%' });
            return;
        }
        setDiscount(value);
        setShowDiscountModal(false);
        setDiscountValue('');
        showToast({ icon: 'success', title: `Discount applied: ${value}${discountType === 'percentage' ? '%' : '₱'}` });
    };

    const handleCheckout = () => {
        if (cart.length === 0) {
            showToast({ icon: 'warning', title: 'Cart is empty' });
            return;
        }
        setPaymentModal(true);
        setShowPaymentLink(false);
        setPaymentLink('');
    };

    const generatePaymentLink = async () => {
        if (cart.length === 0) {
            showToast({ icon: 'warning', title: 'Cart is empty' });
            return;
        }

        setIsProcessing(true);
        try {
            const orderNumber = `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // Create order with pending status
            const orderData = {
                items: cart.map(item => ({
                    product_id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                })),
                subtotal: calculateSubtotal(),
                tax: calculateTax(),
                discount_type: discountType,
                discount_value: discount,
                discount_amount: calculateDiscountAmount(),
                total: calculateTotal(),
                payment_method: 'online',
                amount_received: calculateTotal(),
                customer_name: customerName || 'Walk-in Customer',
                status: 'pending_payment',
                payment_status: 'unpaid'
            };

            const orderRes = await apiPost('/space/orders', orderData);

            if (orderRes.success) {
                setCurrentOrderId(orderRes.data.order_number);

                // Create payment link via PayBridge
                const paymentRes = await apiPost('/space/payment/create-link', {
                    amount: calculateTotal(),
                    order_number: orderRes.data.order_number,
                    customer_name: customerName || 'Walk-in Customer',
                    payment_method: 'gcash'
                });

                if (paymentRes.success && paymentRes.data.checkout_url) {
                    setGeneratedPaymentLink(paymentRes.data.checkout_url);
                    setShowPaymentQR(true);
                    setPaymentModal(false);

                    showToast({
                        icon: 'info',
                        title: 'Payment QR Generated',
                        text: 'Customer can scan QR code to pay'
                    });
                }
            }
        } catch (err) {
            console.error('Payment link error:', err);
            showToast({
                icon: 'error',
                title: 'Payment Failed',
                text: err.message || 'Failed to create payment link'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Download QR code
    const downloadQRCode = () => {
        const canvas = document.getElementById('payment-qr-canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `payment-qr-${currentOrderId}.png`;
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    // Copy payment link
    const copyPaymentLink = () => {
        navigator.clipboard.writeText(generatedPaymentLink);
        showToast({ icon: 'success', title: 'Payment link copied!' });
    };

    const processPayment = async () => {
        // Cash payment
        if (paymentMethod === 'cash') {
            if (!amountReceived || parseFloat(amountReceived) < calculateTotal()) {
                showToast({ icon: 'warning', title: 'Insufficient amount' });
                return;
            }
            await completeOrder('cash', parseFloat(amountReceived));
            return;
        }

        // QR Payment (GCash) - uses space owner's QR code
        if (paymentMethod === 'qr') {
            await completeOrder('qr', calculateTotal());
            return;
        }

        // Online Payment (PayMongo via PayBridge)
        if (paymentMethod === 'online') {
            await generatePaymentLink();
            return;
        }
    };

   const completeOrder = async (method, amount, status = 'completed') => {
    setIsProcessing(true);
    try {
        const orderData = {
            items: cart.map(item => ({
                product_id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price
            })),
            subtotal: calculateSubtotal(),
            tax: calculateTax(),
            discount_type: discountType,
            discount_value: discount,
            discount_amount: calculateDiscountAmount(),
            total: calculateTotal(),
            payment_method: method,
            amount_received: amount,
            customer_name: customerName || 'Walk-in Customer',
            status: status,
            order_type: 'pos'
        };

        const res = await apiPost('/space/orders', orderData);

        if (res.success) {
            // Get the order number from the response
            const orderNumber = res.data.order_number;
            const orderId = res.data._id;
            
            // Pass the COMPLETE order data to printReceipt
            const orderForReceipt = {
                ...orderData,
                order_number: orderNumber,
                _id: orderId
            };
            
            if (status === 'completed') {
                showToast({ icon: 'success', title: 'Payment successful!' });
                printReceipt(orderForReceipt);
                resetOrder();
                fetchRecentOrders(); // Refresh the orders list
            }
            return res.data;
        }
    } catch (err) {
        showToast({ icon: 'error', title: err.message || 'Payment failed' });
        throw err;
    } finally {
        setIsProcessing(false);
    }
};

    const resetOrder = () => {
        setCart([]);
        setCustomerName('');
        setDiscount(0);
        setPaymentModal(false);
        setAmountReceived('');
        setShowPaymentLink(false);
        setPaymentLink('');
        setShowPaymentQR(false);
        setGeneratedPaymentLink('');
        setCurrentOrderId('');
        fetchRecentOrders();
        fetchProducts();
    };

    const getFullImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${path}`;
    };

  const printReceipt = (order) => {
    const receiptWindow = window.open('', '_blank');
    
    // Calculate change only for cash payments
    const isCash = order.payment_method === 'cash';
    const changeAmount = isCash && order.amount_received ? (order.amount_received - order.total).toFixed(2) : '0.00';
    const amountReceived = order.amount_received ? order.amount_received.toFixed(2) : order.total.toFixed(2);
    
    // Payment method display name
    const paymentMethodDisplay = {
        cash: 'CASH',
        qr: 'GCASH / QR',
        online: 'ONLINE PAYMENT',
        card: 'CARD'
    }[order.payment_method] || order.payment_method.toUpperCase();
    
    // Get order number or generate a temporary one
    const orderNumber = order.order_number || `TEMP-${Date.now()}`;
    
    receiptWindow.document.write(`
        <html>
        <head>
            <title>Receipt</title>
            <style>
                body { 
                    font-family: 'Courier New', monospace; 
                    padding: 20px; 
                    width: 300px; 
                    margin: 0 auto;
                    background: white;
                }
                .header { 
                    text-align: center; 
                    border-bottom: 1px dashed #000; 
                    padding-bottom: 10px; 
                    margin-bottom: 10px;
                }
                .logo {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .items { 
                    width: 100%; 
                    margin-bottom: 10px;
                }
                .items th, .items td { 
                    text-align: left; 
                    padding: 4px 0;
                }
                .items th {
                    border-bottom: 1px solid #ccc;
                }
                .total { 
                    border-top: 1px dashed #000; 
                    margin-top: 10px; 
                    padding-top: 10px;
                }
                .footer { 
                    text-align: center; 
                    margin-top: 20px; 
                    font-size: 10px;
                    border-top: 1px dashed #000;
                    padding-top: 10px;
                }
                .payment-details {
                    margin-top: 10px;
                    font-size: 11px;
                }
                .thankyou {
                    font-size: 12px;
                    font-weight: bold;
                    margin-top: 15px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">🏢 FlexSpace</div>
                <div>Coworking & Workspace</div>
                <div>${new Date().toLocaleDateString('en-PH')}</div>
                <div>${new Date().toLocaleTimeString('en-PH')}</div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong>Order #:</strong> ${orderNumber}<br>
                <strong>Customer:</strong> ${order.customer_name || 'Walk-in Customer'}
            </div>
            
            <table class="items">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>₱${item.price.toFixed(2)}</td>
                            <td>₱${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
             </table>
            
            <div class="total">
                <div><strong>Subtotal:</strong> ₱${order.subtotal.toFixed(2)}</div>
                <div><strong>Tax (12% VAT):</strong> ₱${order.tax.toFixed(2)}</div>
                ${order.discount_amount > 0 ? `<div><strong>Discount:</strong> -₱${order.discount_amount.toFixed(2)}</div>` : ''}
                <div style="font-size: 14px; margin-top: 5px;"><strong>TOTAL:</strong> ₱${order.total.toFixed(2)}</div>
            </div>
            
            <div class="payment-details">
                <div><strong>Payment Method:</strong> ${paymentMethodDisplay}</div>
                ${isCash ? `<div><strong>Amount Received:</strong> ₱${amountReceived}</div>` : ''}
                ${isCash ? `<div><strong>Change:</strong> ₱${changeAmount}</div>` : ''}
                ${order.payment_method === 'online' ? `<div><strong>Status:</strong> PAID ✓</div>` : ''}
            </div>
            
            <div class="footer">
                <div>Thank you for your purchase!</div>
                <div>✨ Come back again! ✨</div>
                <div style="font-size: 8px; margin-top: 5px;">
                    ${order.payment_method === 'online' ? 'Online payment confirmed' : 'Keep this receipt for reference'}
                </div>
            </div>
            
            <div class="thankyou">
                Have a productive day! 💪
            </div>
        </body>
        </html>
    `);
    receiptWindow.document.close();
    receiptWindow.print();
};

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'food': return <Sandwich size={24} className="text-indigo-400" />;
            case 'beverage': return <Coffee size={24} className="text-indigo-400" />;
            case 'snacks': return <Cookie size={24} className="text-indigo-400" />;
            case 'merch': return <Users size={24} className="text-indigo-400" />;
            default: return <Package size={24} className="text-indigo-400" />;
        }
    };

    const categories = [
        { id: 'all', name: 'All', icon: <Package size={16} /> },
        { id: 'food', name: 'Food', icon: <Sandwich size={16} /> },
        { id: 'beverage', name: 'Drinks', icon: <Coffee size={16} /> },
        { id: 'snacks', name: 'Snacks', icon: <Cookie size={16} /> },
        { id: 'merch', name: 'Merch', icon: <Users size={16} /> },
    ];

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
        return matchesSearch && matchesCategory && product.is_available !== false;
    });

    if (error && !loading) {
        return (
            <div className="bg-[#111114] rounded-2xl border border-white/5 p-12 text-center">
                <Package size={64} className="mx-auto text-slate-600 mb-4" />
                <h2 className="text-xl font-black text-white mb-2">Unable to Load POS</h2>
                <p className="text-slate-400 mb-4">{error}</p>
                <Button onClick={fetchProducts} className="bg-indigo-600">
                    <Loader2 size={16} className="mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-80px)] flex gap-4">
            {/* Products Panel */}
            <div className="flex-1 bg-[#111114] rounded-2xl border border-white/5 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/5">
                    <div className="flex gap-3 mb-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"
                        >
                            <History size={20} />
                        </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                                    selectedCategory === cat.id
                                        ? "bg-indigo-600 text-white"
                                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                                )}
                            >
                                {cat.icon}
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 size={32} className="animate-spin text-indigo-500" />
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-12">
                            <Package size={48} className="mx-auto text-slate-600 mb-3" />
                            <p className="text-slate-500">No products found</p>
                            <p className="text-slate-600 text-sm">Add products in Inventory first</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {filteredProducts.map(product => (
                                <button
                                    key={product._id}
                                    onClick={() => addToCart(product)}
                                    disabled={product.stock === 0}
                                    className={cn(
                                        "group bg-white/5 hover:bg-white/10 rounded-xl p-3 text-center transition-all hover:scale-105",
                                        product.stock === 0 && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <div className="w-12 h-12 mx-auto bg-indigo-500/20 rounded-xl flex items-center justify-center mb-2 group-hover:bg-indigo-500/30 transition-all">
                                        {getCategoryIcon(product.category)}
                                    </div>
                                    <p className="text-white font-bold text-sm truncate">{product.name}</p>
                                    <p className="text-indigo-400 font-bold text-xs">₱{product.price}</p>
                                    {product.stock !== undefined && (
                                        <p className={cn(
                                            "text-[10px] mt-1",
                                            product.stock < 5 ? "text-amber-400" : "text-slate-500"
                                        )}>
                                            Stock: {product.stock}
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Cart Panel */}
            <div className="w-96 bg-[#111114] rounded-2xl border border-white/5 flex flex-col">
                <div className="p-4 border-b border-white/5">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <ShoppingCart size={20} className="text-indigo-400" />
                            <h2 className="text-white font-black">Cart</h2>
                            <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full">
                                {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                            </span>
                        </div>
                        {cart.length > 0 && (
                            <button onClick={() => setCart([])} className="text-red-400 text-xs hover:text-red-300">
                                Clear All
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="text-center py-12">
                            <ShoppingCart size={48} className="mx-auto text-slate-600 mb-3" />
                            <p className="text-slate-500 text-sm">Cart is empty</p>
                            <p className="text-slate-600 text-xs">Click on products to add</p>
                        </div>
                    ) : (
                        cart.map(item => {
                            const product = products.find(p => p._id === item.id);
                            return (
                                <div key={item.id} className="bg-white/5 rounded-xl p-3">
                                    <div className="flex justify-between">
                                        <p className="text-white font-bold text-sm">{item.name}</p>
                                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-300">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <p className="text-indigo-400 text-xs">₱{item.price} each</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateQuantity(item.id, -1)}
                                                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="text-white text-sm w-8 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, 1)}
                                                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
                                                disabled={item.quantity >= (product?.stock || 999)}
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                        <p className="text-white font-bold">₱{(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                    {product?.stock !== undefined && product.stock < 5 && product.stock > 0 && (
                                        <p className="text-[10px] text-amber-400 mt-1">Low stock: {product.stock} left</p>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="p-4 border-t border-white/5">
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Subtotal</span>
                                <span className="text-white">₱{calculateSubtotal().toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Tax (12% VAT)</span>
                                <span className="text-white">₱{calculateTax().toFixed(2)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-emerald-400">Discount</span>
                                    <span className="text-emerald-400">-₱{calculateDiscountAmount().toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
                                <span className="text-white">Total</span>
                                <span className="text-indigo-400">₱{calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <Button
                                onClick={() => setShowDiscountModal(true)}
                                className="flex-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-xl py-2 font-bold text-sm"
                            >
                                <Percent size={14} className="mr-1" />
                                Discount
                            </Button>
                            <Button
                                onClick={handleCheckout}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 rounded-xl py-2 font-bold text-sm"
                            >
                                <CreditCard size={14} className="mr-2" />
                                Checkout
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* History Panel */}
            {showHistory && (
                <div className="w-80 bg-[#111114] rounded-2xl border border-white/5 flex flex-col">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-white font-black text-sm">Recent Orders</h3>
                        <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {recentOrders.map(order => (
                            <div key={order._id} className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                                <div className="flex justify-between">
                                    <span className="text-slate-400 text-xs">#{order.order_number}</span>
                                    <span className="text-emerald-400 font-bold">₱{order.total}</span>
                                </div>
                                <p className="text-white text-xs mt-1">{order.customer_name}</p>
                                <p className="text-slate-500 text-[10px] mt-1">
                                    {formatDate(order.createdAt)}
                                </p>
                                <p className="text-slate-500 text-[10px] capitalize">
                                    {order.payment_method} • {order.items?.length || 0} items
                                </p>
                            </div>
                        ))}
                        {recentOrders.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-slate-500 text-sm">No orders yet</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Discount Modal */}
            <Modal open={showDiscountModal} onClose={() => setShowDiscountModal(false)} title="Add Discount" size="sm" variant="dark">
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setDiscountType('percentage')}
                            className={cn(
                                "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                                discountType === 'percentage' ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                            )}
                        >
                            Percentage (%)
                        </button>
                        <button
                            onClick={() => setDiscountType('fixed')}
                            className={cn(
                                "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                                discountType === 'fixed' ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                            )}
                        >
                            Fixed Amount (₱)
                        </button>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                            {discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                        </label>
                        <input
                            type="number"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            placeholder={discountType === 'percentage' ? 'e.g., 10' : 'e.g., 50'}
                            className="w-full mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setShowDiscountModal(false)}
                            className="flex-1 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={applyDiscount}
                            className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-bold text-sm transition-colors"
                        >
                            Apply Discount
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Payment Modal - Improved Design */}
<Modal open={paymentModal} onClose={() => { setPaymentModal(false); setShowPaymentLink(false); }} title="Complete Payment" size="lg" variant="dark">
    {!showPaymentLink ? (
        <div className="space-y-6">
            {/* Customer Name Input */}
            <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                    <User size={12} /> Customer Name
                </label>
                <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full mt-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition-all"
                />
            </div>

            {/* Payment Method Selection - Premium Cards */}
            <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-2 mb-3">
                    <CreditCard size={12} /> Payment Method
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {/* Cash */}
                    <button
                        onClick={() => setPaymentMethod('cash')}
                        className={cn(
                            "p-4 rounded-xl border-2 transition-all group",
                            paymentMethod === 'cash' 
                                ? "bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-900/20" 
                                : "bg-white/5 border-white/10 hover:border-emerald-500/50"
                        )}
                    >
                        <Banknote size={28} className={cn("mx-auto mb-2 transition-all", paymentMethod === 'cash' ? "text-emerald-400" : "text-slate-500 group-hover:text-emerald-400")} />
                        <p className={cn("text-xs font-bold", paymentMethod === 'cash' ? "text-emerald-400" : "text-white")}>Cash</p>
                        <p className="text-[8px] text-slate-500 mt-1">Pay in person</p>
                    </button>

                    {/* GCash/QR */}
                    <button
                        onClick={() => setPaymentMethod('qr')}
                        className={cn(
                            "p-4 rounded-xl border-2 transition-all group",
                            paymentMethod === 'qr' 
                                ? "bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-900/20" 
                                : "bg-white/5 border-white/10 hover:border-blue-500/50"
                        )}
                    >
                        <Smartphone size={28} className={cn("mx-auto mb-2 transition-all", paymentMethod === 'qr' ? "text-blue-400" : "text-slate-500 group-hover:text-blue-400")} />
                        <p className={cn("text-xs font-bold", paymentMethod === 'qr' ? "text-blue-400" : "text-white")}>GCash/QR</p>
                        <p className="text-[8px] text-slate-500 mt-1">Scan to pay</p>
                    </button>

                    {/* Online Payment */}
                    <button
                        onClick={() => setPaymentMethod('online')}
                        className={cn(
                            "p-4 rounded-xl border-2 transition-all group",
                            paymentMethod === 'online' 
                                ? "bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-900/20" 
                                : "bg-white/5 border-white/10 hover:border-purple-500/50"
                        )}
                    >
                        <CreditCard size={28} className={cn("mx-auto mb-2 transition-all", paymentMethod === 'online' ? "text-purple-400" : "text-slate-500 group-hover:text-purple-400")} />
                        <p className={cn("text-xs font-bold", paymentMethod === 'online' ? "text-purple-400" : "text-white")}>Card/PayMongo</p>
                        <p className="text-[8px] text-slate-500 mt-1">Online payment</p>
                    </button>
                </div>
            </div>

            {/* Cash Payment Section */}
            {paymentMethod === 'cash' && (
                <div className="bg-linear-to-r from-emerald-500/10 to-emerald-600/5 rounded-xl p-4 border border-emerald-500/20">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                        <Banknote size={12} /> Amount Received
                    </label>
                    <div className="relative mt-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-lg">₱</span>
                        <input
                            type="number"
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-8 pr-4 py-3 rounded-xl bg-black/50 border border-emerald-500/30 text-white placeholder:text-slate-600 focus:border-emerald-500 outline-none text-lg font-bold"
                        />
                    </div>
                    {amountReceived && parseFloat(amountReceived) > 0 && (
                        <div className="mt-3 p-2 bg-emerald-500/20 rounded-lg flex justify-between items-center">
                            <span className="text-[9px] text-emerald-400 font-black uppercase">Change</span>
                            <span className="text-lg font-black text-emerald-400">₱{(parseFloat(amountReceived) - calculateTotal()).toFixed(2)}</span>
                        </div>
                    )}
                </div>
            )}

            {/* QR Payment Section */}
            {paymentMethod === 'qr' && (
                <div className="bg-linear-to-r from-blue-500/10 to-blue-600/5 rounded-xl p-4 border border-blue-500/20 text-center">
                    {qrPaymentImage ? (
                        <>
                            <div className="bg-white p-4 rounded-2xl inline-block mb-3 shadow-xl">
                                <img
                                    src={getFullImageUrl(qrPaymentImage)}
                                    alt="Payment QR Code"
                                    className="w-48 h-48 object-contain"
                                    onError={(e) => {
                                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2"%3E%3C/rect%3E%3Cline x1="3" y1="9" x2="21" y2="9"%3E%3C/line%3E%3C/svg%3E';
                                    }}
                                />
                            </div>
                            <p className="text-[10px] text-blue-400 font-black uppercase tracking-wider">Scan to Pay</p>
                            <p className="text-[8px] text-slate-500 mb-3">GCash / QRPh / Maya</p>
                            <div className="bg-blue-500/20 rounded-lg p-2 mb-3">
                                <p className="text-[8px] text-blue-400 font-black uppercase">Amount</p>
                                <p className="text-lg font-black text-white">₱{calculateTotal().toFixed(2)}</p>
                            </div>
                            <button
                                onClick={async () => await completeOrder('qr', calculateTotal())}
                                disabled={isProcessing}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-sm disabled:opacity-50 transition-all"
                            >
                                {isProcessing ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Mark as Paid'}
                            </button>
                        </>
                    ) : (
                        <div className="py-6">
                            <QrCode size={48} className="mx-auto text-slate-600 mb-3" />
                            <p className="text-sm text-amber-400 font-bold mb-2">No QR Code Available</p>
                            <p className="text-[10px] text-slate-400 mb-4">Please upload a payment QR code in Profile Settings</p>
                            <button
                                onClick={() => window.open('/profile', '_blank')}
                                className="px-4 py-2 bg-indigo-600/20 text-indigo-400 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all"
                            >
                                Go to Settings
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Online Payment Section */}
            {paymentMethod === 'online' && (
                <div className="bg-linear-to-r from-purple-500/10 to-purple-600/5 rounded-xl p-4 border border-purple-500/20 text-center">
                    {hasPayMongoKey ? (
                        <>
                            <CreditCard size={48} className="mx-auto text-purple-400 mb-3" />
                            <p className="text-sm text-white font-bold mb-2">PayMongo Online Payment</p>
                            <p className="text-[10px] text-slate-400 mb-4">Customer pays via GCash, PayMaya, or Credit/Debit Card</p>
                            
                            {/* Supported Payment Logos */}
                            <div className="flex justify-center gap-4 mb-4">
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                        <span className="text-xs font-black text-emerald-400">GCash</span>
                                    </div>
                                    <span className="text-[8px] text-slate-500 mt-1">GCash</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                        <span className="text-xs font-black text-blue-400">Maya</span>
                                    </div>
                                    <span className="text-[8px] text-slate-500 mt-1">PayMaya</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                        <CreditCard size={16} className="text-purple-400" />
                                    </div>
                                    <span className="text-[8px] text-slate-500 mt-1">Card</span>
                                </div>
                            </div>
                            
                            <div className="bg-purple-500/20 rounded-lg p-2 mb-4">
                                <p className="text-[8px] text-purple-400 font-black uppercase">Total Amount</p>
                                <p className="text-xl font-black text-white">₱{calculateTotal().toFixed(2)}</p>
                            </div>
                        </>
                    ) : (
                        <div className="py-6">
                            <CreditCard size={48} className="mx-auto text-slate-600 mb-3" />
                            <p className="text-sm text-amber-400 font-bold mb-2">PayMongo Not Configured</p>
                            <p className="text-[10px] text-slate-400 mb-4">Please add your PayMongo secret key in Payment Settings</p>
                            <button
                                onClick={() => window.open('/space/payment-settings', '_blank')}
                                className="px-4 py-2 bg-amber-600/20 text-amber-400 rounded-lg text-[10px] font-black uppercase hover:bg-amber-600 hover:text-white transition-all"
                            >
                                Configure PayMongo
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Total Amount Card */}
            <div className="bg-linear-to-r from-indigo-500/20 to-purple-500/20 rounded-xl p-4 border border-indigo-500/30">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-[8px] text-indigo-400 font-black uppercase tracking-wider">Total Due</p>
                        <p className="text-2xl font-black text-white">₱{calculateTotal().toFixed(2)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                        <Receipt size={20} className="text-indigo-400" />
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
                <button
                    onClick={() => setPaymentModal(false)}
                    className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors rounded-xl"
                >
                    Cancel
                </button>
                <button
                    onClick={processPayment}
                    disabled={isProcessing || (paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < calculateTotal()))}
                    className="flex-1 py-3 bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-emerald-900/20"
                >
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {paymentMethod === 'online' ? 'Generate Payment Link' : 'Complete Payment'}
                </button>
            </div>
        </div>
    ) : (
        // Payment Link Generated Screen
        <div className="text-center py-4 space-y-5">
            <div className="w-20 h-20 mx-auto bg-linear-to-r from-purple-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
                <ExternalLink size={40} className="text-purple-400" />
            </div>
            
            <div>
                <h3 className="text-white font-black text-xl mb-1">Payment Link Generated!</h3>
                <p className="text-slate-400 text-xs">Share this link with the customer to complete payment</p>
            </div>

            {/* Payment Link Box */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-[8px] text-purple-400 font-black uppercase tracking-wider mb-2">Payment Link</p>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={paymentLink}
                        readOnly
                        className="flex-1 px-3 py-2.5 bg-black/50 rounded-lg text-white text-xs font-mono truncate"
                    />
                    <button
                        onClick={copyPaymentLink}
                        className="p-2.5 bg-purple-600/20 hover:bg-purple-600 rounded-lg transition-all"
                    >
                        {copied ? <CheckCircle size={16} className="text-emerald-400" /> : <Copy size={16} className="text-purple-400" />}
                    </button>
                </div>
            </div>

            {/* Amount Box */}
            <div className="bg-linear-to-r from-indigo-500/20 to-purple-500/20 rounded-xl p-4 border border-indigo-500/30">
                <p className="text-[8px] text-indigo-400 font-black uppercase tracking-wider">Total Amount</p>
                <p className="text-3xl font-black text-white">₱{calculateTotal().toFixed(2)}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
                <button
                    onClick={() => {
                        setShowPaymentLink(false);
                        setPaymentModal(false);
                        resetOrder();
                    }}
                    className="flex-1 py-3 bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl text-white font-bold text-sm transition-all shadow-lg shadow-emerald-900/20"
                >
                    <CheckCircle size={16} className="inline mr-2" />
                    Order Completed
                </button>
            </div>
        </div>
    )}
</Modal>

            <PaymentQRModal
                isOpen={showPaymentQR}
                onClose={() => {
                    if (pollingInterval) clearInterval(pollingInterval);
                    setShowPaymentQR(false);
                    setGeneratedPaymentLink('');
                    setPaymentCompleted(false);
                    resetOrder();
                }}
                orderId={currentOrderId}
                orderNumber={currentOrderId}
                amount={calculateTotal()}
                paymentLink={generatedPaymentLink}
                onPaymentComplete={(orderNum) => {
                    console.log('Payment completed for order:', orderNum);
                    fetchRecentOrders();
                    resetOrder();
                }}
            />
        </div>
    );
};

export default POS;