import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, UserCheck, ShieldAlert, Scale, ArrowRight } from "lucide-react";

const TermsOfService = () => {
    const navItems = [
        { name: 'Agreement', id: 'agreement' },
        { name: 'User Conduct', id: 'user-conduct' },
        { name: 'Intellectual Property', id: 'intellectual-property' },
        { name: 'Limitations', id: 'limitations' }
    ];

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-indigo-100 scroll-smooth">
            <header className="bg-white/80 border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-white" />
                        </div>
                        <span>FlexSpace <span className="text-indigo-600">Terms</span></span>
                    </div>
                    <Badge variant="outline" className="text-slate-400 border-slate-200 uppercase tracking-widest text-[10px]">
                        v1.0.0
                    </Badge>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
                <aside className="lg:col-span-3 space-y-6 hidden lg:block">
                    <div className="sticky top-28">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Legal Sections</h4>
                        <nav className="flex flex-col gap-1">
                            {navItems.map((item) => (
                                <a key={item.id} href={`#${item.id}`} className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all flex items-center justify-between group">
                                    {item.name} <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            ))}
                        </nav>
                    </div>
                </aside>

                <div className="lg:col-span-9 space-y-24">
                    <section className="space-y-4 pt-4">
                        <h1 className="text-5xl font-black tracking-tight text-slate-900">
                            Rules of the <span className="text-indigo-600">Space.</span>
                        </h1>
                        <p className="text-xl text-slate-500 max-w-2xl leading-relaxed">
                            By using FlexSpace Iloilo, you agree to these terms. We keep it simple: respect the platform, respect the hubs, and keep the data accurate.
                        </p>
                    </section>

                    <Separator />

                    <div className="space-y-20">
                        <section id="agreement" className="space-y-4 scroll-mt-24">
                            <div className="flex items-center gap-2">
                                <Scale className="text-indigo-600 w-6 h-6" />
                                <h2 className="text-2xl font-bold tracking-tight">01. Acceptance of Terms</h2>
                            </div>
                            <p className="text-slate-600 leading-relaxed italic">
                                Last Updated: April 20, 2026
                            </p>
                            <p className="text-slate-600 leading-relaxed">
                                By accessing flexspace-iloilo.vercel.app, you acknowledge that you have read and understood these Terms of Service. If you do not agree, please discontinue use of our services.
                            </p>
                        </section>

                        <section id="user-conduct" className="space-y-4 scroll-mt-24">
                            <div className="flex items-center gap-2">
                                <UserCheck className="text-indigo-600 w-6 h-6" />
                                <h2 className="text-2xl font-bold tracking-tight">02. User Conduct</h2>
                            </div>
                            <p className="text-slate-600 leading-relaxed">
                                Users are expected to provide accurate information when reviewing or listing study hubs. Any attempt to scrape our data or disrupt the service in Iloilo City is strictly prohibited.
                            </p>
                        </section>

                        <section id="intellectual-property" className="space-y-4 scroll-mt-24">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="text-indigo-600 w-6 h-6" />
                                <h2 className="text-2xl font-bold tracking-tight">03. Intellectual Property</h2>
                            </div>
                            <p className="text-slate-600 leading-relaxed">
                                All content, including the "FlexSpace" brand, logos, and UI design, are the property of Josiah Gallenero and the FlexSpace team. You may not reproduce our code or design without explicit permission.
                            </p>
                        </section>

                        <section id="limitations" className="space-y-4 scroll-mt-24">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-8 bg-slate-900 rounded-full" />
                                <h2 className="text-2xl font-bold tracking-tight">04. Limitation of Liability</h2>
                            </div>
                            <p className="text-slate-600 leading-relaxed">
                                FlexSpace is a directory. We are not responsible for the actual services provided by the co-working spaces listed on our platform. Your interactions with these businesses are at your own risk.
                            </p>
                        </section>
                    </div>

                    <footer className="pt-12 border-t border-slate-200 text-center pb-20">
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-[0.2em]">FlexSpace • Iloilo City</p>
                    </footer>
                </div>
            </main>
        </div>
    );
};

export default TermsOfService;