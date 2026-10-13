import type { Metadata } from 'next'
import Link from 'next/link'
import { webUrl } from '@/lib/host'

export const metadata: Metadata = {
    title: 'Storefronts are getting their own home',
    description:
        'Menengai Storefronts is moving out of the mcloud.co.ke dashboard. What changes, what stays the same, and what you need to do.',
    alternates: { canonical: '/moving' },
}

const STAYS = [
    ['Your site address', 'app.mcloud.co.ke/your-site and shop.mcloud.co.ke/your-site both keep working, and so do the links and QR codes you have already shared.'],
    ['Your custom domain', 'Domains you have connected keep serving your site. Nothing to reconnect.'],
    ['Your data', 'Products, services, pages, orders, customers and team members stay exactly as they are.'],
    ['Your payments', 'M-PESA and other payment setup keep working, and so do orders in progress.'],
]

const CHANGES = [
    ['Managing your site', 'Settings, the editor, orders and analytics already live at app.mcloud.co.ke. Old mcloud.co.ke settings links forward you here.'],
    ['Creating a new site', 'Start from app.mcloud.co.ke/start instead of the stores page on mcloud.co.ke.'],
    ['Where it lives', 'Storefronts will move to a domain of their own. We have no date to share yet, and this page will be updated when we do.'],
]

const FAQ = [
    ['Do I need to do anything?', 'No. Your site keeps running and you can keep managing it. If you want, bookmark app.mcloud.co.ke.'],
    ['Will my links break?', 'No. Addresses that exist today are kept working, including the older shop.mcloud.co.ke ones.'],
    ['Will I have to sign in again?', 'Possibly, once, when storefronts move to their own domain. Browsers keep sign-in per domain, so a new domain can mean a fresh sign-in with the same account.'],
    ['Where do billing, my wallet and servers go?', 'For now they stay on mcloud.co.ke, in your organisation. Your site’s plan is still managed from there.'],
    ['Who do I ask if something looks wrong?', 'Contact support using the button below and mention your site\u2019s address.'],
]

export default function MovingPage() {
    return (
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <p className="text-sm font-medium text-primary">What&rsquo;s changing</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Storefronts are getting their own home</h1>
            <p className="mt-5 text-lg text-muted-foreground">
                Menengai Storefronts, the part of Menengai Cloud that runs your shop or NGO site, is separating from the
                mcloud.co.ke dashboard. The dashboard keeps your organisation, billing, wallet and servers. Storefronts
                get a home focused on running your site.
            </p>
            <p className="mt-4 text-lg font-medium">Your site stays online and you do not need to do anything.</p>

            <h2 className="mt-14 text-2xl font-semibold tracking-tight">What stays the same</h2>
            <dl className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card">
                {STAYS.map(([t, d]) => (
                    <div key={t} className="grid gap-1 p-5 sm:grid-cols-[11rem_1fr] sm:gap-6">
                        <dt className="font-medium">{t}</dt>
                        <dd className="text-muted-foreground">{d}</dd>
                    </div>
                ))}
            </dl>

            <h2 className="mt-14 text-2xl font-semibold tracking-tight">What changes</h2>
            <dl className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card">
                {CHANGES.map(([t, d]) => (
                    <div key={t} className="grid gap-1 p-5 sm:grid-cols-[11rem_1fr] sm:gap-6">
                        <dt className="font-medium">{t}</dt>
                        <dd className="text-muted-foreground">{d}</dd>
                    </div>
                ))}
            </dl>

            <h2 className="mt-14 text-2xl font-semibold tracking-tight">Questions</h2>
            <div className="mt-5 space-y-6">
                {FAQ.map(([q, a]) => (
                    <div key={q}>
                        <h3 className="font-medium">{q}</h3>
                        <p className="mt-1 text-muted-foreground">{a}</p>
                    </div>
                ))}
            </div>

            <div className="mt-12 flex flex-wrap gap-3">
                <Link href="/start" className="rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground hover:opacity-90">
                    Go to my sites
                </Link>
                <a href={webUrl('/support')} className="rounded-md border border-border px-5 py-3 font-medium hover:bg-muted">
                    Contact support
                </a>
            </div>
        </div>
    )
}
