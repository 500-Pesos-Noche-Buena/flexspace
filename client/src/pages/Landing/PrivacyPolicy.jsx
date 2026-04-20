import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ShieldCheck,
    Fingerprint,
    Lock,
    Eye,
    Globe,
    Gavel,
    ArrowRight,
    Mail
} from "lucide-react";

const PrivacyDashboard = () => {
    const navItems = [
        { name: 'Data Collection', id: 'data-collection' },
        { name: 'AdSense & Cookies', id: 'adsense-cookies' },
        { name: 'Your Rights', id: 'your-rights' },
        { name: 'Privacy Standards', id: 'privacy-standards' },
        { name: 'Contact Us', id: 'contact' }
    ];

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-indigo-100 scroll-smooth">
            {/* Header Section */}
            <header className="bg-white/80 border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <Lock className="w-4 h-4 text-white" />
                        </div>
                        <span>FlexSpace <span className="text-indigo-600">Privacy</span></span>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 uppercase tracking-widest text-[10px]">
                        RA 10173 Standards
                    </Badge>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* Left Sidebar - Navigation */}
                <aside className="lg:col-span-3 space-y-6 hidden lg:block">
                    <div className="sticky top-28">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">On this page</h4>
                        <nav className="flex flex-col gap-1">
                            {navItems.map((item) => (
                                <a
                                    key={item.id}
                                    href={`#${item.id}`}
                                    className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all flex items-center justify-between group"
                                >
                                    {item.name}
                                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="lg:col-span-9 space-y-24"> {/* Increased space-y for better scroll distinctness */}

                    {/* Hero Summary */}
                    <section className="space-y-4 pt-4">
                        <h1 className="text-5xl font-black tracking-tight text-slate-900 lg:text-6xl">
                            We protect your <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-violet-600">digital space.</span>
                        </h1>
                        <p className="text-xl text-slate-500 max-w-2xl leading-relaxed">
                            At FlexSpace, we believe privacy is a fundamental right. This policy explains how we handle your data under the <strong>Data Privacy Act of 2012</strong>.
                        </p>
                    </section>

                    {/* Quick Stats / Scorecard */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-none shadow-sm bg-indigo-50">
                            <CardContent className="p-6">
                                <Fingerprint className="w-6 h-6 text-indigo-600 mb-2" />
                                <h3 className="font-bold">Zero Sale</h3>
                                <p className="text-xs text-indigo-700/70">We never sell your personal data to third parties.</p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm bg-slate-900 text-white">
                            <CardContent className="p-6">
                                <Globe className="w-6 h-6 text-indigo-400 mb-2" />
                                <h3 className="font-bold">Transparency</h3>
                                <p className="text-xs text-slate-400">Clear information on how Google AdSense uses cookies.</p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm bg-white border border-slate-100">
                            <CardContent className="p-6">
                                <Gavel className="w-6 h-6 text-indigo-600 mb-2" />
                                <h3 className="font-bold">Legal Alignment</h3>
                                <p className="text-xs text-slate-500">Adhering to the principles of the PH Data Privacy Act.</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Separator className="bg-slate-200" />

                    {/* Policy Sections */}
                    <div className="space-y-20">
                        {/* Section 01 */}
                        <section id="data-collection" className="space-y-4 scroll-mt-24">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                                <h2 className="text-2xl font-bold italic tracking-tight">01. Data Collection</h2>
                            </div>
                            <p className="text-slate-600 leading-relaxed text-lg">
                                We collect your email and name when you inquire about a hub. For our **Iloilo City Hub Finder**,
                                we use temporary session data to locate spaces near you. This location data is never stored permanently on our servers.
                            </p>
                        </section>

                        {/* Section 02 */}
                        <section id="adsense-cookies" className="space-y-4 p-8 rounded-2xl bg-linear-to-br from-white to-slate-50 border border-slate-200 shadow-inner scroll-mt-24">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <Eye className="w-6 h-6" />
                                <h2 className="text-2xl font-bold tracking-tight">02. AdSense & Cookies</h2>
                            </div>
                            <p className="text-slate-600 leading-relaxed">
                                As a Google AdSense partner, we use cookies to serve relevant ads. Google’s use of advertising cookies enables it and its partners to serve ads based on your visit to <strong>FlexSpace</strong>.
                                You can opt-out at any time via Google’s ad settings.
                            </p>
                        </section>

                        {/* Section 03 - Your Rights */}
                        <section id="your-rights" className="space-y-6 scroll-mt-24">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                                <h2 className="text-2xl font-bold italic tracking-tight">03. Your Rights</h2>
                            </div>
                            <p className="text-slate-600 leading-relaxed">
                                Under the Data Privacy Act of 2012, you have the right to be informed, to object, to access, to rectify,
                                and to erase your personal information. If you wish to exercise these rights, please reach out to our team.
                            </p>
                        </section>

                        <section id="privacy-standards" className="space-y-6 scroll-mt-24">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest">
                                National Privacy Commission Guidelines
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">RA 10173 Alignment</h2>

                            <p className="text-slate-600 leading-relaxed max-w-3xl">
                                We are committed to the security of your data. FlexSpace PH adheres to the core
                                principles of the <strong>Data Privacy Act of 2012</strong>, ensuring your personal
                                information is handled with transparency and care.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { title: "Right to be Informed", desc: "You have the right to know how your data is collected and processed." },
                                    { title: "Right to Object", desc: "You can withhold consent to the processing of your personal data." },
                                    { title: "Right to Access", desc: "Request a clear transcript of any personal data we hold in our system." },
                                    { title: "Right to Rectification", desc: "The power to correct any inaccuracies in your personal information." }
                                ].map((right, i) => (
                                    <div key={i} className="group p-5 border border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all duration-300">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-600 group-hover:scale-150 transition-transform" />
                                            <h4 className="font-bold text-slate-800 tracking-tight">{right.title}</h4>
                                        </div>
                                        <p className="text-sm text-slate-500 leading-relaxed">{right.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Footer Contact */}
                    <footer id="contact" className="pt-12 border-t border-slate-200 text-center space-y-6 scroll-mt-24 pb-20">
                        <div className="flex justify-center">
                            <div className="p-4 bg-indigo-50 rounded-full">
                                <Mail className="w-8 h-8 text-indigo-600" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-slate-400 text-sm italic font-medium uppercase tracking-wider">Inquiries for Iloilo City Hubs</p>
                            <a href="mailto:flexspace260@gmail.com" className="text-3xl font-black text-slate-900 hover:text-indigo-600 transition-colors">
                                flexspace260@gmail.com
                            </a>
                        </div>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto">
                            FlexSpace and its affiliates operate under the laws of the Republic of the Philippines.
                        </p>
                    </footer>
                </div>
            </main>
        </div>
    );
};

export default PrivacyDashboard;