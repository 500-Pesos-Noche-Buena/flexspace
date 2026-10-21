import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
    Mail, MapPin, Phone, Clock, MessageSquare, 
    Send, Building2, HelpCircle, CheckCircle2, AlertCircle 
} from "lucide-react";
import { showToast } from '@/components/ui/SweetAlert2';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        category: 'general',
        subject: '',
        message: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const previousTitle = document.title;
        document.title = 'Contact Us | FlexSpace Iloilo';
        const description = document.querySelector('meta[name="description"]');
        const previousDescription = description?.getAttribute('content');
        description?.setAttribute('content', 'Get in touch with the FlexSpace Iloilo team for support, space partnership inquiries, user assistance, or general feedback.');
        return () => {
            document.title = previousTitle;
            if (description && previousDescription) description.setAttribute('content', previousDescription);
        };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
            showToast({
                icon: 'warning',
                title: 'Missing Fields',
                text: 'Please fill in your name, email, and message.'
            });
            return;
        }

        setSubmitting(true);
        // Simulate sending inquiry / storing contact message
        setTimeout(() => {
            setSubmitting(false);
            setSubmitted(true);
            showToast({
                icon: 'success',
                title: 'Message Sent!',
                text: 'Thank you for reaching out. We will get back to you within 24 to 48 hours.'
            });
            setFormData({
                name: '',
                email: '',
                category: 'general',
                subject: '',
                message: ''
            });
        }, 800);
    };

    const contactChannels = [
        {
            icon: Mail,
            title: 'Email Support',
            primary: 'support@flexspace-iloilo.vercel.app',
            secondary: 'For user bookings, technical help, and general inquiries',
            actionText: 'Write to us',
            href: 'mailto:support@flexspace-iloilo.vercel.app'
        },
        {
            icon: Building2,
            title: 'Space Provider Inquiries',
            primary: 'partnerships@flexspace.ph',
            secondary: 'For coworking space owners wanting to list their hub',
            actionText: 'Partner with us',
            href: 'mailto:partnerships@flexspace.ph'
        },
        {
            icon: Clock,
            title: 'Operating Hours',
            primary: 'Monday – Saturday: 8:00 AM – 8:00 PM PHT',
            secondary: 'Inquiries submitted outside hours are answered the next business day',
            actionText: null,
            href: null
        },
        {
            icon: MapPin,
            title: 'Location & Service Region',
            primary: 'Iloilo City, Western Visayas 5000',
            secondary: 'Serving Mandurriao, Jaro, City Proper, Molo, and La Paz',
            actionText: null,
            href: null
        }
    ];

    return (
        <div className="min-h-screen bg-white text-slate-900">
            {/* Header Hero */}
            <header className="border-b border-slate-100 bg-linear-to-b from-indigo-50/50 via-white to-white px-6 py-16 md:py-20 text-center">
                <div className="max-w-3xl mx-auto">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-600 mb-3">Get in Touch</p>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">
                        We’d love to hear from you.
                    </h1>
                    <p className="text-slate-600 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
                        Have a question about a study hub, need assistance with a reservation, or want to list your workspace on FlexSpace? We’re here to help.
                    </p>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-16">
                <div className="grid lg:grid-cols-12 gap-12 items-start">
                    
                    {/* Left Column: Direct Info & Channels */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black tracking-tight text-slate-900">Contact Details</h2>
                            <p className="text-slate-500 text-sm">
                                Reach our team directly via email or our contact channels.
                            </p>
                        </div>

                        <div className="space-y-4 pt-2">
                            {contactChannels.map((c, i) => {
                                const Icon = c.icon;
                                return (
                                    <div key={i} className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0">
                                                <Icon size={20} />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                                                <p className="text-xs font-semibold text-indigo-600 break-all">{c.primary}</p>
                                                <p className="text-xs text-slate-500 leading-relaxed">{c.secondary}</p>
                                                {c.actionText && c.href && (
                                                    <a 
                                                        href={c.href} 
                                                        className="inline-block pt-1 text-xs font-bold text-slate-800 hover:text-indigo-600 underline underline-offset-2"
                                                    >
                                                        {c.actionText} →
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Space Owners Card */}
                        <div className="p-6 rounded-3xl bg-linear-to-br from-indigo-900 to-slate-900 text-white space-y-3 shadow-lg">
                            <h3 className="text-lg font-bold">Operate a coworking space or study hub?</h3>
                            <p className="text-xs text-indigo-200 leading-relaxed">
                                Join the FlexSpace partner network in Iloilo City. Get listed, reach local students and digital nomads, and manage bookings seamlessly.
                            </p>
                            <Button asChild className="rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs mt-2">
                                <Link to="/register">
                                    List Your Workspace
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Right Column: Contact & Message Form */}
                    <div className="lg:col-span-7">
                        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm">
                            <div className="mb-6">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Send Us a Message</h2>
                                <p className="text-slate-500 text-sm mt-1">
                                    Fill out the form below and our team will get back to you promptly.
                                </p>
                            </div>

                            {submitted ? (
                                <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                                    <div className="h-12 w-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-emerald-900">Message Received</h3>
                                    <p className="text-xs text-emerald-700 max-w-md mx-auto leading-relaxed">
                                        Thank you for reaching out to FlexSpace Iloilo. We have logged your inquiry and will reply to your email address shortly.
                                    </p>
                                    <Button 
                                        variant="outline"
                                        onClick={() => setSubmitted(false)}
                                        className="mt-4 rounded-xl text-xs font-bold"
                                    >
                                        Send Another Message
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Your Name *</label>
                                            <input
                                                type="text"
                                                name="name"
                                                required
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder="e.g. Maria Santos"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Your Email *</label>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="e.g. maria@example.com"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Inquiry Topic</label>
                                            <select
                                                name="category"
                                                value={formData.category}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white transition-all"
                                            >
                                                <option value="general">General Question</option>
                                                <option value="booking">Booking / Reservation Assistance</option>
                                                <option value="listing">Listing a Coworking Space</option>
                                                <option value="technical">Technical Support / Bug Report</option>
                                                <option value="partnership">Partnerships & Media</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subject</label>
                                            <input
                                                type="text"
                                                name="subject"
                                                value={formData.subject}
                                                onChange={handleChange}
                                                placeholder="Brief summary of your inquiry"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Message *</label>
                                        <textarea
                                            name="message"
                                            required
                                            rows={5}
                                            value={formData.message}
                                            onChange={handleChange}
                                            placeholder="Please describe how we can assist you..."
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <Button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all"
                                        >
                                            {submitting ? 'Sending...' : (
                                                <span className="flex items-center gap-2">
                                                    <Send size={15} /> Submit Inquiry
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Contact;