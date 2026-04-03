import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

const TopSpaces = ({ spaces = [] }) => {
    // Take first 4 spaces if provided, otherwise empty array
    const displaySpaces = spaces.slice(0, 4);

    return (
        <section id="top" className="py-20 bg-slate-50">
            <div className="max-w-7xl mx-auto px-6">
                <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Popular Workspaces</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {displaySpaces.map((s) => (
                        <Card key={s.id} className="overflow-hidden border-slate-100 rounded-3xl hover:shadow-xl transition-all duration-300 group cursor-pointer">
                            <CardContent className="p-4">
                                <img
                                    src={s.image ? `/uploads/spaces/${s.image}` : '/images/placeholder.jpg'}
                                    alt={s.name}
                                    className="w-full h-40 object-cover rounded-2xl mb-4 transition-transform group-hover:scale-105"
                                />
                                <h3 className="font-bold text-slate-900 tracking-tight">{s.name}</h3>
                                <p className="text-indigo-600 font-black text-sm mt-1 tracking-wide">
                                    ₱{s.rate_hour}/hr
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TopSpaces;