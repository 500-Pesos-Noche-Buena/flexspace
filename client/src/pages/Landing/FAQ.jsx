import React, { useState, useEffect } from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Coffee, Wifi, CreditCard, MapPin, Clock, Users, Star, Shield, DollarSign } from "lucide-react";
import { Link } from 'react-router-dom';
import { apiGet } from '@/utils/Api';

const FAQ = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalSpaces: 0,
        activeBookings: 0
    });
    const [loading, setLoading] = useState(true);

    // Format number with K/M suffix
    const formatNumber = (num) => {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await apiGet('/landing/stats');
                if (res.data) {
                    setStats({
                        totalUsers: res.data.totalUsers || 0,
                        totalSpaces: res.data.totalSpaces || 0,
                        activeBookings: res.data.activeBookings || 0
                    });
                }
            } catch (error) {
                console.error("Failed to fetch stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        
        // Poll every 30 seconds for real-time stats
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const faqData = [
        {
            question: "How do I find the best coworking spaces near me in Iloilo?",
            answer: "Use our interactive map on the homepage or the 'Explore Spaces' page. You can filter by district (Molo, Jaro, Mandurriao, etc.), price range, and amenities to find the perfect workspace near your location.",
            icon: <MapPin className="w-4 h-4" />
        },
        {
            question: "Are the rates listed on FlexSpace accurate and up-to-date?",
            answer: "Yes! Space owners update their rates directly in the system. We also have real-time sync to ensure you see the most current pricing. Rates are shown per hour, but many spaces offer daily and monthly discounts.",
            icon: <DollarSign className="w-4 h-4" />
        },
        {
            question: "Do I need to book a slot in advance?",
            answer: "For popular hubs during peak hours (9 AM - 5 PM), we recommend booking in advance to secure your spot. However, many spaces accept walk-ins. Use the 'Walk-in' feature for quick check-ins without prior booking.",
            icon: <Clock className="w-4 h-4" />
        },
        {
            question: "How do I earn and redeem points?",
            answer: "You earn 1 point for every ₱20 spent on bookings. Points can be redeemed for discount vouchers (20 points = ₱1 off). Go to 'Redeem Points' in your dashboard to exchange your points for vouchers.",
            icon: <Star className="w-4 h-4" />
        },
        {
            question: "What amenities are typically available?",
            answer: "Most spaces offer high-speed WiFi (100+ Mbps), air conditioning, power outlets, comfortable seating, and quiet zones. Premium spaces also offer meeting rooms, printing services, free coffee, and parking.",
            icon: <Wifi className="w-4 h-4" />
        },
        {
            question: "Is outside food allowed in coworking spaces?",
            answer: "Policies vary by space. Most allow outside snacks and drinks, but some designated 'Study Cafes' require purchase from their menu. Check the 'Amenities' section on each space profile for specific rules.",
            icon: <Coffee className="w-4 h-4" />
        },
        {
            question: "How do I become a space owner on FlexSpace?",
            answer: "Click 'List Your Space' on the homepage, fill out the application form with your business details, and upload your Business Permit and DTI/SEC registration. Our team will review and approve your application within 2-3 business days.",
            icon: <Users className="w-4 h-4" />
        },
        {
            question: "How are space ratings determined?",
            answer: "Ratings are based on verified customer reviews. Only users who have completed a booking can leave a review, ensuring authenticity. The overall rating is the average of all verified reviews for that space.",
            icon: <Star className="w-4 h-4" />
        },
        {
            question: "Is FlexSpace free to use?",
            answer: "Yes! FlexSpace is completely free for users to browse, compare, and book workspaces. Space owners pay a small commission fee per successful booking.",
            icon: <Shield className="w-4 h-4" />
        },
        {
            question: "Can I host events or meetings in these spaces?",
            answer: "Many spaces offer private meeting rooms and event spaces that can be booked hourly. Check the 'Available Rooms' section on each space profile for capacity and pricing.",
            icon: <Users className="w-4 h-4" />
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 py-12 md:py-20 px-4 md:px-6">
            <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
                
                {/* Header */}
                <div className="text-center space-y-4">
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 uppercase tracking-widest text-[10px] px-3 py-1">
                        Help Center
                    </Badge>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Frequently Asked <span className="text-indigo-600">Questions</span>
                    </h1>
                    <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto">
                        Everything you need to know about finding and booking coworking spaces in Iloilo City.
                    </p>
                </div>

                {/* FAQ Accordion */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <Accordion type="single" collapsible className="w-full">
                        {faqData.map((item, index) => (
                            <AccordionItem 
                                key={index} 
                                value={`item-${index}`} 
                                className="border-b border-slate-100 last:border-0"
                            >
                                <AccordionTrigger className="hover:no-underline hover:text-indigo-600 text-left font-bold text-slate-800 py-5 px-6 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-indigo-600 transition-colors">
                                            {item.icon}
                                        </div>
                                        <span className="text-sm md:text-base">{item.question}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-slate-500 leading-relaxed pl-14 pr-6 pb-6">
                                    {item.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>

                {/* Still Need Help Section */}
                <div className="bg-linear-to-r from-indigo-600 to-indigo-500 rounded-3xl p-8 text-center shadow-xl">
                    <h3 className="font-black text-xl text-white mb-2">Still have questions?</h3>
                    <p className="text-indigo-100 text-sm mb-6 max-w-md mx-auto">
                        Can't find what you're looking for? Our support team is here to help!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a 
                            href="mailto:flexspace260@gmail.com" 
                            className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all inline-flex items-center gap-2 justify-center"
                        >
                            Email Support
                        </a>
                        <Link 
                            to="/contact" 
                            className="bg-indigo-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-800 transition-all inline-flex items-center gap-2 justify-center"
                        >
                            Contact Form
                        </Link>
                    </div>
                </div>

                {/* Real-time Stats Section - No 24/7 */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                        <p className="text-3xl font-black text-indigo-600">
                            {loading ? '...' : formatNumber(stats.totalSpaces)}+
                        </p>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider mt-1">Partner Spaces</p>
                        <p className="text-[7px] text-slate-400 mt-1">Verified Locations</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                        <p className="text-3xl font-black text-indigo-600">
                            {loading ? '...' : formatNumber(stats.totalUsers)}+
                        </p>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider mt-1">Active Members</p>
                        <p className="text-[7px] text-slate-400 mt-1">Ilonggo Professionals</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all col-span-2 md:col-span-1">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-xl font-black text-indigo-600">
                                {loading ? '...' : stats.activeBookings}
                            </p>
                        </div>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider mt-1">Currently Active</p>
                        <p className="text-[7px] text-slate-400 mt-1">Right Now</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FAQ;