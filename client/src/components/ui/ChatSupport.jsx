import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, Loader2, Minus, Maximize2 } from 'lucide-react';
import { apiPost } from '@/utils/Api';

const ChatSupport = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([
        { id: 1, text: "Welcome to FlexSpace AI. How can I assist your workflow today?", sender: 'bot', time: new Date().toLocaleTimeString() }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

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
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "Connection failed! Please check your internet connection, gid! 🔌",
                sender: 'bot',
                time: new Date().toLocaleTimeString(),
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl shadow-2xl shadow-indigo-900/50 transition-all active:scale-95 z-9999 group"
                style={{ zIndex: 9999 }}
            >
                <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0f0f12] rounded-full animate-pulse"></span>
            </button>
        );
    }

    return (
        <div 
            className={`fixed bottom-6 right-6 w-[90vw] sm:w-95 md:w-105 lg:w-112.5 bg-[#0f0f12] border border-white/10 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 overflow-hidden ${
                isMinimized ? 'h-17.5' : 'h-145 sm:h-150 md:h-155'
            }`}
            style={{ zIndex: 9999 }}
        >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 bg-linear-to-r from-indigo-950/20 to-purple-950/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-linear-to-br from-indigo-600/30 to-purple-600/30 rounded-xl flex items-center justify-center">
                        <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">FlexSpace AI ChatBot</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider">System Online</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
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
                    {/* Messages Container */}
                    <div 
                        ref={scrollRef} 
                        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-hide"
                        style={{ 
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#4f46e5 #1f1f24'
                        }}
                    >
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                <div 
                                    className={`max-w-[85%] sm:max-w-[80%] p-3 sm:p-4 rounded-2xl shadow-sm 
                                        ${msg.sender === 'user' 
                                            ? 'bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-br-none' 
                                            : 'bg-white/10 text-gray-200 border border-white/10 rounded-bl-none'}`}
                                >
                                    <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap wrap-break-word">
                                        {msg.text}
                                    </p>
                                    <div className={`text-[9px] sm:text-[10px] mt-1.5 opacity-60 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                        {msg.time}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {isTyping && (
                            <div className="flex justify-start animate-pulse">
                                <div className="bg-white/10 p-3 sm:p-4 rounded-2xl rounded-bl-none border border-white/10">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Form */}
                    <form onSubmit={handleSend} className="p-4 sm:p-5 bg-linear-to-t from-indigo-950/10 to-transparent border-t border-white/10">
                        <div className="relative flex items-center gap-2">
                            <input 
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your message here..."
                                className="flex-1 bg-[#1a1a24] border border-white/10 rounded-xl py-3 sm:py-3.5 px-4 pr-12 text-sm sm:text-base text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                            />
                            <button 
                                type="submit"
                                disabled={isTyping || !input.trim()}
                                className="absolute right-2 p-2 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        <p className="text-[8px] sm:text-[9px] text-center text-slate-500 mt-3 font-mono">
                            Powered by Gemini AI | FlexSpace AI 🤖
                        </p>
                    </form>
                </>
            )}
        </div>
    );
};

export default ChatSupport;
