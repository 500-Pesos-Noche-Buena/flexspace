import React from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Coffee, Wifi, CreditCard, MapPin } from "lucide-react";

const FAQ = () => {
    const faqData = [
        {
            question: "How do I find 24/7 study hubs in Iloilo?",
            answer: "You can use our 'Filter' tool on the Explore page to select 'Open 24/7'. Popular spots in Jaro and Mandurriao often offer overnight sessions for students and night-shift workers.",
            icon: <MapPin className="w-4 h-4" />
        },
        {
            question: "Are the rates listed on FlexSpace accurate?",
            answer: "We update our database monthly. However, rates for 'hourly' vs 'daily' passes can change. We recommend checking the specific hub's Facebook page via the link provided in our details section.",
            icon: <CreditCard className="w-4 h-4" />
        },
        {
            question: "Do I need to book a slot in advance?",
            answer: "For most study hubs like Homework or ThinkSpace, walk-ins are welcome. However, for private meeting rooms or peak exam weeks, we suggest calling ahead using the contact info on our platform.",
            icon: <HelpCircle className="w-4 h-4" />
        },
        {
            question: "Which hubs have the fastest Wi-Fi for online classes?",
            answer: "Hubs in the Megaworld (Mandurriao) area generally have high-speed fiber connections. Look for the 'Fiber Internet' tag on our listings for the best experience.",
            icon: <Wifi className="w-4 h-4" />
        },
        {
            question: "Is outside food allowed in these hubs?",
            answer: "Most study hubs allow outside snacks, but some designated 'Study Cafes' require you to purchase from their menu. Check the 'Amenities' list on our hub profiles for specific house rules.",
            icon: <Coffee className="w-4 h-4" />
        }
    ];

    return (
        <div className="min-h-screen bg-[#fafafa] py-20 px-6">
            <div className="max-w-3xl mx-auto space-y-12">
                
                {/* Header */}
                <div className="text-center space-y-4">
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 uppercase tracking-widest text-[10px] px-3 py-1">
                        Support Center
                    </Badge>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Got Questions? <br/><span className="text-indigo-600">We've got answers.</span></h1>
                    <p className="text-slate-500 font-medium">Everything you need to know about finding your next workstation in Iloilo City.</p>
                </div>

                {/* FAQ Accordion */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                    <Accordion type="single" collapsible className="w-full">
                        {faqData.map((item, index) => (
                            <AccordionItem key={index} value={`item-${index}`} className="border-b border-slate-50 last:border-0 py-2">
                                <AccordionTrigger className="hover:no-underline hover:text-indigo-600 text-left font-bold text-slate-700 py-4 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-indigo-600">
                                            {item.icon}
                                        </div>
                                        {item.question}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-slate-500 leading-relaxed pl-12 pb-6">
                                    {item.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>

                {/* Bottom CTA */}
                <div className="text-center p-8 bg-indigo-600 rounded-4xl text-white">
                    <h3 className="font-bold text-lg mb-2">Still confused?</h3>
                    <p className="text-indigo-100 text-sm mb-6">Drop us a message and we'll help you find the perfect spot.</p>
                    <a href="mailto:flexspace260@gmail.com" className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors inline-block">
                        Contact Support
                    </a>
                </div>
            </div>
        </div>
    );
};

export default FAQ;