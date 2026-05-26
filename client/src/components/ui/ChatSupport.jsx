import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, Minus, Maximize2, ShoppingCart } from 'lucide-react';
import { apiPost, apiGet } from '@/utils/Api';
import ReactMarkdown from 'react-markdown';
import ChatOrder from './ChatOrder';

const ChatSupport = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [isWelcomeTyping, setIsWelcomeTyping] = useState(true);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isBackendOnline, setIsBackendOnline] = useState(true);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    // Check backend connectivity every 30 seconds
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

    // Monitor network connectivity
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

    // Determine connection status
    const isFullyOnline = isOnline && isBackendOnline;
    const statusText = !isOnline ? 'Offline' : !isBackendOnline ? 'Server Down' : 'Online';
    const statusColor = !isOnline ? 'bg-red-500' : !isBackendOnline ? 'bg-orange-500' : 'bg-emerald-500';

    // Show welcome message with typing effect on first open
    useEffect(() => {
        if (isOpen && messages.length === 0 && isWelcomeTyping) {
            const timer = setTimeout(() => {
                // Check connection status before showing welcome message
                if (!isFullyOnline) {
                    let offlineMessage = "";
                    if (!isOnline) {
                        offlineMessage = "⚠️ No internet connection. Please check your network, gid! 📡";
                    } else if (!isBackendOnline) {
                        offlineMessage = "⚠️ Server is currently offline. Please try again later, gid! 🔌";
                    }
                    setMessages([
                        {
                            id: 1,
                            text: offlineMessage,
                            sender: 'bot',
                            time: new Date().toLocaleTimeString()
                        }
                    ]);
                } else {
                    setMessages([
                        {
                            id: 1,
                            text: "Welcome to FlexSpace AI. How can I help you today? 🍔 You can also order food directly by clicking the 🛒 button!",
                            sender: 'bot',
                            time: new Date().toLocaleTimeString()
                        }
                    ]);
                }
                setIsWelcomeTyping(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, messages.length, isWelcomeTyping, isFullyOnline, isOnline, isBackendOnline]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current && !isWelcomeTyping) {
            inputRef.current.focus();
        }
    }, [isOpen, isMinimized, isWelcomeTyping]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMessage = input.trim();
        const userMsg = {
            id: Date.now(),
            text: userMessage,
            sender: 'user',
            time: new Date().toLocaleTimeString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        try {
            const response = await apiPost('/chat/support', { message: userMessage });

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

    const handleOrderComplete = () => {
        // Add a confirmation message to chat
        setMessages(prev => [...prev, {
            id: Date.now(),
            text: "✅ Your order has been placed successfully! Our staff will prepare your food. You will be notified when it's ready for pickup. 🍔☕",
            sender: 'bot',
            time: new Date().toLocaleTimeString()
        }]);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full shadow-2xl shadow-indigo-900/50 transition-all active:scale-95 z-9999 group"
                style={{ zIndex: 9999 }}
            >
                <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 border-2 border-[#0f0f12] rounded-full animate-pulse ${!isOnline ? 'bg-red-500' : !isBackendOnline ? 'bg-orange-500' : 'bg-emerald-500'
                    }`}></span>
            </button>
        );
    }

    return (
        <>
            <div
                className={`fixed bottom-6 right-6 w-[90vw] sm:w-100 md:w-112.5 bg-[#0f0f12] border border-white/10 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 overflow-hidden z-9999 ${isMinimized ? 'h-17.5' : 'h-[80vh] sm:h-[70vh] md:h-150 max-h-175'
                    }`}
                style={{ zIndex: 9999 }}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/10 bg-linear-to-r from-indigo-950/30 to-purple-950/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-linear-to-br from-indigo-600/30 to-purple-600/30 rounded-xl flex items-center justify-center">
                            <Bot className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white tracking-wide">Flex Support</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${statusColor} ${isFullyOnline ? 'animate-pulse' : ''}`}></span>
                                <span className={`text-[10px] font-medium ${!isOnline ? 'text-red-400' : !isBackendOnline ? 'text-orange-400' : 'text-emerald-400'
                                    }`}>
                                    {statusText}
                                </span>
                                {!isFullyOnline && (
                                    <span className="text-[10px] text-slate-500 ml-1">
                                        {!isOnline ? '(No internet)' : '(Backend down)'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Order Button */}
                        <button
                            onClick={() => setShowOrderModal(true)}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                            aria-label="Order Food"
                        >
                            <ShoppingCart size={16} />
                        </button>
                        <button
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                            aria-label={isMinimized ? "Expand" : "Minimize"}
                        >
                            {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400 transition-colors"
                            aria-label="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {!isMinimized && (
                    <>
                        {/* Messages Container */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                            style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#4f46e5 #1f1f24'
                            }}
                        >
                            {/* Welcome typing indicator */}
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
                                    <div
                                        className={`max-w-[85%] sm:max-w-[80%] rounded-2xl shadow-sm ${msg.sender === 'user'
                                                ? 'bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-br-none'
                                                : 'bg-white/10 text-gray-200 border border-white/10 rounded-bl-none'
                                            }`}
                                    >
                                        <div className="px-4 py-3">
                                            {msg.sender === 'user' ? (
                                                <p className="text-sm sm:text-base font-medium leading-relaxed whitespace-pre-wrap wrap-break-word">
                                                    {msg.text}
                                                </p>
                                            ) : (
                                                <div className="text-sm sm:text-base font-medium leading-relaxed prose prose-invert max-w-none">
                                                    <ReactMarkdown
                                                        components={{
                                                            a: ({ href, children }) => (
                                                                <a 
                                                                    href={href} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-indigo-400 hover:text-indigo-300 underline transition-colors"
                                                                >
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
                                                                <li className="text-sm sm:text-base mb-1">{children}</li>
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
                                        <div className={`px-4 pb-2 text-[10px] sm:text-[11px] opacity-50 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
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

                        {/* Input Form */}
                        <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-linear-to-t from-indigo-950/5 to-transparent">
                            <div className="relative flex items-center">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={!isFullyOnline ? "No connection. Please try again later..." : "Type your message or click 🛒 to order food..."}
                                    disabled={!isFullyOnline}
                                    className={`w-full bg-[#1a1a24] border border-white/10 rounded-xl py-3 px-4 pr-12 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all ${!isFullyOnline ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                />
                                <button
                                    type="submit"
                                    disabled={!isFullyOnline || isTyping || !input.trim()}
                                    className="absolute right-2 p-2 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Send message"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                            <p className="text-[10px] text-center text-slate-500 mt-3 font-mono">
                                Powered by Gemini AI | FlexSpace
                            </p>
                        </form>
                    </>
                )}
            </div>

            {/* ChatOrder Modal */}
            {showOrderModal && (
                <ChatOrder
                    onClose={() => setShowOrderModal(false)}
                    onOrderComplete={handleOrderComplete}
                />
            )}
        </>
    );
};

export default ChatSupport;