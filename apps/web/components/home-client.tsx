'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@mcloud/ui/utils'
import { BetaSignupForm } from '@/app/(marketing)/beta/beta-signup-form'
import { STORE_FAQS, STORE_FEATURES, STORE_MATRIX, STORE_PLANS, STORE_STEPS, type FaqEntry, type Feature, type FeatureRow, type PlanTier, type Step } from './home-storefront-data'


type Product = 'servers' | 'storefronts'

/**
 * Reveal-on-scroll wrapper. Pure CSS transition (see .fadeIn / .fadeIn.visible
 * in globals.css) driven by IntersectionObserver — no animation library.
 */
function FadeIn({
    children,
    className,
    delay = 0,
}: {
    children: React.ReactNode
    className?: string
    delay?: number
}) {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const node = ref.current
        if (!node) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.1, rootMargin: '-60px' }
        )

        observer.observe(node)
        return () => observer.disconnect()
    }, [])

    return (
        <div
            ref={ref}
            className={cn('fadeIn', visible && 'visible', className)}
            style={delay ? { transitionDelay: `${delay}ms` } : undefined}
        >
            {children}
        </div>
    )
}

function Divider() {
    return <div className="border-t border-border" />
}

function SectionHeading({
    eyebrow,
    title,
    sub,
    accent,
    centered = false,
}: {
    eyebrow: string
    title: React.ReactNode
    sub?: string
    accent?: string
    centered?: boolean
}) {
    return (
        <FadeIn className={cn('mb-14 space-y-4', centered && 'mx-auto max-w-3xl text-center')}>
            <p
                className="text-[12px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: accent ?? 'rgb(var(--muted-foreground))' }}
            >
                {eyebrow}
            </p>
            <h2 className="text-4xl font-semibold tracking-[-0.055em] leading-[0.98] text-foreground md:text-6xl">
                {title}
            </h2>
            {sub && (
                <p className={cn('max-w-xl text-[16px] leading-relaxed text-muted-foreground', centered && 'mx-auto')}>
                    {sub}
                </p>
            )}
        </FadeIn>
    )
}

function FaqItem({ q, a }: FaqEntry) {
    const [open, setOpen] = useState(false)

    return (
        <div className="border-b border-border last:border-0">
            <button
                type="button"
                onClick={() => setOpen(value => !value)}
                className="flex w-full items-start justify-between gap-6 py-5 text-left"
                aria-expanded={open}
            >
                <span className="text-[16px] font-medium leading-snug text-foreground/90">{q}</span>
                <span
                    className={cn(
                        'faqIcon material-symbols-outlined mt-0.5 shrink-0 select-none text-[18px] text-muted-foreground/70',
                        open && 'faqIconOpen'
                    )}
                >
                    add
                </span>
            </button>
            <div className={cn('faqAnswerWrap', open && 'open')}>
                <div className="faqAnswerInner">
                    <p className="pb-5 text-[15px] leading-relaxed text-muted-foreground">{a}</p>
                </div>
            </div>
        </div>
    )
}

function FaqBlock({ faqs }: { faqs: FaqEntry[] }) {
    return (
        <FadeIn>
            <div className=" border border-border bg-foreground/[0.025] px-6 py-2 md:px-8">
                {faqs.map(faq => <FaqItem key={faq.q} {...faq} />)}
            </div>
        </FadeIn>
    )
}

