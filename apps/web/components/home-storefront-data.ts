// The storefront half of the mcloud.co.ke home page (home-client.tsx): features, steps, plans and
// answers. Prices and limits are read from @mcloud/merchant/plans so this page cannot quote a plan
// the product does not sell. Tested in home-storefront-data.test.ts.

import { PLAN_LIMITS, PLAN_PRICE_KES, type Plan } from '@mcloud/merchant/plans'

export type FaqEntry = { q: string; a: string }

export type Feature = {
    icon: string
    eyebrow: string
    title: string
    body: string
    image?: string
    points: string[]
}

export type Step = {
    step: string
    title: string
    body: string
}

export type PlanTier = {
    name: string
    price: string
    cadence?: string
    blurb: string
    cta: string
    href: string
    highlight?: boolean
    features: string[]
}

export type FeatureRow = {
    label: string
    values: (string | boolean)[]
}

const kes = (n: number) => `KES ${n.toLocaleString('en-KE')}`
const count = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-KE') : 'Unlimited')
const PLANS: Plan[] = ['free', 'hobby', 'pro']
const each = <T,>(fn: (plan: Plan) => T): T[] => PLANS.map(fn)

export const STORE_FEATURES: Feature[] = [
    {
        icon: 'storefront',
        eyebrow: 'Ready to sell',
        title: 'A shop your customers can trust.',
        body: 'Products, services, cart, checkout and orders in one place, on a site that looks like your business. You bring what you sell; the rest is already connected.',
        image: '/digital-warehouse.webp',
        points: [
            'Products, services and collections',
            'A checkout built for your store',
            'Pages that tell your story',
        ],
    },
    {
        icon: 'palette',
        eyebrow: 'Your brand',
        title: 'It looks like you, not a template.',
        body: 'Your logo, colours, photos and words, and your own domain when you are ready. Customers see your business, not ours.',
        image: '/make-it-yours.webp',
        points: [
            'Themes, colours and fonts in a visual editor',
            'Your own domain with the certificate handled (Hobby and up)',
            'No MCloud branding on Pro',
        ],
    },
    {
        icon: 'payments',
        eyebrow: 'Paid by M-PESA',
        title: 'Money straight to your till.',
        body: 'Customers pay your own M-PESA till or paybill. On Hobby and up, they get an STK prompt on their phone and the order marks itself paid once Safaricom confirms it.',
        image: '/run-it-online.webp',
        points: [
            'Your till or paybill, your money',
            'Automatic STK prompts on Hobby and up',
            'Every order and payment in one list',
        ],
    },
    {
        icon: 'insights',
        eyebrow: 'What is working',
        title: 'See what sells.',
        body: 'Visits, orders, your best products and where customers drop off before paying, so your next promotion is a decision, not a guess.',
        image: '/see-what-works.webp',
        points: [
            'Sales and visits in one view',
            'Your best sellers at a glance',
            'Where customers stop before paying (Hobby and up)',
        ],
    },
]

export const STORE_STEPS: Step[] = [
    {
        step: '01',
        title: 'Name your shop',
        body: 'Pick its address. It goes live straight away on a free mcloud.co.ke address.',
    },
    {
        step: '02',
        title: 'Add what you sell',
        body: 'A name, a price and a photo are enough. Add your logo and colours in the editor.',
    },
    {
        step: '03',
        title: 'Share it and get paid',
        body: 'Add your till or paybill, share your link on WhatsApp and Instagram, and take your first order.',
    },
]

// The /org/* CTAs on this page are plain <a>s: those paths redirect from route handlers,
// which client navigation can't follow.
export const STORE_PLANS: PlanTier[] = [
    {
        name: 'Free',
        price: 'KES 0',
        cadence: 'forever',
        blurb: 'Get your shop live and take your first orders.',
        cta: 'Start free',
        href: '/org/stores?new=1',
        features: [
            'A shop on a free mcloud.co.ke address',
            `${count(PLAN_LIMITS.free.products)} products, ${count(PLAN_LIMITS.free.monthlyOrders)} orders a month`,
            'M-PESA by till or paybill code',
            'Order management',
        ],
    },
    {
        name: 'Hobby',
        price: kes(PLAN_PRICE_KES.hobby),
        cadence: 'per month',
        blurb: 'Your own domain, automatic M-PESA and analytics.',
        cta: 'Choose Hobby',
        href: '/org/stores?new=1',
        highlight: true,
        features: [
            'Everything in Free',
            `${count(PLAN_LIMITS.hobby.products)} products, ${count(PLAN_LIMITS.hobby.monthlyOrders)} orders a month`,
            'Automatic M-PESA (STK prompt)',
            'Your own domain',
            'Analytics, blog and content pages',
        ],
    },
    {
        name: 'Pro',
        price: kes(PLAN_PRICE_KES.pro),
        cadence: 'per month',
        blurb: 'No limits, no MCloud branding, priority help.',
        cta: 'Choose Pro',
        href: '/org/stores?new=1',
        features: [
            'Everything in Hobby',
            'Unlimited products and orders',
            'No MCloud branding',
            'Priority support',
        ],
    },
]

export const STORE_MATRIX: { plans: string[]; rows: FeatureRow[] } = {
    plans: ['Free', 'Hobby', 'Pro'],
    rows: [
        { label: 'Products', values: each((p) => count(PLAN_LIMITS[p].products)) },
        { label: 'Orders a month', values: each((p) => count(PLAN_LIMITS[p].monthlyOrders)) },
        { label: 'Team members', values: each((p) => count(PLAN_LIMITS[p].members)) },
        { label: 'M-PESA to your till or paybill', values: [true, true, true] },
        // STK push is gated on Hobby in the storefront's payment settings.
        { label: 'Automatic M-PESA (STK prompt)', values: [false, true, true] },
        { label: 'Your own domain', values: each((p) => PLAN_LIMITS[p].features.customDomain) },
        { label: 'Analytics', values: each((p) => PLAN_LIMITS[p].features.advancedAnalytics) },
        { label: 'Blog and content pages', values: each((p) => PLAN_LIMITS[p].features.blogPages) },
        { label: 'Remove our branding', values: each((p) => PLAN_LIMITS[p].features.removeBranding) },
        { label: 'Priority support', values: each((p) => PLAN_LIMITS[p].features.prioritySupport) },
    ],
}

export const STORE_FAQS: FaqEntry[] = [
    {
        q: 'Does the money go through MCloud?',
        a: "No. Customers pay your own M-PESA till or paybill, and you connect your own Safaricom keys, so the money lands in your account directly. We don't take a cut of your sales; Safaricom's usual charges still apply.",
    },
    {
        q: 'Will a till number work?',
        a: 'Yes, a till or a paybill. On Free, customers pay with your till or paybill and enter the code. On Hobby and up, they get an STK prompt; that needs your till or paybill registered on Safaricom Daraja, and the guide walks you through it.',
    },
    {
        q: 'Can I use my own domain?',
        a: 'Yes, on Hobby and Pro. Point yourbrand.co.ke at your shop from the dashboard; the security certificate is set up for you.',
    },
    {
        q: 'Do I need a card to start?',
        a: 'No. The Free plan has no card and no trial countdown. When you upgrade, you top up with M-PESA and your plan renews from that balance each month.',
    },
    {
        q: 'Can I run more than one shop?',
        a: 'Yes. One account can run several shops or non-profit sites, each with its own plan, settings and team.',
    },
]
