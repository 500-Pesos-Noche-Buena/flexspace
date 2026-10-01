import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, MapPin, Users, Wifi } from 'lucide-react';

const sections = [
    {
        icon: MapPin,
        title: 'Choose the location around your actual day',
        body: 'Start with the places you must reach before and after work. A workspace close to school, a client meeting, public transport, or home can save more time than a slightly cheaper room across the city. FlexSpace groups listings by Iloilo district so you can compare nearby options before travelling.'
    },
    {
        icon: Wifi,
        title: 'Check the tools your work really needs',
        body: 'A video meeting needs dependable internet and a quiet background. Group study may need a whiteboard and a room where conversation is allowed. Long sessions need comfortable seating, power outlets, drinking water, and clear break rules. Review each listing’s stated amenities and contact the space when a requirement is essential.'
    },
    {
        icon: Users,
        title: 'Match the room to the number of guests',
        body: 'Room pricing can depend on capacity. Enter the correct number of guests so the displayed option matches the group using it. Avoid booking a larger room only for appearance, but leave enough space for laptops, documents, and movement. The booking summary should show the selected room, guest count, schedule, and price before payment.'
    },
    {
        icon: Clock3,
        title: 'Compare the complete session cost',
        body: 'An hourly rate is only one part of the total. Check minimum durations, package inclusions, consumable allowances, overtime rules, voucher discounts, and payment timing. For packages with consumables, the included allowance covers eligible orders up to its limit; any amount above the allowance becomes an additional charge at checkout.'
    }
];

const checklist = [
    'Confirm the date, start time, duration, and expected number of guests.',
    'Read the listing description and compare the amenities needed for your task.',
    'Review room rules, cancellation terms, and the accepted payment methods.',
    'Check whether a package includes consumables and understand its allowance.',
    'Keep the booking reference and review the final receipt after checkout.'
];

const WorkspaceGuide = () => {
    useEffect(() => {
        const previousTitle = document.title;
        document.title = 'How to Choose a Coworking Space in Iloilo | FlexSpace Guide';
        const description = document.querySelector('meta[name="description"]');
        const previousDescription = description?.getAttribute('content');
        description?.setAttribute('content', 'A practical guide to comparing coworking spaces, study hubs, meeting rooms, schedules, amenities, and package costs in Iloilo City.');
        return () => {
            document.title = previousTitle;
            if (description && previousDescription) description.setAttribute('content', previousDescription);
        };
    }, []);

    return (
        <article className="bg-white text-slate-900">
            <header className="border-b border-slate-100 bg-linear-to-b from-indigo-50 to-white px-6 py-16 md:py-24">
                <div className="mx-auto max-w-4xl">
                    <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">FlexSpace local guide</p>
                    <h1 className="text-4xl font-black tracking-tight md:text-6xl">How to choose a workspace in Iloilo City</h1>
                    <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
                        The best workspace is the one that fits the work you need to finish, the people joining you, and the total amount you plan to spend. This guide explains what to compare before making a booking through FlexSpace.
                    </p>
                </div>
            </header>

            <div className="mx-auto max-w-4xl space-y-16 px-6 py-16">
                <section aria-labelledby="comparison-heading">
                    <h2 id="comparison-heading" className="text-3xl font-black tracking-tight">Four decisions to make before booking</h2>
                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                        {sections.map(({ icon: Icon, title, body }) => (
                            <div key={title} className="rounded-3xl border border-slate-200 p-7 shadow-sm">
                                <Icon className="mb-5 text-indigo-600" aria-hidden="true" />
                                <h3 className="text-xl font-bold">{title}</h3>
                                <p className="mt-3 leading-7 text-slate-600">{body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-3xl bg-slate-950 p-8 text-white md:p-12" aria-labelledby="pricing-heading">
                    <h2 id="pricing-heading" className="text-3xl font-black tracking-tight">Understanding rooms with consumable packages</h2>
                    <div className="mt-6 space-y-4 leading-7 text-slate-300">
                        <p>A package price may include both use of the room and a consumable allowance. The allowance is the amount available for eligible food, drinks, or other products attached to that booking. It is not a separate cash refund.</p>
                        <p>For example, if a two-hour package costs ₱900 and includes up to ₱900 in eligible consumables, orders totaling ₱800 remain within the package. If the orders reach ₱1,000, the extra ₱100 is added to the final bill. The booking receipt should show the room or package charge, consumables ordered, amount covered, excess amount, other charges, and final payment.</p>
                        <p>Always rely on the package details displayed for the selected room. Capacity, rate, allowance, available products, and operating rules can differ between spaces.</p>
                    </div>
                </section>

                <section aria-labelledby="checklist-heading">
                    <h2 id="checklist-heading" className="text-3xl font-black tracking-tight">A quick booking checklist</h2>
                    <ul className="mt-7 space-y-4">
                        {checklist.map(item => (
                            <li key={item} className="flex gap-3 text-slate-700">
                                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} aria-hidden="true" />
                                <span className="leading-7">{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="border-t border-slate-200 pt-12" aria-labelledby="responsible-heading">
                    <h2 id="responsible-heading" className="text-3xl font-black tracking-tight">Use listing information responsibly</h2>
                    <div className="mt-6 space-y-4 leading-7 text-slate-600">
                        <p>FlexSpace helps customers discover and compare participating workspaces. Prices, opening hours, capacity, amenities, and availability are supplied or maintained through each space’s listing and can change. Confirm time-sensitive requirements with the space before travelling.</p>
                        <p>Reviews are useful when they describe a specific visit, but one review should not decide the booking by itself. Compare recent feedback, the details published by the operator, and your own requirements. After a completed visit, an honest review helps other customers make a better-informed choice.</p>
                    </div>
                    <div className="mt-10 flex flex-wrap gap-4">
                        <Link to="/spaces" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700">
                            Compare workspaces <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                        <Link to="/faq" className="inline-flex items-center rounded-2xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                            Read booking FAQs
                        </Link>
                    </div>
                </section>
            </div>
        </article>
    );
};

export default WorkspaceGuide;
