import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const Contact = () => {
    return (
        <section id="contact" className="py-24 bg-white text-center border-t border-slate-50">
            <div className="max-w-3xl mx-auto px-6">
                <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">
                    Have a workspace?
                </h2>
                <p className="text-slate-500 text-lg mb-10 font-medium">
                    Join the Iloilo Work network and reach more clients in the community.
                </p>
                <Button asChild size="lg" className="rounded-2xl h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-200 transition-all active:scale-95">
                    <Link to="/register">
                        List Your Space
                    </Link>
                </Button>
            </div>
        </section>
    );
};

export default Contact;