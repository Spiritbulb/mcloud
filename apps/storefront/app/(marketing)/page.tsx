import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, Globe, Palette, Smartphone, BarChart3, Users, HeartHandshake, ShoppingBag } from 'lucide-react'
import { PLAN_LIMITS, PLAN_PRICE_KES } from '@mcloud/merchant/plans'

export const metadata: Metadata = {
    alternates: { canonical: '/' },
}

const STEPS = [
    { n: '01', title: 'Create your site', body: 'Pick shop or NGO, name it, and choose its address. It is live right away on a free address.' },
    { n: '02', title: 'Make it yours', body: 'Use the visual editor to set your brand, arrange sections and add your products, programs or campaigns.' },
    { n: '03', title: 'Get paid', body: 'Connect M-PESA and start taking orders or donations. Add your own domain when you are ready.' },
]

const FEATURES = [
    { icon: Smartphone, title: 'M-PESA built in', body: 'STK Push checkout for orders and donations, confirmed with the provider before an order counts as paid.' },
    { icon: Palette, title: 'A real visual editor', body: 'Edit sections and theme with a live preview of your actual site. No code, no developer.' },
    { icon: Globe, title: 'Your own domain', body: 'Serve your site from yourbrand.co.ke with SSL handled for you.' },
    { icon: BarChart3, title: 'Know what works', body: 'See visits, orders and where customers drop off.' },
    { icon: Users, title: 'Work as a team', body: 'Invite people to help run the site, with owner and admin roles.' },
    { icon: ShoppingBag, title: 'Products and services', body: 'Sell goods, book services, group them in collections and take reviews.' },
]

const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-KE') : 'Unlimited')

const PLANS = [
    { id: 'free', name: 'Free', price: 'KES 0', blurb: 'Launch your first site and start taking orders.' },
    { id: 'hobby', name: 'Hobby', price: `KES ${PLAN_PRICE_KES.hobby.toLocaleString('en-KE')}`, blurb: 'Your own domain and deeper insight.' },
    { id: 'pro', name: 'Pro', price: `KES ${PLAN_PRICE_KES.pro.toLocaleString('en-KE')}`, blurb: 'No platform branding, priority help.', highlight: true },
] as const

function planLines(id: 'free' | 'hobby' | 'pro'): string[] {
    const p = PLAN_LIMITS[id]
    return [
        `${fmt(p.products)} products`,
        `${fmt(p.monthlyOrders)} orders a month`,
        `${p.members} team ${p.members === 1 ? 'member' : 'members'}`,
        ...(p.features.customDomain ? ['Your own domain'] : []),
        ...(p.features.advancedAnalytics ? ['Analytics'] : []),
        ...(p.features.blogPages ? ['Blog and content pages'] : []),
        ...(p.features.removeBranding ? ['No Menengai branding'] : []),
        ...(p.features.prioritySupport ? ['Priority support'] : []),
    ]
}

export default function Home() {
    return (
        <>
            <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
                <p className="mb-4 text-sm font-medium text-primary">MCloud Storefronts</p>
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
                    Your store, live in minutes.
                </h1>
                <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
                    Hosted websites for Kenyan businesses, with M-PESA checkout, a visual editor and
                    your own domain when you are ready.
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

            <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:grid-cols-2 sm:px-6">
                <div className="rounded-2xl border border-border bg-card p-6">
                    <ShoppingBag className="mb-4 size-6 text-primary" aria-hidden />
                    <h2 className="text-xl font-semibold">For shops</h2>
                    <p className="mt-2 text-muted-foreground">
                        A storefront with products, services, a cart and M-PESA checkout. Manage orders and customers from one place.
                    </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6">
                    <HeartHandshake className="mb-4 size-6 text-primary" aria-hidden />
                    <h2 className="text-xl font-semibold">For organizations</h2>
                    <p className="mt-2 text-muted-foreground">
                        A site that tells your mission, shows your programs and impact.
                    </p>
                </div>
            </section>

            <section id="how" className="border-y border-border bg-muted/30">
                <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">From idea to live site in three steps</h2>
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

            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Everything a small business site needs</h2>
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map(({ icon: Icon, title, body }) => (
                        <div key={title}>
                            <Icon className="mb-3 size-5 text-primary" aria-hidden />
                            <h3 className="font-semibold">{title}</h3>
                            <p className="mt-1 text-muted-foreground">{body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section id="pricing" className="border-t border-border bg-muted/30">
                <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Simple pricing</h2>
                    <p className="mt-2 text-muted-foreground">Prices are per store, per month, in KES, paid from your organisation wallet when you upgrade.</p>
                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {PLANS.map((p) => (
                            <div
                                key={p.id}
                                className={`flex flex-col rounded-2xl border bg-card p-6 ${'highlight' in p && p.highlight ? 'border-primary' : 'border-border'}`}
                            >
                                <h3 className="text-lg font-semibold">{p.name}</h3>
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

            <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready when you are</h2>
                <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
                    It takes a couple of minutes to have a site you can share.
                </p>
                <Link href="/start" className="mt-6 inline-block rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90">
                    Start free
                </Link>
                <p className="mt-6 text-sm text-muted-foreground">
                    Already have a site on Menengai Cloud?{' '}
                    <Link href="/moving" className="underline underline-offset-4 hover:text-foreground">
                        See what&rsquo;s changing
                    </Link>
                    .
                </p>
            </section>
        </>
    )
}
