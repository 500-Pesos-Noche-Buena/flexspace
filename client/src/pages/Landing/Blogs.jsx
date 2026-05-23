import React from 'react';
import { Button } from "@/components/ui/button";

const Blogs = () => {
    return (
        <section id="blogs" className="py-14 md:py-24 bg-white text-center border-t border-slate-50">
            <div className="max-w-3xl mx-auto px-6">
                <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest text-indigo-600 uppercase bg-indigo-50 rounded-full">
                    Coming Soon
                </span>
                
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 md:mb-4 tracking-tighter">
                    Insights & Updates
                </h2>
                
                <p className="text-slate-500 text-sm md:text-lg mb-8 md:mb-10 font-medium max-w-[70%] md:max-w-none mx-auto leading-relaxed">
                    We're currently crafting expert content to help you navigate the future of work.
                </p>
                
                <Button 
                    disabled
                    className="rounded-2xl h-12 md:h-14 px-8 md:px-10 bg-slate-900 text-white font-black text-base md:text-lg shadow-xl shadow-slate-200 w-full md:w-auto opacity-70 cursor-not-allowed"
                >
                    Available Soon
                </Button>
            </div>
        </section>
    );
};

export default Blogs;