import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, Globe, Palette, Smartphone, BarChart3, Users, HeartHandshake, ShoppingBag } from 'lucide-react'
import { PLAN_LIMITS, PLAN_PRICE_KES } from '@mcloud/merchant/plans'

export const metadata: Metadata = {
    alternates: { canonical: '/' },
}

const STEPS = [
    { n: '01', title: 'Name your site', body: 'Choose a shop or a non-profit site and pick its address. It goes live straight away on a free mcloud.co.ke address.' },
    { n: '02', title: 'Make it look like you', body: 'Add your logo, colours and photos in the visual editor, then your products, services or campaigns.' },
    { n: '03', title: 'Share it and get paid', body: 'Add your till or paybill and share your link on WhatsApp and Instagram. Customers pay you by M-PESA.' },
]

/** `plan` marks features a paid plan unlocks, so nobody meets a lock they were not told about. */
const FEATURES: { icon: typeof Smartphone; title: string; body: string; plan?: string }[] = [
    { icon: Smartphone, title: 'M-PESA to your own till', body: 'Customers pay your till or paybill directly. On Hobby and up, they get an STK prompt on their phone and paid orders confirm themselves.' },
    { icon: Palette, title: 'A visual editor', body: 'Change sections, colours and fonts with a live preview of your real site. No code, no developer.' },
    { icon: ShoppingBag, title: 'Products and services', body: 'Sell goods or take bookings, group them into collections, and collect reviews.' },
    { icon: Globe, title: 'Your own domain', body: 'Use yourbrand.co.ke, with the security certificate handled for you.', plan: 'Hobby' },
    { icon: BarChart3, title: 'See what sells', body: 'Visits, orders and where customers drop off before paying.', plan: 'Hobby' },
    { icon: Users, title: 'Bring your team', body: 'Invite people to help run the site, as owners or admins.', plan: 'Hobby' },
]

const FAQ = [
    { q: 'Does the money go through MCloud?', a: 'No. Customers pay your own M-PESA till or paybill, so the money lands in your account directly.' },
    { q: 'Do you take a cut of my sales?', a: "No. We don't take a cut of your sales. Safaricom's usual M-PESA charges still apply." },
    { q: 'Will a till number work, or do I need a paybill?', a: 'Either works. Automatic STK payments need your till or paybill registered on Safaricom Daraja; we walk you through it.' },
    { q: 'Do I need a card to start?', a: 'No. The Free plan needs no card. When you upgrade, you top up with M-PESA and the plan renews from that balance each month.' },
    { q: 'Can I use my own domain later?', a: 'Yes. Start on a free mcloud.co.ke address and connect yourbrand.co.ke whenever you are ready, on Hobby or Pro.' },
]

const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-KE') : 'Unlimited')

const PLANS = [
    { id: 'free', name: 'Free', price: 'KES 0', blurb: 'Get your site live and take your first orders.' },
    { id: 'hobby', name: 'Hobby', price: `KES ${PLAN_PRICE_KES.hobby.toLocaleString('en-KE')}`, blurb: 'Your own domain, automatic M-PESA and analytics.', highlight: true },
    { id: 'pro', name: 'Pro', price: `KES ${PLAN_PRICE_KES.pro.toLocaleString('en-KE')}`, blurb: 'No MCloud branding, no limits, priority help.' },
] as const

function planLines(id: 'free' | 'hobby' | 'pro'): string[] {
    const p = PLAN_LIMITS[id]
    return [
        `${fmt(p.products)} products`,
        `${fmt(p.monthlyOrders)} orders a month`,
        `${p.members} team ${p.members === 1 ? 'member' : 'members'}`,
        // Automatic (STK) M-PESA is gated on the Hobby plan; see payment-settings.tsx.
        id === 'free' ? 'M-PESA by till or paybill code' : 'Automatic M-PESA (STK prompt)',
        ...(p.features.customDomain ? ['Your own domain'] : []),
        ...(p.features.advancedAnalytics ? ['Analytics'] : []),
        ...(p.features.blogPages ? ['Blog and content pages'] : []),
        ...(p.features.removeBranding ? ['No MCloud branding'] : ['MCloud branding on your site']),
        ...(p.features.prioritySupport ? ['Priority support'] : []),
    ]
}

