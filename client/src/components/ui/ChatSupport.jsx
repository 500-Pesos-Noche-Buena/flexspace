import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare, X, Send, Bot, Maximize2, ShoppingCart,
    Coffee, Sandwich, Cookie, Package, Sparkles, Zap,
    Plus, Minus, Trash2, Banknote, QrCode, CheckCircle, Loader2, Store, Clock,
    Search, MapPin, Wifi, Users
} from 'lucide-react';
import { apiPost, apiGet } from '@/utils/Api';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { showToast } from '@/components/ui/SweetAlert2';

// Quick chat suggestions based on auth status
const getQuickChats = (isAuthenticated, hasActiveBooking) => {
    const baseChats = [
        { id: 'spaces', label: '🏢 Find Spaces', icon: '🏢', action: 'find_spaces' },
        { id: 'districts', label: '📍 Districts', icon: '📍', action: 'districts' },
        { id: 'how_to_book', label: '📖 How to Book', icon: '📖', action: 'how_to_book' },
        { id: 'faq', label: '❓ FAQ', icon: '❓', action: 'faq' },
    ];

    // Only show food ordering if authenticated AND has active booking
    if (isAuthenticated && hasActiveBooking) {
        return [
            ...baseChats,
            { id: 'menu', label: '📋 Show Menu', icon: '📋', action: 'show_menu' },
            { id: 'order', label: '🛒 Place Order', icon: '🛒', action: 'place_order' },
            { id: 'food', label: '🍔 Food Items', icon: '🍔', action: 'food_items' },
            { id: 'drinks', label: '☕ Drinks', icon: '☕', action: 'drinks' },
            { id: 'snacks', label: '🍿 Snacks', icon: '🍿', action: 'snacks' },
        ];
    }

    return baseChats;
};

// AI prompts
const AI_PROMPTS = {
    find_spaces: "Can you show me available coworking spaces in Iloilo City?",
    districts: "What districts in Iloilo City have coworking spaces?",
    how_to_book: "How do I book a coworking space?",
    faq: "What are the frequently asked questions about FlexSpace?",
    show_menu: "Can you show me the full menu of food and drinks available?",
    place_order: "I want to place an order for food. Can you help me?",
    food_items: "What food items are available on the menu?",
    drinks: "What drinks and beverages are available?",
    snacks: "What snacks and merchandise are available?",
};

// Categories
const CATEGORIES = [
    { id: 'all', name: 'All' },
    { id: 'food', name: '🍔 Food' },
    { id: 'beverage', name: '☕ Drinks' },
    { id: 'snacks', name: '🍿 Snacks' },
    { id: 'merch', name: '🎁 Merch' },
];