function FeatureShowcase({ items, accent }: { items: Feature[]; accent: string }) {
    return (
        <div className="space-y-24 md:space-y-36">
            {items.map((item, index) => {
                const flipped = index % 2 === 1

                return (
                    <FadeIn key={item.title}>
                        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-20">
                            <div
                                className={cn(
                                    'relative flex min-h-[160px] items-center justify-center overflow-hidden bg-transparent p-8 md:min-h-[360px] md:p-12',
                                    flipped && 'md:order-2'
                                )}
                            >
                                <div
                                    className="pointer-events-none absolute inset-0 opacity-60"
                                    style={{
                                        background: `transparent`,
                                    }}
                                />
                                {item.image ? (
                                    <img
                                        src={item.image}
                                        alt={item.title}
                                        loading="lazy"
                                        width={1050}
                                        height={700}
                                        className="relative z-10 max-h-82 w-full object-contain"
                                    />
                                ) : (
                                    <span
                                        className="material-symbols-outlined relative z-10 text-[92px]"
                                        style={{ color: accent, fontVariationSettings: "'FILL' 0" }}
                                    >
                                        {item.icon}
                                    </span>
                                )}
                            </div>

                            <div className={cn('space-y-5', flipped && 'md:order-1')}>
                                <div className="flex items-center gap-3">
                                    <span
                                        className="flex h-9 w-9 items-center justify-center "
                                        style={{ backgroundColor: `${accent}22` }}
                                    >
                                        <span
                                            className="material-symbols-outlined text-[18px]"
                                            style={{ color: accent, fontVariationSettings: "'FILL' 0" }}
                                        >
                                            {item.icon}
                                        </span>
                                    </span>
                                    <span
                                        className="text-[12px] font-semibold uppercase tracking-[0.18em]"
                                        style={{ color: accent }}
                                    >
                                        {item.eyebrow}
                                    </span>
                                </div>
                                <h3 className="max-w-md text-3xl font-semibold tracking-[-0.045em] leading-[1.02] text-foreground md:text-5xl">
                                    {item.title}
                                </h3>
                                <p className="max-w-md text-[16px] leading-relaxed text-muted-foreground">{item.body}</p>
                                <ul className="space-y-3 pt-1">
                                    {item.points.map(point => (
                                        <li key={point} className="flex items-start gap-2.5">
                                            <span
                                                className="material-symbols-outlined mt-0.5 shrink-0 text-[17px]"
                                                style={{ color: accent }}
                                            >
                                                check_circle
                                            </span>
                                            <span className="text-[15px] leading-snug text-muted-foreground">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </FadeIn>
                )
            })}
        </div>
    )
}

function Steps({ steps, accent }: { steps: Step[]; accent: string }) {
    return (
        <div className="grid gap-10 md:grid-cols-3">
            {steps.map((item, index) => (
                <FadeIn key={item.step} delay={index * 80}>
                    <div className="space-y-5">
                        <span className="text-[13px] font-semibold tracking-[0.16em]" style={{ color: accent }}>
                            {item.step}
                        </span>
                        <div className="h-px w-full bg-border" />
                        <h3 className="text-[18px] font-semibold tracking-tight text-foreground">{item.title}</h3>
                        <p className="text-[15px] leading-relaxed text-muted-foreground">{item.body}</p>
                    </div>
                </FadeIn>
            ))}
        </div>
    )
}

function PricingCards({ plans, accent }: { plans: PlanTier[]; accent: string }) {
    return (
        <div className="grid gap-5 md:grid-cols-3">
            {plans.map((plan, index) => (
                <FadeIn key={plan.name} delay={index * 80} className="h-full">
                    <div
                        className={cn(
                            'relative flex h-full flex-col gap-7  border p-7 md:p-8',
                            plan.highlight
                                ? 'border-foreground/20 bg-foreground/[0.07]'
                                : 'border-border bg-foreground/[0.025]'
                        )}
                    >
                        {plan.highlight && (
                            <span
                                className="absolute -top-3 left-7  px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-background"
                                style={{ backgroundColor: accent }}
                            >
                                Built for growing brands
                            </span>
                        )}
                        <div className="space-y-2">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
                                {plan.name}
                            </p>
                            <div className="flex items-end gap-1.5 pt-1">
                                <span className="text-[32px] font-semibold leading-none tracking-[-0.04em] text-foreground">
                                    {plan.price}
                                </span>
                                {plan.cadence && (
                                    <span className="mb-0.5 text-[13px] text-muted-foreground/70">{plan.cadence}</span>
                                )}
                            </div>
                            <p className="pt-2 text-[15px] leading-relaxed text-muted-foreground">{plan.blurb}</p>
                        </div>
                        <ul className="flex-1 space-y-3">
                            {plan.features.map(feature => (
                                <li key={feature} className="flex items-start gap-2.5">
                                    <span
                                        className="material-symbols-outlined mt-0.5 shrink-0 text-[16px]"
                                        style={{ color: accent }}
                                    >
                                        check
                                    </span>
                                    <span className="text-[14px] leading-snug text-muted-foreground">{feature}</span>
                                </li>
                            ))}
                        </ul>
                        <a
                            href={plan.href}
                            className={cn(
                                'flex h-11 items-center justify-center gap-2  px-5 text-[15px] font-semibold transition-opacity hover:opacity-85',
                                plan.highlight
                                    ? 'bg-foreground text-background'
                                    : 'border border-border text-foreground'
                            )}
                        >
                            {plan.cta}
                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </a>
                    </div>
                </FadeIn>
            ))}
        </div>
    )
}

function MatrixCell({ value, accent }: { value: string | boolean; accent: string }) {
    if (value === true) {
        return (
            <span className="material-symbols-outlined text-[18px]" style={{ color: accent }}>
                check
            </span>
        )
    }

    if (value === false) {
        return <span className="text-[16px] text-muted-foreground/50">—</span>
    }

    return <span className="text-[14px] text-muted-foreground">{value}</span>
}

function FeatureMatrix({ plans, rows, accent }: { plans: string[]; rows: FeatureRow[]; accent: string }) {
    return (
        <FadeIn>
            <div className="overflow-x-auto  border border-border bg-foreground/[0.025]">
                <table className="w-full min-w-[520px] border-collapse">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                                Compare storefront plans
                            </th>
                            {plans.map(plan => (
                                <th key={plan} className="px-4 py-4 text-center text-[14px] font-semibold text-foreground">
                                    {plan}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.label} className={cn(index !== rows.length - 1 && 'border-b border-border')}>
                                <td className="px-6 py-3.5 text-[14px] text-muted-foreground">{row.label}</td>
                                {row.values.map((value, valueIndex) => (
                                    <td key={`${row.label}-${valueIndex}`} className="px-4 py-3.5 text-center">
                                        <MatrixCell value={value} accent={accent} />
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

const SERVER_ACCENT = '#7c9cff'
const STORE_ACCENT = '#48cfae'

const SERVER_FEATURES: Feature[] = [
    {
        icon: 'dns',
        eyebrow: 'Your own server',
        title: 'Home sweet home.',
        body: 'Give your website, application, LLM, database, automation, or game server its own place to run. You get the control of a private virtual machine without the ceremony of a giant cloud platform.',
        image: '/run-it-online.webp',
        points: [
            'A private environment for your workloads',
            'Deploy the stack that makes sense for your project',
            'Room to grow beyond shared hosting and free tiers',
        ],
    },
    {
        icon: 'terminal',
        eyebrow: 'Built for builders',
        title: 'From first deploy to serious product.',
        body: 'Run the work that cannot stay on your laptop: web applications, background jobs, bots, scheduled tasks, internal tools, and the experiments that turn into businesses.',
        image: '/marketing-automate.webp',
        points: [
            'Apps, APIs, workers, databases, and more',
            'A dependable place for always-on services',
            'Useful for founders, developers, agencies, and teams',
        ],
    },
    {
        icon: 'payments',
        eyebrow: 'Clear monthly plans',
        title: 'Start lean. Keep the headroom.',
        body: 'Infrastructure should not come with an invoice that surprises you at the end of the month. Start with the capacity you need now, then move up when the work earns it.',
        image: '/undraw_pay-with-credit-card_77g6.svg',
        points: [
            'Cloud servers from KES 700 per month',
            'Simple monthly billing you can plan around',
            'Choose more capacity when your workload needs it',
        ],
    },
]

const SERVER_STEPS: Step[] = [
    {
        step: '01',
        title: 'Choose your starting point',
        body: 'Pick the server size that suits the project in front of you. Start lean; you can add capacity as the work grows.',
    },
    {
        step: '02',
        title: 'Make it yours',
        body: 'Set up the software, services, and deployment flow you want to run. It is your environment, built around your stack.',
    },
    {
        step: '03',
        title: 'Put it to work',
        body: 'Connect your domain, deploy your project, and give it a stable place to keep running after your laptop closes.',
    },
]

const SERVER_FAQS: FaqEntry[] = [
    {
        q: 'What can I run on a cloud server?',
        a: 'Cloud servers are for workloads that need their own always-on environment: websites, web applications, APIs, worker processes, databases, automation tools, bots, internal dashboards, and game servers. The exact setup depends on the operating system and plan you choose.',
    },
    {
        q: 'Is this shared hosting?',
        a: 'No. A cloud server is a virtual private server: a private virtual machine environment intended for your own workloads. It gives you far more flexibility than a typical shared-hosting account.',
    },
    {
        q: 'Can I start small and upgrade later?',
        a: 'That is the idea. Start with the capacity your current project needs, then move to a larger plan as traffic, data, or background work grows. Check the plan details for the available upgrade path and any migration requirements.',
    },
    {
        q: 'Do you manage the software on my server?',
        a: 'The server is for people who want control of their own environment. You are responsible for the applications and configuration you deploy, while Menengai Cloud provides the underlying server service and account support described by your plan.',
    },
    {
        q: 'How much does a cloud server cost?',
        a: 'Cloud-server plans begin from KES 700 per month. The right plan depends on the memory, compute, storage, bandwidth, operating-system, support, and deployment requirements of your workload.',
    },
]

function ProductSelector({ active, onChange }: { active: Product; onChange: (product: Product) => void }) {
    const products: { id: Product; label: string; detail: string; accent: string; icon: string }[] = [
        {
            id: 'servers',
            label: 'Cloud servers',
            detail: 'For apps, websites, APIs, and infrastructure you build.',
            accent: SERVER_ACCENT,
            icon: 'dns',
        },
        {
            id: 'storefronts',
            label: 'Storefronts',
            detail: 'For businesses ready to sell online without the technical setup.',
            accent: STORE_ACCENT,
            icon: 'storefront',
        },
    ]

    return (
        <div className="grid md:grid-cols-2" aria-label="Choose a product">
            {products.map(product => {
                const selected = active === product.id

                return (
                    <button
                        type="button"
                        key={product.id}
                        onClick={() => onChange(product.id)}
                        className={cn(
                            'relative overflow-hidden border p-6 text-left transition-colors md:p-7 w-full',
                            selected
                                ? 'border-foreground/25 bg-foreground/[0.07]'
                                : 'border-border bg-foreground/[0.02] hover:bg-foreground/[0.045]'
                        )}
                    >
                        {selected && (
                            <div
                                className="absolute inset-x-0 bottom-0 h-1"
                                style={{ backgroundColor: product.accent }}
                            />
                        )}
                        <div className="relative flex items-start gap-4">
                            <span
                                className="flex h-11 w-11 shrink-0 items-center justify-center"
                                style={{ backgroundColor: `${product.accent}22` }}
                            >
                                <span className="material-symbols-outlined text-[21px]" style={{ color: product.accent }}>
                                    {product.icon}
                                </span>
                            </span>
                            <span className="space-y-1.5">
                                <span className="block text-[17px] font-semibold tracking-tight text-foreground">{product.label}</span>
                                <span className="block max-w-xs text-[14px] leading-relaxed text-muted-foreground">{product.detail}</span>
                            </span>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}

function CloudServers() {
    return (
        <>
            <section className="relative overflow-hidden">
                <div
                    className="pointer-events-none absolute left-1/2 top-0 h-[580px] w-[760px] -translate-x-1/2  blur-[150px]"
                />
                <div className="relative z-10 mx-auto max-w-page px-6 py-28 md:px-12 md:py-40">
                    <SectionHeading
                        eyebrow="MCloud servers"
                        accent={SERVER_ACCENT}
                        title={<>A proper home<br />for what you build.</>}
                        sub="Deploy the website, app, API, database, automation, or always-on service that is ready to leave your laptop. Start with a clear monthly plan, then scale when the work earns it."
                    />
                    <FeatureShowcase items={SERVER_FEATURES} accent={SERVER_ACCENT} />
                </div>
            </section>

            <Divider />

            <section className="bg-foreground/[0.02] py-28 md:py-36">
                <div className="mx-auto max-w-page px-6 md:px-12">
                    <SectionHeading
                        eyebrow="How it works"
                        accent={SERVER_ACCENT}
                        title="From an idea to an address on the internet."
                    />
                    <Steps steps={SERVER_STEPS} accent={SERVER_ACCENT} />
                </div>
            </section>

            <Divider />

            <section className="py-28 md:py-36">
                <div className="mx-auto max-w-page px-6 md:px-12">
                    <FadeIn>
                        <div className="relative overflow-hidden">
                            <div className="relative grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end">
                                <div className="space-y-5">
                                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: SERVER_ACCENT }}>
                                        Start lean
                                    </p>
                                    <h2 className="max-w-xl text-2xl font-semibold tracking-[-0.055em] leading-[0.98] text-foreground md:text-5xl">
                                        Serious infrastructure. <br/> A sensible place to begin.
                                    </h2>
                                    <p className="max-w-xl text-[16px] leading-relaxed text-muted-foreground">
                                        Your first cloud server starts from KES 700 per month. Choose the capacity your project needs today, without turning one deploy into a complicated enterprise-cloud decision.
                                    </p>
                                </div>
                                <div className="space-y-5 md:justify-self-end md:text-right">
                                    <img src={'/M-PESA_LOGO-01.svg'} alt="M-PESA" width={512} height={273} className='w-80 h-auto'/>
                                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                                        No credit card required
                                    </p>
                                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /org/* redirects from a route handler, which <Link> can't follow */}
                                    <a
                                        href="/org/servers"
                                        className="inline-flex h-12 items-center justify-center gap-2  px-7 text-[16px] font-semibold text-background transition-opacity hover:opacity-85"
                                        style={{ backgroundColor: SERVER_ACCENT }}
                                    >
                                        Explore cloud servers
                                        <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            <Divider />

            <section className="py-28 md:py-36">
                <div className="mx-auto w-full max-w-3xl px-6 md:px-12">
                    <SectionHeading eyebrow="Frequently Asked Questions" accent={SERVER_ACCENT} title="Getting curious?" />
                    <FaqBlock faqs={SERVER_FAQS} />
                </div>
            </section>

            <Divider />

            <section className="relative overflow-hidden py-32 md:py-44">
                <div
                    className="pointer-events-none absolute bottom-0 left-1/2 h-[420px] w-[760px] -translate-x-1/2  blur-[120px]"
                    style={{ backgroundColor: `${SERVER_ACCENT}2b` }}
                />
                <div className="relative z-10 mx-auto w-full max-w-3xl px-6 text-center md:px-12">
                    <FadeIn className="space-y-7">
                        <h2 className="text-5xl font-semibold tracking-[-0.06em] leading-[0.95] text-foreground md:text-7xl">
                            Give your work a place to run.
                        </h2>
                        <p className="mx-auto max-w-lg text-[16px] leading-relaxed text-muted-foreground">
                            Start with a cloud server built for the project in front of you. Add capacity when that project becomes something bigger.
                        </p>
                        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
                            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /org/* redirects from a route handler, which <Link> can't follow */}
                            <a
                                href="/org/servers"
                                className="flex h-12 items-center justify-center gap-2  px-8 text-[16px] font-semibold text-background transition-opacity hover:opacity-85"
                                style={{ backgroundColor: SERVER_ACCENT }}
                            >
                                Choose a server
                                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                            </a>
                            <Link
                                href="/contact"
                                className="flex h-12 items-center justify-center gap-2  border border-border px-8 text-[16px] text-foreground transition-colors hover:bg-foreground/[0.05]"
                            >
                                Ask a question
                            </Link>
                        </div>
                        <p className="text-[13px] text-muted-foreground/60">Cloud servers from KES 700 per month.</p>
                    </FadeIn>
                </div>
            </section>
        </>
    )
}

function Storefronts() {
    return (
        <>
            <section className="relative overflow-hidden">
                <div
                    className="pointer-events-none absolute left-1/2 top-0 h-[580px] w-[760px] -translate-x-1/2  blur-[150px]"
                                    />
                <div className="relative z-10 mx-auto max-w-page px-6 py-28 md:px-12 md:py-40">
                    <SectionHeading
                        eyebrow="MCloud Storefronts"
                        accent={STORE_ACCENT}
                        title={<>A shop website<br />that takes M-PESA.</>}
                        sub="Not every business needs a server dashboard. If you want a branded shop with products, M-PESA checkout, orders, and a path to your own domain, start here instead."
                    />
                    <FeatureShowcase items={STORE_FEATURES} accent={STORE_ACCENT} />
                </div>
            </section>

            <Divider />

            <section className="bg-foreground/[0.02] py-28 md:py-36">
                <div className="mx-auto max-w-page px-6 md:px-12">
                    <SectionHeading
                        eyebrow="How it works"
                        accent={STORE_ACCENT}
                        title="Your shop can be ready for its first customer today."
                    />
                    <Steps steps={STORE_STEPS} accent={STORE_ACCENT} />
                </div>
            </section>

            <Divider />

            <section className="py-28 md:py-36">
                <div className="mx-auto max-w-page space-y-12 px-6 md:px-12">
                    <SectionHeading
                        eyebrow="Storefront pricing"
                        accent={STORE_ACCENT}
                        title="Start free. Grow when it makes sense."
                        sub="There is no card required to launch. Move up only when your brand needs more room, more insight, or its own name in the address bar."
                    />
                    <PricingCards plans={STORE_PLANS} accent={STORE_ACCENT} />
                    <FeatureMatrix plans={STORE_MATRIX.plans} rows={STORE_MATRIX.rows} accent={STORE_ACCENT} />
                </div>
            </section>

            <Divider />

            <section className="py-28 md:py-36">
                <div className="mx-auto w-full max-w-3xl px-6 md:px-12">
                    <SectionHeading eyebrow="Questions" accent={STORE_ACCENT} title="Questions people ask first" />
                    <FaqBlock faqs={STORE_FAQS} />
                </div>
            </section>

            <Divider />

            <section className="relative overflow-hidden py-32 md:py-44">
                <div
                    className="pointer-events-none absolute bottom-0 left-1/2 h-[420px] w-[760px] -translate-x-1/2  blur-[120px]"
                    style={{ backgroundColor: `${STORE_ACCENT}2b` }}
                />
                <div className="relative z-10 mx-auto w-full max-w-3xl px-6 text-center md:px-12">
                    <FadeIn className="space-y-7">
                        <h2 className="text-5xl font-semibold tracking-[-0.06em] leading-[0.95] text-foreground md:text-7xl">
                            Make the shop people remember.
                        </h2>
                        <p className="mx-auto max-w-lg text-[16px] leading-relaxed text-muted-foreground">
                            Begin with a real storefront, not another temporary workaround. Bring your products and your brand; we take care of the platform that keeps it open.
                        </p>
                        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
                            <Link
                                href="/auth/sign-up"
                                className="flex h-12 items-center justify-center gap-2  px-8 text-[16px] font-semibold text-background transition-opacity hover:opacity-85"
                                style={{ backgroundColor: STORE_ACCENT }}
                            >
                                Start a storefront free
                                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                            </Link>
                            <Link
                                href="#storefront-pricing"
                                className="flex h-12 items-center justify-center gap-2  border border-border px-8 text-[16px] text-foreground transition-colors hover:bg-foreground/[0.05]"
                            >
                                View pricing
                            </Link>
                        </div>
                        <p className="text-[13px] text-muted-foreground/60">No card required. Upgrade when your business needs more.</p>
                    </FadeIn>
                </div>
            </section>
        </>
    )
}

export default function HomeClient() {
    const [product, setProduct] = useState<Product>('servers')

    return (
        <div className="min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
            <section className="relative overflow-hidden">
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.035] text-foreground"
                />
                <div
                    className="pointer-events-none absolute left-1/2 top-[-260px] h-[660px] w-[980px] -translate-x-1/2  blur-[150px]"
                />

                <div className="relative z-10 mx-auto max-w-page px-6 pb-24 pt-16 md:px-12 md:pb-32 md:pt-24">
                    <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
                        <div className="space-y-9">
                            <div className="heroCopy space-y-6">
                                <p className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: SERVER_ACCENT }}>
                                    Menengai Cloud
                                </p>
                                <h1 className="text-4xl font-semibold tracking-[-0.07em] leading-[0.92] text-foreground sm:text-5xl md:text-5xl lg:text-[3.6rem]">
                                    Build what&apos;s next.<br />Put it online today.
                                </h1>
                                <p className="max-w-xl text-[17px] leading-relaxed text-muted-foreground md:text-[19px]">
                                    Cloud servers for the apps, websites, APIs, and ideas you are ready to take seriously. Or launch a storefront that is ready to sell without the technical setup.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /org/* redirects from a route handler, which <Link> can't follow */}
                                <a
                                    href="/org/servers"
                                    className="flex h-12 items-center justify-center gap-2  px-7 text-[16px] font-semibold text-background transition-opacity hover:opacity-85"
                                    style={{ backgroundColor: SERVER_ACCENT }}
                                >
                                    Deploy server
                                    <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                                </a>
                                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /org/* redirects from a route handler, which <Link> can't follow */}
                                <a
                                    href="/org/stores?new=1"
                                    className="flex h-12 items-center justify-center gap-2  border border-border px-7 text-[16px] font-medium text-foreground transition-colors hover:bg-foreground/[0.05]"
                                >
                                    Start a storefront free
                                    <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                                </a>
                            </div>

                            <p className="text-[13px] text-muted-foreground/65">
                                Cloud servers from KES 700/month. Storefronts are free to start.
                            </p>
                        </div>

                        <div className="heroArt relative hidden min-h-[370px] overflow-hidden bg-transparent p-8 md:block">
                            <div className="absolute left-1/2 top-1/2 h-90 w-90 -translate-x-1/2 -translate-y-1/2 bg-transparent" />
                            {product === 'servers' ? (
                                <div key="server-hero" className="animate-fade-in relative z-10 flex h-full flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <img src={'/marketing-digital-warehouse.webp'} alt="" width={1050} height={700} className='w-240 h-auto'/>
                                    </div>
                                </div>
                            ) : (
                                <div key="store-hero" className="animate-fade-in relative z-10 flex h-full flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <img src={'/marketing-automate.webp'} alt="" width={1050} height={700} className='w-240 h-auto'/>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section id="products" className="">
                <div className="mx-auto max-w-5xl px-6 md:px-12">
                    <SectionHeading
                        eyebrow="Choose your launchpad"
                        title={<>One platform.<br />Two ways to move.</>}
                        sub="Build and run your own infrastructure, or choose the shortest path from product idea to a live online shop."
                        centered
                    />
                </div>
                <div className="mx-auto mt-12 max-w-page px-6 md:px-12">
                    <FadeIn>
                        <ProductSelector active={product} onChange={setProduct} />
                    </FadeIn>
                </div>
            </section>

            <Divider />

            <main key={product} className="animate-fade-in">
                {product === 'servers' ? <CloudServers /> : <Storefronts />}
            </main>

            <section className="border-t border-border py-16 md:py-20">
                <div className="mx-auto max-w-page px-6 md:px-12">
                    <FadeIn>
                        <div className="grid gap-6  border border-border bg-foreground/[0.025] p-7 md:grid-cols-[1fr_360px] md:items-center md:p-9">
                            <div className="space-y-2">
                                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">Early access</p>
                                <h2 className="text-2xl font-semibold tracking-[-0.035em] text-foreground">The Menengai Cloud mobile app is taking shape.</h2>
                                <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                                    Join the Android beta to try it early and help shape what comes next.
                                </p>
                            </div>
                            <div>
                                <BetaSignupForm source="homepage" />
                                <p className="mt-3 text-[13px] text-muted-foreground/55">
                                    Use a Google account (Gmail). Android beta installs are delivered through Google Play.
                                </p>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>
        </div>
    )
}