export default function Home() {
    return (
        <>
            <section className="mx-auto max-w-page px-6 pb-16 pt-16 md:px-12 sm:pt-24">
                <p className="mb-4 text-sm font-medium text-primary">MCloud Storefronts</p>
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
                    A shop website that takes M-PESA.
                </h1>
                <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
                    Sell online in Kenya with your products, your brand and payments straight to your till or
                    paybill. Free to start, live in minutes.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link href="/start" className="rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground hover:opacity-90">
                        Start free
                    </Link>
                    <Link href="#how" className="rounded-md border border-border px-5 py-3 font-medium hover:bg-muted">
                        See how it works
                    </Link>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">No card needed for the Free plan.</p>
            </section>

            <section className="mx-auto grid max-w-page gap-4 px-6 pb-16 sm:grid-cols-2 md:px-12">
                <div className="rounded-2xl border border-border bg-card p-6">
                    <ShoppingBag className="mb-4 size-6 text-primary" aria-hidden />
                    <h2 className="text-xl font-semibold">For shops</h2>
                    <p className="mt-2 text-muted-foreground">
                        Products, services, a cart and M-PESA checkout, with your orders and customers in one place.
                    </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6">
                    <HeartHandshake className="mb-4 size-6 text-primary" aria-hidden />
                    <h2 className="text-xl font-semibold">For non-profits</h2>
                    <p className="mt-2 text-muted-foreground">
                        Tell your story, show your programmes and impact, and take donations by M-PESA.
                    </p>
                </div>
            </section>

            <section id="how" className="border-y border-border bg-muted/30">
                <div className="mx-auto max-w-page px-6 py-16 md:px-12">
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Live today in three steps</h2>
                    <ol className="mt-8 grid gap-6 sm:grid-cols-3">
                        {STEPS.map((s) => (
                            <li key={s.n}>
                                <span className="font-mono text-sm text-primary">{s.n}</span>
                                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                                <p className="mt-1 text-muted-foreground">{s.body}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="mx-auto max-w-page px-6 py-16 md:px-12">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What you get</h2>
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map(({ icon: Icon, title, body, plan }) => (
                        <div key={title}>
                            <Icon className="mb-3 size-5 text-primary" aria-hidden />
                            <h3 className="font-semibold">
                                {title}
                                {plan && (
                                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 align-middle text-xs font-medium text-primary">
                                        {plan} and up
                                    </span>
                                )}
                            </h3>
                            <p className="mt-1 text-muted-foreground">{body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section id="pricing" className="border-t border-border bg-muted/30">
                <div className="mx-auto max-w-page px-6 py-16 md:px-12">
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pricing</h2>
                    <p className="mt-2 text-muted-foreground">
                        Per site, per month, in KES. Start free; when you upgrade, top up with M-PESA and your plan renews
                        from that balance each month.
                    </p>
                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {PLANS.map((p) => (
                            <div
                                key={p.id}
                                className={`flex flex-col rounded-2xl border bg-card p-6 ${'highlight' in p && p.highlight ? 'border-primary' : 'border-border'}`}
                            >
                                <h3 className="text-lg font-semibold">
                                    {p.name}
                                    {'highlight' in p && p.highlight && (
                                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 align-middle text-xs font-medium text-primary">
                                            Most popular upgrade
                                        </span>
                                    )}
                                </h3>
                                <p className="mt-1 text-3xl font-semibold tracking-tight">
                                    {p.price}
                                    {p.id !== 'free' && <span className="text-sm font-normal text-muted-foreground"> /month</span>}
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
                                <ul className="mt-5 flex-1 space-y-2 text-sm">
                                    {planLines(p.id).map((l) => (
                                        <li key={l} className="flex gap-2">
                                            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                                            {l}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/start"
                                    className="mt-6 rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium hover:bg-muted"
                                >
                                    {p.id === 'free' ? 'Start free' : 'Start free, upgrade later'}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="faq" className="mx-auto max-w-page px-6 py-16 md:px-12">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Questions people ask first</h2>
                <div className="mt-6 max-w-3xl divide-y divide-border border-y border-border">
                    {FAQ.map(({ q, a }) => (
                        <details key={q} className="group py-4">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                                {q}
                                <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>+</span>
                            </summary>
                            <p className="mt-2 text-muted-foreground">{a}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section className="border-t border-border bg-muted/30">
                <div className="mx-auto max-w-page px-6 py-16 text-center md:px-12">
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your shop could be live tonight</h2>
                    <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
                        Two questions, a couple of minutes, and you have a link to share.
                    </p>
                    <Link href="/start" className="mt-6 inline-block rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90">
                        Start free
                    </Link>
                </div>
            </section>
        </>
    )
}
