import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const Contact = () => {
    return (
        <section id="contact" className="py-14 md:py-24 bg-white text-center border-t border-slate-50">
            <div className="max-w-3xl mx-auto px-6">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 md:mb-4 tracking-tighter">
                    Have a workspace?
                </h2>
                <p className="text-slate-500 text-sm md:text-lg mb-8 md:mb-10 font-medium max-w-70 md:max-w-none mx-auto leading-relaxed">
                    Join the FlexSpace network and reach more clients in the community.
                </p>
                
                <Button 
                    asChild 
                    className="rounded-2xl h-12 md:h-14 px-8 md:px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base md:text-lg shadow-xl shadow-indigo-200 transition-all active:scale-95 w-full md:w-auto"
                >
                    <Link to="/register">
                        List Your Space
                    </Link>
                </Button>
            </div>
        </section>
    );
};

export default Contact;