const ChatSupport = () => {
    const { user, isAuthenticated } = useAuth();

    // Chat state
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [isWelcomeTyping, setIsWelcomeTyping] = useState(true);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isBackendOnline, setIsBackendOnline] = useState(true);
    const [showQuickChats, setShowQuickChats] = useState(true);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    // Auth & Booking state
    const [hasActiveBooking, setHasActiveBooking] = useState(false);
    const [checkingBooking, setCheckingBooking] = useState(true);

    // Order state (only used when authenticated and has active booking)
    const [cart, setCart] = useState([]);
    const [products, setProducts] = useState([]);
    const [activeSpace, setActiveSpace] = useState(null);
    const [activeBooking, setActiveBooking] = useState(null);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [paymentModal, setPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPaymentQR, setShowPaymentQR] = useState(false);
    const [paymentLink, setPaymentLink] = useState('');
    const [currentOrderNumber, setCurrentOrderNumber] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [showOrderPanel, setShowOrderPanel] = useState(false);

    const pollingRef = useRef(null);
    const fetchedRef = useRef(false);

    // Check if user has active booking
    useEffect(() => {
        const checkActiveBooking = async () => {
            if (!isAuthenticated) {
                setHasActiveBooking(false);
                setCheckingBooking(false);
                return;
            }

            try {
                const res = await apiGet('/user/active-booking-fast');
                if (res.success && res.data?.booking) {
                    setHasActiveBooking(true);
                    setActiveBooking(res.data.booking);
                    setActiveSpace(res.data.space);
                } else {
                    setHasActiveBooking(false);
                }
            } catch (err) {
                console.error('Error checking active booking:', err);
                setHasActiveBooking(false);
            } finally {
                setCheckingBooking(false);
            }
        };

        checkActiveBooking();
    }, [isAuthenticated]);

    // Check backend connectivity
    useEffect(() => {
        const checkBackendStatus = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/health`);
                const data = await response.json();
                setIsBackendOnline(response.ok && data.status === 'online');
            } catch (error) {
                setIsBackendOnline(false);
            }
        };

        checkBackendStatus();
        const interval = setInterval(checkBackendStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    // Monitor network
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Load products when order panel opens (only if authenticated and has active booking)
    useEffect(() => {
        if (showOrderPanel && !fetchedRef.current && isAuthenticated && hasActiveBooking) {
            fetchedRef.current = true;
            fetchProducts();
        }
    }, [showOrderPanel, isAuthenticated, hasActiveBooking]);

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
                            handleOrderComplete();
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

    const isFullyOnline = isOnline && isBackendOnline;
    const statusText = !isOnline ? 'Offline' : !isBackendOnline ? 'Server Down' : 'Online';
    const statusColor = !isOnline ? 'bg-red-500' : !isBackendOnline ? 'bg-orange-500' : 'bg-emerald-500';

    // Check if user can order food
    const canOrderFood = isAuthenticated && hasActiveBooking && activeSpace;

    // Fetch products (only for authenticated users with active booking)
    const fetchProducts = async () => {
        if (!canOrderFood) {
            showToast({
                icon: 'warning',
                title: 'Cannot Order Food',
                text: 'You need an active booking to order food.'
            });
            setShowOrderPanel(false);
            return;
        }

        setLoadingProducts(true);
        try {
            const productsRes = await apiGet('/landing/products');
            if (productsRes.success && productsRes.data) {
                setProducts(productsRes.data);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            showToast({ icon: 'error', title: 'Failed to load menu' });
        } finally {
            setLoadingProducts(false);
        }
    };

    // Cart functions (only used when canOrderFood is true)
    const addToCart = (product) => {
        if (!canOrderFood) {
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
    const calculateTotal = () => calculateSubtotal();

    // Order functions
    const handleCheckout = () => {
        if (!canOrderFood) {
            showToast({ icon: 'warning', title: 'No Active Session', text: 'You need an active booking to order food.' });
            return;
        }
        if (cart.length === 0) {
            showToast({ icon: 'warning', title: 'Cart is empty', text: 'Please add items to your cart first.' });
            return;
        }
        setPaymentModal(true);
    };

    const processOrder = async () => {
        if (!canOrderFood) return;

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
                    showToast({ icon: 'success', title: 'Order placed successfully!' });
                    handleOrderComplete();
                }
            }
        } catch (err) {
            showToast({ icon: 'error', title: err.message || 'Order failed' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOrderComplete = () => {
        setCart([]);
        setShowOrderPanel(false);
        setMessages(prev => [...prev, {
            id: Date.now(),
            text: `✅ **Order Placed Successfully!** 🎉

Your order has been received and our staff is preparing it. 

📋 **What happens next:**
1. 👨‍🍳 Kitchen prepares your order
2. 🔔 You'll receive a notification when ready
3. 🏃 Pick up at the counter

*Thank you for ordering with FlexSpace!* 🍔☕`,
            sender: 'bot',
            time: new Date().toLocaleTimeString()
        }]);
    };

    // Chat functions
    const handleQuickChat = (action) => {
        const prompt = AI_PROMPTS[action];
        if (!prompt) return;

        // Don't hide quick chats automatically - let user control it
        setInput(prompt);
        setTimeout(() => {
            handleSendWithMessage(prompt);
        }, 100);
    };

    const handleSendWithMessage = async (messageText) => {
        if (!messageText.trim() || isTyping) return;

        const userMsg = {
            id: Date.now(),
            text: messageText,
            sender: 'user',
            time: new Date().toLocaleTimeString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        try {
            const response = await apiPost('/chat/support', { message: messageText });

            const botMsg = {
                id: Date.now() + 1,
                text: response.reply || response.data?.reply || "System core is currently re-indexing. Please try again.",
                sender: 'bot',
                time: new Date().toLocaleTimeString()
            };

            setMessages(prev => [...prev, botMsg]);
            setIsBackendOnline(true);
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: isOnline && !isBackendOnline
                    ? "Backend server is offline. Please try again later, gid! 🔌"
                    : "Connection failed! Please check your internet connection, gid! 🔌",
                sender: 'bot',
                time: new Date().toLocaleTimeString(),
            }]);
            setIsBackendOnline(false);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;
        await handleSendWithMessage(input);
    };

    // Toggle quick chats visibility - MANUAL CONTROL
    const toggleQuickChats = () => {
        setShowQuickChats(!showQuickChats);
    };

    // Welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0 && isWelcomeTyping) {
            const timer = setTimeout(() => {
                if (!isFullyOnline) {
                    let offlineMessage = "";
                    if (!isOnline) {
                        offlineMessage = "⚠️ No internet connection. Please check your network! 📡";
                    } else if (!isBackendOnline) {
                        offlineMessage = "⚠️ Server is currently offline. Please try again later! 🔌";
                    }
                    setMessages([{
                        id: 1,
                        text: offlineMessage,
                        sender: 'bot',
                        time: new Date().toLocaleTimeString()
                    }]);
                } else {
                    let welcomeMessage = `👋 Welcome to FlexSpace AI! I'm here to help you with:

• 🏢 Finding coworking spaces in Iloilo City
• 📍 Exploring districts (Molo, Jaro, Mandurriao, City Proper)
• ❓ Answering questions about bookings`;

                    if (canOrderFood) {
                        welcomeMessage += `
• 🍔 Ordering food & drinks from ${activeSpace?.name || 'your space'}`;
                    }

                    welcomeMessage += `

**Tap a quick chat button below or type your question!**`;

                    setMessages([{
                        id: 1,
                        text: welcomeMessage,
                        sender: 'bot',
                        time: new Date().toLocaleTimeString()
                    }]);
                }
                setIsWelcomeTyping(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, messages.length, isWelcomeTyping, isFullyOnline, isOnline, isBackendOnline, canOrderFood, activeSpace]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Focus input
    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current && !isWelcomeTyping && !showOrderPanel) {
            inputRef.current.focus();
        }
    }, [isOpen, isMinimized, isWelcomeTyping, showOrderPanel]);

    // Toggle order panel (only if canOrderFood)
    const toggleOrderPanel = () => {
        if (!isAuthenticated) {
            showToast({ icon: 'warning', title: 'Please login to order food' });
            return;
        }
        if (!hasActiveBooking) {
            showToast({ icon: 'warning', title: 'No Active Booking', text: 'You need an active booking to order food.' });
            return;
        }
        setShowOrderPanel(!showOrderPanel);
        if (!showOrderPanel) {
            fetchedRef.current = false;
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full shadow-2xl shadow-indigo-900/50 transition-all active:scale-95 z-9999 group"
                style={{ zIndex: 9999 }}
            >
                <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 border-2 border-[#0f0f12] rounded-full animate-pulse ${!isOnline ? 'bg-red-500' : !isBackendOnline ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
            </button>
        );
    }

    return (
        <>
            <div
                className={`fixed bottom-6 right-6 w-[90vw] sm:w-100 md:w-112.5 bg-[#0f0f12] border border-white/10 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 overflow-hidden z-9999 ${isMinimized ? 'h-17.5' : showOrderPanel ? 'h-[90vh] sm:h-[85vh] md:h-175 max-h-[95vh]' : 'h-[80vh] sm:h-[70vh] md:h-150 max-h-175'}`}
                style={{ zIndex: 9999 }}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/10 bg-linear-to-r from-indigo-950/30 to-purple-950/30 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-linear-to-br from-indigo-600/30 to-purple-600/30 rounded-xl flex items-center justify-center">
                            {showOrderPanel ? <ShoppingCart className="w-5 h-5 text-indigo-400" /> : <Bot className="w-5 h-5 text-indigo-400" />}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white tracking-wide">
                                {showOrderPanel ? '🍔 Order Food' : 'Flex Support'}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${statusColor} ${isFullyOnline ? 'animate-pulse' : ''}`}></span>
                                <span className={`text-[10px] font-medium ${!isOnline ? 'text-red-400' : !isBackendOnline ? 'text-orange-400' : 'text-emerald-400'}`}>
                                    {statusText}
                                </span>
                                {isAuthenticated && hasActiveBooking && (
                                    <span className="text-[8px] text-emerald-400 ml-2">✓ Active Session</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Only show order button if authenticated AND has active booking */}
                        {!showOrderPanel && canOrderFood && (
                            <button
                                onClick={toggleOrderPanel}
                                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors relative"
                                aria-label="Order Food"
                            >
                                <ShoppingCart size={16} />
                                {cart.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                                        {cart.reduce((sum, i) => sum + i.quantity, 0)}
                                    </span>
                                )}
                            </button>
                        )}
                        {showOrderPanel && (
                            <button
                                onClick={toggleOrderPanel}
                                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                <MessageSquare size={16} />
                            </button>
                        )}
                        <button
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {!isMinimized && (
                    <>
                        {showOrderPanel ? (
                            // Order Panel - Only shown when canOrderFood is true
                            <div className="flex-1 overflow-hidden flex flex-col">
                                {loadingProducts ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                                    </div>
                                ) : !activeSpace ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                        <Store size={48} className="text-slate-500 mb-4" />
                                        <h3 className="text-white font-black text-lg mb-2">No Active Session</h3>
                                        <p className="text-slate-400 text-sm mb-4">
                                            You need an active booking to order food.
                                        </p>
                                        <button onClick={toggleOrderPanel} className="px-4 py-2 bg-indigo-600 rounded-xl text-white text-sm font-bold">
                                            Back to Chat
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Products Panel */}
                                        <div className="flex-1 overflow-y-auto p-3">
                                            {/* Space info */}
                                            <div className="mb-3 p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                                <p className="text-[10px] text-slate-400">Ordering from:</p>
                                                <p className="text-white font-bold text-sm">{activeSpace.name}</p>
                                                {activeBooking && (
                                                    <p className="text-[8px] text-emerald-400 flex items-center gap-1">
                                                        <Clock size={10} /> Active Session: #{activeBooking.ticket_number}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Search */}
                                            <input
                                                type="text"
                                                placeholder="Search items..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 outline-none text-sm mb-3"
                                            />

                                            {/* Categories */}
                                            <div className="flex gap-1.5 overflow-x-auto mb-3 pb-2">
                                                {CATEGORIES.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setSelectedCategory(cat.id)}
                                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                                    >
                                                        {cat.name}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Products Grid */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {products
                                                    .filter(p => {
                                                        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
                                                        const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
                                                        return matchSearch && matchCategory && p.is_available !== false;
                                                    })
                                                    .slice(0, 50)
                                                    .map(product => (
                                                        <button
                                                            key={product._id}
                                                            onClick={() => addToCart(product)}
                                                            disabled={product.stock === 0}
                                                            className="bg-white/5 hover:bg-white/10 rounded-xl p-3 text-left transition-all active:scale-95 disabled:opacity-50"
                                                        >
                                                            <p className="text-white font-bold text-sm line-clamp-2">{product.name}</p>
                                                            <p className="text-indigo-400 font-bold text-xs mt-1">₱{product.price}</p>
                                                            <p className="text-[8px] text-slate-500 mt-0.5">Stock: {product.stock}</p>
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* Cart Panel */}
                                        <div className="border-t border-white/10 bg-[#1a1a24] shrink-0 max-h-[40vh] overflow-y-auto">
                                            <div className="p-3 border-b border-white/10">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <ShoppingCart size={16} className="text-indigo-400" />
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

                                            <div className="p-3 space-y-2">
                                                {cart.length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <ShoppingCart size={24} className="mx-auto text-slate-600 mb-1" />
                                                        <p className="text-slate-500 text-xs">Cart is empty</p>
                                                    </div>
                                                ) : (
                                                    cart.map(item => (
                                                        <div key={item.id} className="bg-white/5 rounded-xl p-2">
                                                            <div className="flex justify-between">
                                                                <p className="text-white font-bold text-xs line-clamp-1">{item.name}</p>
                                                                <button onClick={() => removeItem(item.id)} className="text-red-400">
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                            <p className="text-indigo-400 text-[10px]">₱{item.price} each</p>
                                                            <div className="flex justify-between items-center mt-1">
                                                                <div className="flex gap-1.5">
                                                                    <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center">
                                                                        <Minus size={8} />
                                                                    </button>
                                                                    <span className="text-white text-xs w-5 text-center">{item.quantity}</span>
                                                                    <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center">
                                                                        <Plus size={8} />
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
                                                    <div className="flex justify-between text-sm font-bold">
                                                        <span className="text-white">Total</span>
                                                        <span className="text-indigo-400">₱{calculateTotal().toFixed(2)}</span>
                                                    </div>
                                                    <button
                                                        onClick={handleCheckout}
                                                        className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold text-xs"
                                                    >
                                                        Checkout
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            // Chat Panel - Always visible
                            <>
                                {/* Messages */}
                                <div
                                    ref={scrollRef}
                                    className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#4f46e5 #1f1f24' }}
                                >
                                    {isWelcomeTyping && messages.length === 0 && (
                                        <div className="flex justify-start">
                                            <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-none border border-white/10">
                                                <div className="flex gap-1.5">
                                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                            <div className={`max-w-[85%] rounded-2xl shadow-sm ${msg.sender === 'user'
                                                ? 'bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-br-none'
                                                : 'bg-white/10 text-gray-200 border border-white/10 rounded-bl-none'
                                                }`}>
                                                <div className="px-4 py-3">
                                                    {msg.sender === 'user' ? (
                                                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap wrap-break-word">
                                                            {msg.text}
                                                        </p>
                                                    ) : (
                                                        <div className="text-sm font-medium leading-relaxed prose prose-invert max-w-none">
                                                            <ReactMarkdown
                                                                components={{
                                                                    a: ({ href, children }) => (
                                                                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline transition-colors">
                                                                            {children}
                                                                        </a>
                                                                    ),
                                                                    strong: ({ children }) => (
                                                                        <strong className="font-bold text-indigo-400">{children}</strong>
                                                                    ),
                                                                    ul: ({ children }) => (
                                                                        <ul className="list-disc pl-5 mt-1 mb-1 space-y-1">{children}</ul>
                                                                    ),
                                                                    ol: ({ children }) => (
                                                                        <ol className="list-decimal pl-5 mt-1 mb-1 space-y-1">{children}</ol>
                                                                    ),
                                                                    li: ({ children }) => (
                                                                        <li className="text-sm mb-1">{children}</li>
                                                                    ),
                                                                    p: ({ children }) => (
                                                                        <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                                                                    ),
                                                                }}
                                                            >
                                                                {msg.text}
                                                            </ReactMarkdown>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`px-4 pb-2 text-[10px] opacity-50 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                                    {msg.time}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {isTyping && (
                                        <div className="flex justify-start">
                                            <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-none border border-white/10">
                                                <div className="flex gap-1.5">
                                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Chats - Now only hidden by user toggle */}
                                {showQuickChats && isFullyOnline && (
                                    <div className="px-4 py-2 border-t border-white/10 bg-linear-to-t from-indigo-950/5 to-transparent shrink-0">
                                        <p className="text-[8px] text-slate-400 uppercase tracking-wider mb-2 font-bold">
                                            {canOrderFood ? 'Quick Actions' : 'Get Started'}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {getQuickChats(isAuthenticated, hasActiveBooking).map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleQuickChat(item.action)}
                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[9px] sm:text-[10px] text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                                                >
                                                    <span>{item.icon}</span>
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                        {!isAuthenticated && (
                                            <p className="text-[8px] text-slate-500 mt-2 text-center">
                                                🔑 Sign in to order food and book spaces
                                            </p>
                                        )}
                                        {isAuthenticated && !hasActiveBooking && (
                                            <p className="text-[8px] text-amber-400 mt-2 text-center">
                                                📅 Book a space to order food
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Input */}
                                <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-linear-to-t from-indigo-950/5 to-transparent shrink-0">
                                    <div className="relative flex items-center">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder={!isFullyOnline ? "No connection..." : canOrderFood ? "Ask about spaces or order food..." : "Ask about coworking spaces..."}
                                            disabled={!isFullyOnline}
                                            className={`w-full bg-[#1a1a24] border border-white/10 rounded-xl py-3 px-4 pr-12 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all ${!isFullyOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!isFullyOnline || isTyping || !input.trim()}
                                            className="absolute right-2 p-2 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <p className="text-[8px] text-slate-500 font-mono">Powered by Gemini AI | FlexSpace</p>
                                        <button
                                            type="button"
                                            onClick={toggleQuickChats}
                                            className="text-[8px] text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                            {showQuickChats ? 'Hide quick chats' : 'Show quick chats'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Payment Modal - Only shown when canOrderFood */}
            {paymentModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-10002 p-4">
                    <div className="bg-[#0f0f12] rounded-2xl border border-white/10 w-full max-w-md p-6">
                        <h3 className="text-white font-black text-lg mb-4">Select Payment Method</h3>

                        <div className="space-y-3 mb-6">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${paymentMethod === 'cash' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                            >
                                <Banknote size={16} /> Cash on Pickup
                            </button>
                            <button
                                onClick={() => setPaymentMethod('online')}
                                className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${paymentMethod === 'online' ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
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

            {/* Payment QR Modal */}
            {showPaymentQR && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-10003 p-4">
                    <div className="bg-[#0f0f12] rounded-2xl border border-white/10 w-full max-w-md p-6 text-center">
                        {paymentStatus === 'pending' ? (
                            <>
                                <div className="bg-white p-4 rounded-2xl inline-block mb-4">
                                    <QRCodeSVG value={paymentLink} size={180} level="H" includeMargin={true} />
                                </div>
                                <p className="text-white font-bold text-sm">Scan to Pay</p>
                                <p className="text-slate-400 text-xs mb-2">Amount: ₱{calculateTotal().toFixed(2)}</p>
                                <p className="text-emerald-400 text-xs mb-4">Order #{currentOrderNumber}</p>

                                <div className="bg-amber-500/10 rounded-xl p-3 mb-4 flex items-center justify-center gap-2">
                                    <Loader2 size={14} className="animate-spin text-amber-400" />
                                    <p className="text-[10px] text-amber-400 font-black uppercase">Waiting for payment...</p>
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => { navigator.clipboard.writeText(paymentLink); showToast({ icon: 'success', title: 'Link copied!' }); }} className="flex-1 py-2 bg-indigo-600/20 text-indigo-400 rounded-xl text-xs font-bold">
                                        Copy Link
                                    </button>
                                    <button onClick={() => window.open(paymentLink, '_blank')} className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-white text-xs font-bold">
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
                                <p className="text-slate-400 text-sm mb-4">₱{calculateTotal().toFixed(2)} confirmed.</p>
                                <p className="text-emerald-400 text-sm">Your order is now being prepared.</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatSupport;