'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { cn } from '@mcloud/ui/utils'
import { CookieBanner } from './cookie-banner'

// ─── Types ────────────────────────────────────────────────────────────────────

type FaqEntry = { q: string; a: string }

type PlanTier = {
    name: string
    price: string
    cadence?: string
    blurb: string
    cta: string
    href: string
    highlight?: boolean
    features: string[]
}

type FeatureRow = {
    label: string
    values: (string | boolean)[]
}

type Step = { step: string; title: string; body: string }
type Feature = {
    icon: string
    title: string
    body: string
    image?: string
    eyebrow?: string
    points?: string[]
}
type Objection = { q: string; a: string }

// ─── Animation helpers ────────────────────────────────────────────────────────

function FadeIn({ children, className, delay = 0, y = 20 }: {
    children: React.ReactNode
    className?: string
    delay?: number
    y?: number
}) {
    const ref = useRef(null)
    const inView = useInView(ref, { once: true, margin: '-60px' })
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

// ─── FaqItem ──────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: FaqEntry) {
    const [open, setOpen] = useState(false)
    return (
        <div className="border-b border-border last:border-0">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-start justify-between w-full gap-6 text-left py-5"
            >
                <span className="text-[15px] font-medium text-foreground/90 leading-snug">{q}</span>
                <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="material-symbols-outlined text-[18px] text-muted-foreground/70 shrink-0 mt-0.5 select-none"
                >
                    add
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                        className="overflow-hidden"
                    >
                        <p className="text-[14px] text-muted-foreground leading-relaxed pb-5">{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ eyebrow, title, sub, accent }: {
    eyebrow: string
    title: React.ReactNode
    sub?: string
    accent?: string
}) {
    return (
        <FadeIn className="mb-14 space-y-3">
            <p className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: accent ?? 'rgb(var(--muted-foreground))' }}>
                {eyebrow}
            </p>
            <h2 className="text-[2.2rem] md:text-[2.8rem] font-bold text-foreground tracking-tight leading-[1.08]">
                {title}
            </h2>
            {sub && <p className="text-[15px] text-muted-foreground max-w-xl leading-relaxed pt-1">{sub}</p>}
        </FadeIn>
    )
}

// ─── FeatureGrid ──────────────────────────────────────────────────────────────

function FeatureGrid({ items, accent }: { items: Feature[]; accent: string }) {
    return (
        <div className="grid md:grid-cols-2 gap-5">
            {items.map((item, i) => (
                <FadeIn key={item.title} delay={i * 0.06}>
                    <div className="flex gap-4 p-6 rounded-2xl border border-border hover:border-foreground/20 hover:bg-foreground/[0.04] transition-all duration-200 h-full">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${accent}1f` }}
                        >
                            <span
                                className="material-symbols-outlined text-[20px]"
                                style={{ color: accent, fontVariationSettings: "'FILL' 0" }}
                            >
                                {item.icon}
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-[15px] font-semibold text-foreground">{item.title}</h3>
                            <p className="text-[13px] text-muted-foreground leading-relaxed">{item.body}</p>
                        </div>
                    </div>
                </FadeIn>
            ))}
        </div>
    )
}

// ─── FeatureShowcase — alternating illustration rows ──────────────────────────

function FeatureShowcase({ items, accent }: { items: Feature[]; accent: string }) {
    return (
        <div className="space-y-20 md:space-y-28">
            {items.map((item, i) => {
                const flipped = i % 2 === 1
                return (
                    <FadeIn key={item.title}>
                        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
                            {/* Illustration (carries its own header) — sits directly on the page, no wrapper card */}
                            <div className={cn('flex items-center justify-center', flipped && 'md:order-2')}>
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-full h-auto max-h-72 object-contain rounded-2xl"
                                    loading="lazy"
                                />
                            </div>

                            {/* Copy */}
                            <div className={cn('space-y-5', flipped && 'md:order-1')}>
                                <div className="flex items-center gap-3">
                                    <span
                                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: `${accent}1f` }}
                                    >
                                        <span
                                            className="material-symbols-outlined text-[19px]"
                                            style={{ color: accent, fontVariationSettings: "'FILL' 0" }}
                                        >
                                            {item.icon}
                                        </span>
                                    </span>
                                    {item.eyebrow && (
                                        <span
                                            className="text-[11px] font-semibold uppercase tracking-widest"
                                            style={{ color: accent }}
                                        >
                                            {item.eyebrow}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-[1.5rem] md:text-[1.75rem] font-bold text-foreground tracking-tight leading-[1.15]">
                                    {item.title}
                                </h3>

                                <p className="text-[15px] md:text-[16px] text-muted-foreground leading-relaxed max-w-md">
                                    {item.body}
                                </p>

                                {item.points && (
                                    <ul className="space-y-2.5 pt-1">
                                        {item.points.map(point => (
                                            <li key={point} className="flex items-center gap-2.5">
                                                <span
                                                    className="material-symbols-outlined text-[18px] shrink-0"
                                                    style={{ color: accent }}
                                                >
                                                    check_circle
                                                </span>
                                                <span className="text-[14px] text-muted-foreground leading-snug">{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </FadeIn>
                )
            })}
        </div>
    )
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Steps({ steps }: { steps: Step[] }) {
    return (
        <div className="grid md:grid-cols-4 gap-6">
            {steps.map((item, i) => (
                <FadeIn key={item.step} delay={i * 0.1}>
                    <div className="space-y-4">
                        <span className="text-[11px] font-bold text-muted-foreground/60 tracking-widest">{item.step}</span>
                        <div className="w-px h-8 bg-gradient-to-b from-foreground/25 to-transparent ml-0.5" />
                        <h3 className="text-[15px] font-semibold text-foreground">{item.title}</h3>
                        <p className="text-[13px] text-muted-foreground leading-relaxed">{item.body}</p>
                    </div>
                </FadeIn>
            ))}
        </div>
    )
}

// ─── Objections ───────────────────────────────────────────────────────────────

function Objections({ items }: { items: Objection[] }) {
    return (
        <div className="grid md:grid-cols-2 gap-5">
            {items.map((item, i) => (
                <FadeIn key={item.q} delay={i * 0.07}>
                    <div className="p-6 rounded-2xl border border-border bg-foreground/[0.02] h-full space-y-2.5">
                        <h3 className="text-[15px] font-semibold text-foreground leading-snug">{item.q}</h3>
                        <p className="text-[13px] text-muted-foreground leading-relaxed">{item.a}</p>
                    </div>
                </FadeIn>
            ))}
        </div>
    )
}

// ─── PricingCards ─────────────────────────────────────────────────────────────

function PricingCards({ plans, accent }: { plans: PlanTier[]; accent: string }) {
    return (
        <div className="grid md:grid-cols-3 gap-5">
            {plans.map((plan, i) => (
                <FadeIn key={plan.name} delay={i * 0.08} className="h-full">
                    <div
                        className={cn(
                            'relative flex flex-col gap-6 p-7 rounded-2xl border h-full transition-colors duration-200',
                            plan.highlight
                                ? 'border-border bg-foreground/[0.06]'
                                : 'border-border bg-foreground/[0.02] hover:border-border'
                        )}
                    >
                        {plan.highlight && (
                            <span
                                className="absolute -top-2.5 left-7 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full text-background"
                                style={{ backgroundColor: accent }}
                            >
                                Most popular
                            </span>
                        )}

                        <div className="space-y-1">
                            <p className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: accent }}>
                                {plan.name}
                            </p>
                            <div className="flex items-end gap-1.5 pt-1">
                                <span className="text-[28px] font-bold text-foreground leading-none">{plan.price}</span>
                                {plan.cadence && <span className="text-[12px] text-muted-foreground/70 mb-0.5">{plan.cadence}</span>}
                            </div>
                            <p className="text-[13px] text-muted-foreground leading-relaxed pt-2">{plan.blurb}</p>
                        </div>

                        <ul className="space-y-2.5 flex-1">
                            {plan.features.map(f => (
                                <li key={f} className="flex items-start gap-2.5">
                                    <span
                                        className="material-symbols-outlined text-[15px] mt-0.5 shrink-0"
                                        style={{ color: accent }}
                                    >
                                        check
                                    </span>
                                    <span className="text-[13px] text-muted-foreground leading-snug">{f}</span>
                                </li>
                            ))}
                        </ul>

                        <Link
                            href={plan.href}
                            className={cn(
                                'h-11 px-5 rounded-full text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors',
                                plan.highlight
                                    ? 'bg-foreground text-background hover:opacity-90'
                                    : 'border border-border text-foreground/80 hover:text-foreground hover:border-border'
                            )}
                        >
                            {plan.cta}
                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </Link>
                    </div>
                </FadeIn>
            ))}
        </div>
    )
}

// ─── FeatureMatrix ────────────────────────────────────────────────────────────

function MatrixCell({ value, accent }: { value: string | boolean; accent: string }) {
    if (value === true) {
        return (
            <span className="material-symbols-outlined text-[18px]" style={{ color: accent }}>
                check
            </span>
        )
    }
    if (value === false) {
        return <span className="text-muted-foreground/50 text-[16px]">—</span>
    }
    return <span className="text-[13px] text-muted-foreground">{value}</span>
}

function FeatureMatrix({ plans, rows, accent }: { plans: string[]; rows: FeatureRow[]; accent: string }) {
    return (
        <FadeIn>
            <div className="overflow-x-auto rounded-2xl border border-border bg-foreground/[0.02]">
                <table className="w-full min-w-[520px] border-collapse">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left text-[12px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-6 py-4">
                                Compare plans
                            </th>
                            {plans.map(p => (
                                <th key={p} className="text-center text-[13px] font-semibold text-foreground px-4 py-4">
                                    {p}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={row.label} className={cn(i !== rows.length - 1 && 'border-b border-border')}>
                                <td className="text-[13px] text-muted-foreground px-6 py-3.5">{row.label}</td>
                                {row.values.map((v, j) => (
                                    <td key={j} className="text-center px-4 py-3.5">
                                        <MatrixCell value={v} accent={accent} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </FadeIn>
    )
}

// ─── FaqBlock ─────────────────────────────────────────────────────────────────

function FaqBlock({ faqs }: { faqs: FaqEntry[] }) {
    return (
        <FadeIn>
            <div className="rounded-2xl border border-border bg-foreground/[0.02] px-6 py-2">
                {faqs.map((faq, i) => <FaqItem key={i} {...faq} />)}
            </div>
        </FadeIn>
    )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
    return <div className="border-t border-border" />
}

// ════════════════════════════════════════════════════════════════════════════
//  E-COMMERCE CONTENT
// ════════════════════════════════════════════════════════════════════════════

const STORE_ACCENT = '#7aa2e0'

const STORE_FEATURES: Feature[] = [
    {
        icon: 'storefront',
        eyebrow: 'Everything in one place',
        title: 'Your whole shop, ready by this afternoon',
        body: 'Products, services, orders, and a blog live under one roof — no plugins to wire up, no theme to wrestle. Fill in your details and you are taking real orders before the day is out.',
        image: '/digital-warehouse.svg',
        points: [
            'Unlimited products and services',
            'Built-in orders and checkout',
            'Blog and content pages included',
        ],
    },
    {
        icon: 'automation',
        eyebrow: 'Automation',
        title: 'Let the store run the busywork',
        body: 'Connect once and the repetitive jobs handle themselves. Inventory syncs, prices update, and new products post to your socials — so your evenings go back to being yours.',
        image: '/automate.svg',
        points: [
            'Auto-sync stock and pricing',
            'Post to socials on autopilot',
            'Powered by n8n workflows',
        ],
    },
    {
        icon: 'palette',
        eyebrow: 'Your brand',
        title: 'It looks like you, not like us',
        body: 'Your logo, your colours, your words, on your own domain. Customers see a shop that is unmistakably yours — never a template, and never our name where yours should be.',
        image: '/make-it-yours.svg',
        points: [
            'Custom themes and colours',
            'Your own domain with free SSL',
            'No Menengai Cloud branding on Pro',
        ],
    },
    {
        icon: 'insights',
        eyebrow: 'Insights',
        title: 'Know exactly what is selling',
        body: 'Clear sales and traffic insights show you which products and pages actually move money — so you double down on what works and stop guessing at the rest.',
        image: '/see-what-works.svg',
        points: [
            'Real-time sales and traffic',
            'Top products at a glance',
            'Spot what to promote next',
        ],
    },
]

const STORE_STEPS: Step[] = [
    { step: '01', title: 'Create an organisation', body: 'Your org holds everything. Stores, team members, billing. One login for the lot.' },
    { step: '02', title: 'Build your store', body: 'Add products and services, pick a theme, drop in your branding. No code, no setup ticket.' },
    { step: '03', title: 'Connect your domain', body: 'Point your DNS to us. SSL is provisioned automatically, with nothing to configure on your side.' },
    { step: '04', title: 'Start selling', body: 'It deploys and we keep it running. Uptime, updates, and the 2am stuff are on us.' },
]

const STORE_PLANS: PlanTier[] = [
    {
        name: 'Free',
        price: 'KES 0',
        cadence: 'forever',
        blurb: 'Get a real shop online and start taking orders today.',
        cta: 'Start free',
        href: '/auth/sign-up',
        features: [
            'Hosted storefront on a menengai.cloud address',
            'Unlimited products and services',
            'Paystack checkout',
            'Order management',
        ],
    },
    {
        name: 'Hobby',
        price: 'KES 1,499',
        cadence: 'per month',
        blurb: 'For a shop that has found its footing and wants its own name out front.',
        cta: 'Choose Hobby',
        href: '/auth/sign-up',
        features: [
            'Everything in Free',
            'Connect your own domain',
            'Basic analytics',
            'Email support',
        ],
    },
    {
        name: 'Pro',
        price: 'KES 2,499',
        cadence: 'per month',
        blurb: 'Everything you need to grow, with our branding out of the way.',
        cta: 'Choose Pro',
        href: '/auth/sign-up',
        highlight: true,
        features: [
            'Everything in Hobby',
            'Advanced analytics and funnel data',
            'No Menengai Cloud branding',
            'Blog and content pages',
            'Priority support',
        ],
    },
]

const STORE_MATRIX: { plans: string[]; rows: FeatureRow[] } = {
    plans: ['Free', 'Hobby', 'Pro'],
    rows: [
        { label: 'Hosted storefront', values: [true, true, true] },
        { label: 'Unlimited products', values: [true, true, true] },
        { label: 'Paystack checkout', values: [true, true, true] },
        { label: 'Order management', values: [true, true, true] },
        { label: 'Your own domain', values: [false, true, true] },
        { label: 'Analytics', values: [false, 'Basic', 'Advanced'] },
        { label: 'Blog and content pages', values: [false, false, true] },
        { label: 'Remove our branding', values: [false, false, true] },
        { label: 'Support', values: ['Community', 'Email', 'Priority'] },
    ],
}

const STORE_OBJECTIONS: Objection[] = [
    {
        q: 'I already tried building a shop myself.',
        a: 'Then you know where it goes. The build is the easy part; it is the hosting, SSL renewals, and the 2am outage that wear you down. We take that part off your plate for good.',
    },
    {
        q: 'I do not want to learn DevOps.',
        a: 'Good, because you will not have to. There is no server dashboard, no cPanel, no environment to wire up. You fill in a form and connect a domain. That is the whole job.',
    },
    {
        q: 'Can I really start for free?',
        a: 'Yes. No card, no trial countdown. You get a working shop on our address and only pay when you want your own domain and the rest.',
    },
    {
        q: 'What if I want to leave?',
        a: 'You can. Storefronts are month to month with no lock-in, and your customers, content, and revenue were always yours. We earn the next month by being worth it.',
    },
]

const STORE_FAQS: FaqEntry[] = [
    {
        q: 'What does "managed" actually mean here?',
        a: 'Your store runs on our infrastructure, and we keep it running. SSL, deployments, uptime, updates. You configure it and own the brand; the servers are our problem, not yours.',
    },
    {
        q: 'Can I use my own domain?',
        a: 'Yes, and you should. From the Hobby plan up, point your DNS to us, add the domain in your dashboard, and SSL is provisioned automatically. Your name is in the address bar, never ours.',
    },
    {
        q: 'How do payments work?',
        a: 'Paystack is built in, so you take card and mobile money in shillings out of the box. Payouts go to your own Paystack account. The money is yours from the first sale.',
    },
    {
        q: 'Can I run more than one shop?',
        a: 'Yes. Your organisation can hold several storefronts, each with its own team and settings, all under one login and one bill.',
    },
    {
        q: 'What happens to my data?',
        a: 'Customers, orders, and content stay yours. We run the pipes; we do not touch the relationship or sell anything on.',
    },
]

function EcommerceTab() {
    return (
        <>
            {/* Intro + features */}
            <section className="relative">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full blur-[140px]" style={{ backgroundColor: `${STORE_ACCENT}10` }} />
                </div>
                <div className="relative z-10 container mx-auto px-6 md:px-12 max-w-5xl py-24 md:py-32">
                    <SectionHeading
                        accent={STORE_ACCENT}
                        eyebrow="For e-commerce"
                        title={<>Start today. <span className="text-muted-foreground/70">Grow it on your terms.</span></>}
                        sub="Everything a small business needs to sell online, with none of the hosting headaches. Start free, and only pay when you are ready for your own name out front."
                    />
                    <FeatureShowcase items={STORE_FEATURES} accent={STORE_ACCENT} />
                </div>
            </section>

            <Divider />

            {/* How it works */}
            <section className="py-24 md:py-32 bg-foreground/[0.02]">
                <div className="container mx-auto px-6 md:px-12 max-w-5xl">
                    <SectionHeading accent={STORE_ACCENT} eyebrow="How it works" title="Signup to selling in an afternoon." />
                    <Steps steps={STORE_STEPS} />
                </div>
            </section>

            <Divider />

            {/* Pricing */}
            <section className="py-24 md:py-32">
                <div className="container mx-auto px-6 md:px-12 max-w-5xl space-y-12">
                    <SectionHeading
                        accent={STORE_ACCENT}
                        eyebrow="Pricing"
                        title="One simple ladder."
                        sub="No card needed to start, and you can move up or down whenever it suits you."
                    />
                    <PricingCards plans={STORE_PLANS} accent={STORE_ACCENT} />
                    <FeatureMatrix plans={STORE_MATRIX.plans} rows={STORE_MATRIX.rows} accent={STORE_ACCENT} />
                </div>
            </section>

            <Divider />


            {/* FAQ */}
            <section className="py-24 md:py-32">
                <div className="container mx-auto px-6 md:px-12 max-w-3xl">
                    <SectionHeading accent={STORE_ACCENT} eyebrow="FAQ" title="Common questions." />
                    <FaqBlock faqs={STORE_FAQS} />
                </div>
            </section>

            <Divider />

            {/* Final CTA */}
            <section className="relative py-32 md:py-40 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[100px]" style={{ backgroundColor: `${STORE_ACCENT}26` }} />
                </div>
                <div className="relative z-10 container mx-auto px-6 md:px-12 max-w-3xl text-center">
                    <FadeIn className="space-y-7">
                        <h2 className="text-[2.6rem] md:text-[3.6rem] font-bold text-foreground leading-[1.05] tracking-tight">
                            Open your shop today.
                        </h2>
                        <p className="text-[16px] text-muted-foreground max-w-lg mx-auto leading-relaxed">
                            Start free, take real orders, and add your own domain when you are ready. You skip every infrastructure decision.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                            <Link
                                href="/auth/sign-up"
                                className="h-12 px-8 rounded-full bg-foreground text-background text-[15px] font-semibold hover:opacity-90 transition-colors flex items-center gap-2"
                            >
                                Start a storefront free
                                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                            </Link>
                            <Link
                                href="/contact"
                                className="h-12 px-8 rounded-full border border-border text-[15px] text-muted-foreground hover:text-foreground hover:border-border transition-colors flex items-center gap-2"
                            >
                                Ask us a question
                            </Link>
                        </div>
                        <p className="text-[12px] text-muted-foreground/60">
                            Free to start, Pro from KES 2,499/mo. No card required.
                        </p>
                    </FadeIn>
                </div>
            </section>
        </>
    )
}

// ════════════════════════════════════════════════════════════════════════════
//  BROKERS CONTENT
// ════════════════════════════════════════════════════════════════════════════

const BROKER_ACCENT = '#a98cdc'

const BROKER_FEATURES: Feature[] = [
    {
        icon: 'verified',
        title: 'Your brand, end to end',
        body: 'Your logo, your colours, your domain. Clients see a platform that belongs to you, not a referral link with someone else\'s name on it.',
    },
    {
        icon: 'api',
        title: 'Connected to real trading APIs',
        body: 'We build on leading trading APIs. Use our default integration, or if you already hold premium API access we build on that instead.',
    },
    {
        icon: 'rocket_launch',
        title: 'We build and run the stack',
        body: 'The full application, hosting, SSL, and uptime are ours to handle. You go to market; we keep the platform standing.',
    },
    {
        icon: 'hub',
        title: 'Affiliate program built in',
        body: 'Bring partners on board with affiliate links and tracking, so the people sending you clients get paid properly.',
    },
    {
        icon: 'support_agent',
        title: 'A team that picks up',
        body: 'Trading app clients get dedicated support. When something needs a human, you reach one quickly.',
    },
    {
        icon: 'workspace_premium',
        title: 'One organisation, many apps',
        body: 'Run several branded apps under a single account, each with its own team and settings, all on one login.',
    },
]

const BROKER_STEPS: Step[] = [
    { step: '01', title: 'Talk to us', body: 'Tell us about your brand, your market, and which trading API you want to build on. We scope it with you.' },
    { step: '02', title: 'We build it', body: 'We stand up your branded trading application on the API, wire in your affiliate program, and apply your identity.' },
    { step: '03', title: 'Connect your domain', body: 'Your platform goes live on your own domain with automatic SSL. Your name in the address bar, start to finish.' },
    { step: '04', title: 'Go to market', body: 'You bring clients under your own brand. We run hosting, uptime, and support behind the scenes.' },
]

const BROKER_INCLUDES = [
    'Custom branding (logo and colours)',
    'Trading API integration',
    'Your own domain with automatic SSL',
    'Affiliate program and tracking',
    'Hosting, deployment, and uptime handled',
    'Dedicated support',
]

const BROKER_OBJECTIONS: Objection[] = [
    {
        q: 'Why not just use a referral link?',
        a: 'Because the brand and the trust go to someone else. With your own platform, clients sign up to you, see your name, and stay yours. The relationship is the asset.',
    },
    {
        q: 'We already hold premium API access.',
        a: 'Then we build on it. Bring your own trading API and we deploy your branded application on top of it, instead of our default integration.',
    },
    {
        q: 'This sounds like a long, expensive build.',
        a: 'It is not your build to run. We stand up the stack, host it, and keep it live. You get a finished, branded platform without a dev team or a server room.',
    },
    {
        q: 'What about support when things break?',
        a: 'Trading app clients get dedicated support. When something needs a human, you reach one quickly, not a queue and a ticket number.',
    },
]

const BROKER_FAQS: FaqEntry[] = [
    {
        q: 'What does "white-label" actually mean here?',
        a: 'The platform is built and run by us, but it carries your brand top to bottom. Your logo, your colours, your domain. Your clients never see Menengai Cloud.',
    },
    {
        q: 'What trading APIs do you support?',
        a: 'We deploy branded trading applications on top of leading trading APIs. We have a default integration ready to go, and if your organisation already holds access to a premium API, we build on that instead.',
    },
    {
        q: 'How much does a trading app cost?',
        a: 'Trading apps are quoted per project, because the scope depends on your brand, your domain, and which trading API you build on. Tell us what you have in mind and we put real numbers in front of you.',
    },
    {
        q: 'Can I run an affiliate program?',
        a: 'Yes, it is built in. Add affiliate links and tracking so partners who bring you clients are credited and paid properly.',
    },
    {
        q: 'Can I run more than one app?',
        a: 'Yes. Your organisation can hold several trading apps and storefronts, each with their own team members, under one login and one bill.',
    },
]

function BrokersTab() {
    return (
        <>
            {/* Intro + features */}
            <section className="relative">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-1/4 w-[600px] h-[400px] rounded-full blur-[140px]" style={{ backgroundColor: `${BROKER_ACCENT}10` }} />
                </div>
                <div className="relative z-10 container mx-auto px-6 md:px-12 max-w-5xl py-24 md:py-32">
                    <SectionHeading
                        accent={BROKER_ACCENT}
                        eyebrow="For brokers"
                        title={<>Stop sending clients<br className="hidden md:block" /> to someone else&apos;s brand.</>}
                        sub="A fully branded trading platform, built on leading trading APIs and run end to end by us. Your clients see your name. You keep the relationship and the upside."
                    />
                    <FeatureGrid items={BROKER_FEATURES} accent={BROKER_ACCENT} />
                </div>
            </section>

            <Divider />

            {/* How it works */}
            <section className="py-24 md:py-32 bg-foreground/[0.02]">
                <div className="container mx-auto px-6 md:px-12 max-w-5xl">
                    <SectionHeading accent={BROKER_ACCENT} eyebrow="How it works" title="From a conversation to a live platform." />
                    <Steps steps={BROKER_STEPS} />
                </div>
            </section>

            <Divider />

            {/* Pricing — quote based */}
            <section className="py-24 md:py-32">
                <div className="container mx-auto px-6 md:px-12 max-w-5xl space-y-12">
                    <SectionHeading
                        accent={BROKER_ACCENT}
                        eyebrow="Pricing"
                        title="Built once. Run for you."
                        sub="Every trading app ships with the same foundation. The price reflects your brand, your domain, and the API you build on."
                    />
                    <FadeIn>
                        <div className="grid md:grid-cols-[1.1fr_1fr] gap-px rounded-2xl overflow-hidden border border-border bg-foreground/[0.02]">
                            {/* What's included */}
                            <div className="p-8 md:p-10 space-y-6">
                                <p className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: BROKER_ACCENT }}>
                                    What every trading app includes
                                </p>
                                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                                    {BROKER_INCLUDES.map(item => (
                                        <li key={item} className="flex items-start gap-2.5">
                                            <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0" style={{ color: BROKER_ACCENT }}>
                                                check_circle
                                            </span>
                                            <span className="text-[13px] text-muted-foreground leading-snug">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Quote panel */}
                            <div className="p-8 md:p-10 flex flex-col justify-center gap-5 bg-foreground/[0.03]">
                                <div className="space-y-1.5">
                                    <p className="text-[13px] text-muted-foreground/70">Pricing</p>
                                    <p className="text-[28px] font-bold text-foreground leading-tight">Quoted per project</p>
                                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                                        Tell us what you have in mind and we put real numbers in front of you, usually within one business day.
                                    </p>
                                </div>
                                <Link
                                    href="/contact"
                                    className="h-11 px-6 rounded-full bg-foreground text-background text-[14px] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-colors"
                                >
                                    Talk to sales
                                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </Link>
                                <p className="text-[12px] text-muted-foreground/60">No lock-in. Setup assistance included.</p>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            <Divider />


            <Divider />

            {/* FAQ */}
            <section className="py-24 md:py-32">
                <div className="container mx-auto px-6 md:px-12 max-w-3xl">
                    <SectionHeading accent={BROKER_ACCENT} eyebrow="FAQ" title="Common questions." />
                    <FaqBlock faqs={BROKER_FAQS} />
                </div>
            </section>

            <Divider />

            {/* Final CTA */}
            <section className="relative py-32 md:py-40 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[100px]" style={{ backgroundColor: `${BROKER_ACCENT}26` }} />
                </div>
                <div className="relative z-10 container mx-auto px-6 md:px-12 max-w-3xl text-center">
                    <FadeIn className="space-y-7">
                        <h2 className="text-[2.6rem] md:text-[3.6rem] font-bold text-foreground leading-[1.05] tracking-tight">
                            Put your own name on it.
                        </h2>
                        <p className="text-[16px] text-muted-foreground max-w-lg mx-auto leading-relaxed">
                            Tell us about your brand and your market. We will scope a branded trading platform and put real numbers in front of you.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                            <Link
                                href="/contact"
                                className="h-12 px-8 rounded-full bg-foreground text-background text-[15px] font-semibold hover:opacity-90 transition-colors flex items-center gap-2"
                            >
                                Talk to sales
                                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                            </Link>
                        </div>
                        <p className="text-[12px] text-muted-foreground/60">
                            Quoted per project. No lock-in. Typically a reply within one business day.
                        </p>
                    </FadeIn>
                </div>
            </section>
        </>
    )
}

// ════════════════════════════════════════════════════════════════════════════
//  HOME CLIENT — Hero + tab switcher
// ════════════════════════════════════════════════════════════════════════════

type Tab = 'ecommerce' | 'brokers'

const TABS: { id: Tab; label: string; accent: string }[] = [
    { id: 'ecommerce', label: 'For e-commerce', accent: STORE_ACCENT },
    { id: 'brokers', label: 'For brokers', accent: BROKER_ACCENT },
]

export default function HomeClient() {
    const [tab, setTab] = useState<Tab>('ecommerce')

    return (
        <div className="min-h-[100dvh] bg-background text-foreground overflow-x-hidden">

            {/* ── HERO ──────────────────────────────────────────────────────── */}
            <section className="relative">
                {/* Grid overlay — currentColor inherits foreground so it adapts per theme */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] text-foreground"
                    style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '72px 72px' }} />

                <div className="relative z-10 container mx-auto px-6 md:px-12 max-w-6xl w-full pt-8 pb-12 md:pt-10 md:pb-20">
                    <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-center">
                        {/* Left — copy + tabs */}
                        <div>
                            <motion.div
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                                className="space-y-7"
                            >
                                <h1 className="text-[3rem] md:text-[4.2rem] font-bold leading-[1.05] tracking-tight text-foreground">
                                    Run something online.
                                </h1>

                                <p className="text-[17px] text-muted-foreground leading-relaxed max-w-[560px]">
                                    Getting a business online here has become wrestling with AI or paying a developer who vanishes after launch.<br /> <br /> Menengai Cloud is the third option. You bring the brand, we run the infrastructure underneath it. Pick your path:
                                </p>
                            </motion.div>

                            {/* Tab switcher */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                                className="mt-10 inline-flex p-1 rounded-full border border-border bg-foreground/[0.03]"
                                role="tablist"
                                aria-label="Choose your path"
                            >
                                {TABS.map(t => (
                                    <button
                                        key={t.id}
                                        role="tab"
                                        aria-selected={tab === t.id}
                                        onClick={() => setTab(t.id)}
                                        className={cn(
                                            'relative h-10 px-5 sm:px-7 rounded-full text-[14px] font-semibold transition-colors duration-200 z-10',
                                            tab === t.id ? 'text-background' : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {tab === t.id && (
                                            <motion.span
                                                layoutId="tab-pill"
                                                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                                                className="absolute inset-0 rounded-full bg-foreground -z-10"
                                            />
                                        )}
                                        {t.label}
                                    </button>
                                ))}
                            </motion.div>
                        </div>

                        {/* Right — hero graphic */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                            className="relative flex items-center justify-center"
                        >
                            <img
                                src="/run-it-online.svg"
                                alt="Run your business online with Menengai Cloud"
                                className="relative w-full max-w-[520px] h-auto hidden md:block"
                                fetchPriority="high"
                            />
                        </motion.div>
                    </div>
                </div>
            </section>

            <Divider />

            {/* ── TAB CONTENT — completely separate down to the footer ──────── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                    role="tabpanel"
                >
                    {tab === 'ecommerce' ? <EcommerceTab /> : <BrokersTab />}
                </motion.div>
            </AnimatePresence>

            <CookieBanner />
        </div>
    )
}
