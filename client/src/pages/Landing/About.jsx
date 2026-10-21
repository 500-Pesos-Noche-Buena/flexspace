import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Building2, Users, MapPin, ShieldCheck, HeartHandshake, 
    Compass, Laptop, Coffee, Sparkles, CheckCircle2, ArrowRight 
} from 'lucide-react';
import { Button } from "@/components/ui/button";

const About = () => {
    useEffect(() => {
        const previousTitle = document.title;
        document.title = 'About Us | FlexSpace Iloilo';
        const description = document.querySelector('meta[name="description"]');
        const previousDescription = description?.getAttribute('content');
        description?.setAttribute('content', 'Learn about FlexSpace Iloilo, our mission to connect students, freelancers, and professionals with verified coworking spaces and study hubs across Iloilo City.');
        return () => {
            document.title = previousTitle;
            if (description && previousDescription) description.setAttribute('content', previousDescription);
        };
    }, []);

    const values = [
        {
            icon: ShieldCheck,
            title: 'Verified Listings',
            description: 'Every space listed on FlexSpace includes genuine photos, validated amenities (high-speed fiber, power backups), and accurate hourly or daily pricing.'
        },
        {
            icon: Users,
            title: 'Community-First',
            description: 'Built specifically for Iloilo City’s thriving community of university students, board examinees, remote developers, teachers, and digital nomads.'
        },
        {
            icon: HeartHandshake,
            title: 'Empowering Local Hubs',
            description: 'We partner directly with homegrown Ilonggo coworking owners and coffee-hub operators to showcase their spaces and simplify reservations.'
        },
        {
            icon: Compass,
            title: 'Hyperlocal Navigation',
            description: 'District-by-district filtering across Mandurriao, Jaro, City Proper, Molo, and La Paz to help you find workspaces right where you are.'
        }
    ];

    const districts = [
        {
            name: 'Mandurriao',
            tag: 'Business & Tech District',
            description: 'Home to Iloilo Business Park, Atria Park District, and premium corporate coworking hubs suited for remote professionals and client meetings.'
        },
        {
            name: 'Jaro',
            tag: 'Academic & Heritage Hub',
            description: 'Surrounded by top universities with budget-friendly study hubs, late-night workstations, and quiet zones for board review.'
        },
        {
            name: 'City Proper',
            tag: 'Commercial Center',
            description: 'Accessible workspaces near provincial government offices, business banks, and major transportation terminals.'
        },
        {
            name: 'Molo & La Paz',
            tag: 'Cultural & Artisan Quarters',
            description: 'Cozy, laptop-friendly cafes and community study centers with relaxed atmospheres and local artisan coffee.'
        }
    ];

    return (
        <article className="min-h-screen bg-white text-slate-900">
            {/* Header Hero */}
            <header className="border-b border-slate-100 bg-linear-to-b from-indigo-50/60 via-white to-white px-6 py-16 md:py-24">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-black tracking-widest text-indigo-600 bg-indigo-50 rounded-full uppercase">
                        <Sparkles size={14} /> Our Mission & Story
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900">
                        Bridging spaces and productivity in <span className="text-indigo-600">Iloilo City</span>.
                    </h1>
                    <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        FlexSpace was created to make finding, comparing, and booking study hubs and flexible workspaces effortless for everyone in Iloilo.
                    </p>
                </div>
            </header>

            {/* Core Mission Section */}
            <section className="max-w-4xl mx-auto px-6 py-16 space-y-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Why We Built FlexSpace
                        </h2>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            As Iloilo City continues to grow into a premiere innovation and education capital in Western Visayas, students, board reviewees, remote tech workers, and startup teams face a shared challenge: finding reliable spaces with fast WiFi, quiet desks, and stable power.
                        </p>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Traditional cafe hopping often leads to unstable internet, noisy backgrounds, and the hassle of searching for available outlets. FlexSpace centralizes Iloilo’s best independent study centers and coworking spaces into one curated, real-time discovery platform.
                        </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-8 space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Building2 className="text-indigo-600" size={20} /> Platform Highlights
                        </h3>
                        <ul className="space-y-3 text-xs text-slate-600">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                                <span><strong>Real-Time Seat & Room Availability:</strong> See open hours, peak times, and active occupancy.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                                <span><strong>Clear Amenity Audits:</strong> Know before you arrive if an establishment has backup power, fiber WiFi, or private call booths.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                                <span><strong>Package & Consumable Support:</strong> Understand whether your rate covers hourly access or food & beverage credits.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                                <span><strong>Direct Local Support:</strong> Connecting users directly with space operators for smooth bookings.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Our Guiding Values */}
                <div className="pt-8">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Our Principles
                        </h2>
                        <p className="text-slate-500 text-sm mt-2">
                            What guides every listing, feature, and partnership on FlexSpace.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                        {values.map((val) => {
                            const Icon = val.icon;
                            return (
                                <div key={val.title} className="p-6 rounded-3xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all">
                                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                                        <Icon size={22} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">{val.title}</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">{val.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* District Coverage in Iloilo */}
                <div className="pt-8">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Covering All Major Iloilo Districts
                        </h2>
                        <p className="text-slate-500 text-sm mt-2">
                            Wherever your day takes you, find a productive spot nearby.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                        {districts.map((d) => (
                            <div key={d.name} className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-black text-slate-900">{d.name}</h3>
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                        {d.tag}
                                    </span>
                                </div>
                                <p className="text-slate-600 text-xs leading-relaxed">{d.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Team & Operations */}
                <div className="pt-8 border-t border-slate-100">
                    <div className="bg-linear-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-8 sm:p-12 text-center md:text-left md:flex items-center justify-between gap-8 shadow-xl">
                        <div className="space-y-3 max-w-xl">
                            <h2 className="text-2xl sm:text-3xl font-black">Operated locally in Iloilo City</h2>
                            <p className="text-indigo-200 text-sm leading-relaxed">
                                FlexSpace is maintained by dedicated local developers and community members who care about elevating the freelance, remote work, and academic landscape of Western Visayas.
                            </p>
                            <div className="pt-2 flex flex-wrap gap-4 text-xs text-indigo-300">
                                <span className="flex items-center gap-1.5">
                                    <MapPin size={14} className="text-indigo-400" /> Iloilo City, Philippines
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Coffee size={14} className="text-indigo-400" /> Homegrown Platform
                                </span>
                            </div>
                        </div>
                        <div className="mt-6 md:mt-0 shrink-0">
                            <Button asChild className="rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-bold px-6 py-6 shadow-lg">
                                <Link to="/spaces" className="flex items-center gap-2">
                                    Explore Hubs <ArrowRight size={16} />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </article>
    );
};

export default About;
