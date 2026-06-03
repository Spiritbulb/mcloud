'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CookieBanner } from './cookie-banner'

// ─── Types ────────────────────────────────────────────────────────────────────

type FaqEntry = { q: string; a: string }

// ─── Data ─────────────────────────────────────────────────────────────────────

const FAQS: FaqEntry[] = [
    {
        q: 'What does "managed" actually mean here?',
        a: 'Your application runs on our infrastructure, and we keep it running — SSL, deployments, uptime, updates. You configure it and own the brand; the servers are our problem, not yours.',
    },
    {
        q: 'Can I use my own domain?',
        a: 'Yes, and you should. Point your DNS to us, add the domain in your dashboard, and SSL is provisioned automatically. Your name is in the address bar, never ours.',
    },
    {
        q: 'How much does a storefront cost?',
        a: 'Storefronts start at KES 1,500/mo and you can set one up yourself without talking to anyone. Trading apps are quoted per project — reach out and we\'ll scope it.',
    },
    {
        q: 'What trading APIs do you support?',
        a: 'We deploy branded trading applications on top of leading trading APIs. We have a default integration ready to go, and if your organisation already holds access to a premium API, we build on that instead.',
    },
    {
        q: 'How is everything organised?',
        a: 'An organisation is your top-level account. It can hold multiple storefronts and trading apps, each with their own team members, under one login and one bill.',
    },
]

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
        <div className="border-b border-white/8 last:border-0">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-start justify-between w-full gap-6 text-left py-5"
            >
                <span className="text-[15px] font-medium text-white/90 leading-snug">{q}</span>
                <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="material-symbols-outlined text-[18px] text-white/40 shrink-0 mt-0.5 select-none"
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
                        <p className="text-[14px] text-white/60 leading-relaxed pb-5">{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── DoorCard ─────────────────────────────────────────────────────────────────
// The two-door fork. This IS the homepage — state the shared promise, then split.

function StorefrontIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <path d="M3 4h14a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M3 9v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
    )
}

function TradingIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <path d="M3 14l4-4 3 3 4-5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="1" y="1" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.4" />
        </svg>
    )
}

function DoorCard({
    accent, icon, label, price, headline, body, cta, href, primary, delay,
}: {
    accent: string
    icon: React.ReactNode
    label: string
    price: string
    headline: string
    body: string
    cta: string
    href: string
    primary?: boolean
    delay: number
}) {
    return (
        <FadeIn delay={delay} className="h-full">
            <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25 }}
                className="relative border-t border-white/10 bg-white/[0.04] p-8 flex flex-col gap-6 h-full hover:border-white/20 hover:bg-white/[0.06] transition-colors duration-300"
            >
                {/* subtle accent glow on the card edge */}
                <div className="absolute -inset-px rounded-2xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity"
                    style={{ background: `radial-gradient(400px circle at 50% 0%, ${accent}14, transparent 70%)` }} />

                <div className="flex items-center justify-between">

                    <span className="text-[13px] font-medium text-white/55">{price}</span>
                </div>

                <div className="space-y-2.5 flex-1">
                    <span className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: accent }}>{label}</span>
                    <h3 className="text-[22px] font-semibold text-white leading-snug">{headline}</h3>
                    <p className="text-[14px] text-white/60 leading-relaxed">{body}</p>
                </div>

                <Link
                    href={href}
                    className={cn(
                        'h-11 px-5 rounded-full text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors',
                        primary
                            ? 'bg-white text-[#0a0a0a] hover:bg-white/90'
                            : 'border border-white/15 text-white/80 hover:text-white hover:border-white/30'
                    )}
                >
                    {cta}
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
            </motion.div>
        </FadeIn>
    )
}

// ─── HomeClient ───────────────────────────────────────────────────────────────

export default function HomeClient() {
    return (
        <div className="min-h-[100dvh] bg-[#0a0a0a] text-white overflow-x-hidden">

            {/* ── HERO + FORK ──────────────────────────────────────────────── */}
            <section className="relative">

                {/* Grid overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '72px 72px' }} />

                <div className="relative z-10 container mx-auto px-6 md:px-12 max-w-5xl w-full pt-28 pb-20 md:pt-36 md:pb-28">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                        className="max-w-3xl space-y-7"
                    >

                        <h1 className="text-[3rem] md:text-[4.2rem] font-bold leading-[1.05] tracking-tight text-white">
                            Run something online<br />
                            that&apos;s actually yours.
                        </h1>

                        <p className="text-[17px] text-white/65 leading-relaxed max-w-[560px]">
                            Getting a business online here usually means wrestling with WordPress or paying a dev who vanishes after launch. Menengai Cloud is the third option — you bring the brand, we run the infrastructure underneath it. Two ways in:
                        </p>
                    </motion.div>

                    {/* The fork */}
                    <div className="grid md:grid-cols-2 gap-5 mt-12 max-w-4xl">
                        <DoorCard
                            delay={0.1}
                            primary
                            accent="#415f91"
                            icon={<StorefrontIcon />}
                            label="Storefront"
                            price="from KES 1,500/mo"
                            headline="Sell online, properly."
                            body="A managed online shop on your own domain — products, orders, Paystack, a blog. Set it up in an afternoon. We handle everything underneath so it just stays up."
                            cta="Start free"
                            href="/auth/sign-up"
                        />
                        <DoorCard
                            delay={0.2}
                            accent="#7c5cbf"
                            icon={<TradingIcon />}
                            label="Trading Apps"
                            price="Talk to us"
                            headline="A trading platform with your name on it."
                            body="A fully branded trading application connected to leading trading APIs. We build and run the whole stack; you go to market under your own brand instead of a referral link."
                            cta="Contact sales"
                            href="/contact"
                        />
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
            <section className="py-28 md:py-36">
                <div className="container mx-auto px-6 md:px-12 max-w-5xl">
                    <FadeIn className="mb-16 space-y-3">
                        <p className="text-[12px] font-semibold uppercase tracking-widest text-white/40">How it works</p>
                        <h2 className="text-[2.2rem] md:text-[2.8rem] font-bold text-white tracking-tight">
                            Signup to live in an afternoon.
                        </h2>
                    </FadeIn>
                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { step: '01', title: 'Create an organisation', body: 'Your org holds everything — apps, team members, billing. One login for the lot.' },
                            { step: '02', title: 'Launch an app', body: 'Add a storefront yourself, or talk to us about a trading app. Fill in your branding and preferences.' },
                            { step: '03', title: 'Connect your domain', body: 'Point your DNS to us. SSL gets provisioned automatically — nothing to configure on your side.' },
                            { step: '04', title: 'Go live', body: 'It deploys and we keep it running. Uptime, updates, and the 2am stuff are on us.' },
                        ].map((item, i) => (
                            <FadeIn key={i} delay={i * 0.1}>
                                <div className="space-y-4">
                                    <span className="text-[11px] font-bold text-white/30 tracking-widest">{item.step}</span>
                                    <div className="w-px h-8 bg-gradient-to-b from-white/25 to-transparent ml-0.5" />
                                    <h3 className="text-[15px] font-semibold text-white">{item.title}</h3>
                                    <p className="text-[13px] text-white/55 leading-relaxed">{item.body}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── DIVIDER ──────────────────────────────────────────────────── */}
            <div className="border-t border-white/6" />

            {/* ── WHY MENENGAI ─────────────────────────────────────────────── */}
            <section className="py-28 md:py-36 bg-white/[0.02]">
                <div className="container mx-auto px-6 md:px-12 max-w-5xl">
                    <FadeIn className="mb-16 space-y-3">
                        <p className="text-[12px] font-semibold uppercase tracking-widest text-white/40">Why Menengai</p>
                        <h2 className="text-[2.2rem] md:text-[2.8rem] font-bold text-white tracking-tight">
                            We&apos;re the infrastructure.<br className="hidden md:block" /> The business is yours.
                        </h2>
                        <p className="text-[15px] text-white/55 max-w-xl leading-relaxed pt-2">
                            Your customers, your content, your revenue, your brand in the address bar. Those belong to you entirely — we just keep the lights on behind them.
                        </p>
                    </FadeIn>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: 'inventory',
                                title: 'Nothing to babysit',
                                body: 'SSL, deployments, uptime, updates — handled automatically. You never open a server dashboard or fight a cPanel.',
                            },
                            {
                                icon: 'domain',
                                title: 'Your own domain',
                                body: 'Every app runs on your domain with automatic SSL. Your name out front, not a subdomain of ours.',
                            },
                            {
                                icon: 'group',
                                title: 'One account, everything under it',
                                body: 'All your apps sit inside your organisation. Invite your team, manage access, keep billing in one place.',
                            },
                            {
                                icon: 'lock',
                                title: 'You own what matters',
                                body: 'Customers, data, and revenue stay yours. We run the pipes; we don\'t touch the relationship.',
                            },
                            {
                                icon: 'bolt',
                                title: 'No setup overhead',
                                body: 'No DevOps ticket, no environment to wire up. Fill in a form, connect a domain, and you\'re shipping.',
                            },
                            {
                                icon: 'public',
                                title: 'Built for here',
                                body: 'Paystack out of the box, pricing in shillings, and a setup that assumes you\'d rather not learn what a load balancer is.',
                            },
                        ].map((item, i) => (
                            <FadeIn key={i} delay={i * 0.07}>
                                <div className="space-y-3 p-6 rounded-2xl border border-white/8 hover:border-white/15 hover:bg-white/[0.03] transition-all duration-200 h-full">
                                    <span
                                        className="material-symbols-outlined text-[20px] text-white/45"
                                        style={{ fontVariationSettings: "'FILL' 0" }}
                                    >
                                        {item.icon}
                                    </span>
                                    <h3 className="text-[15px] font-semibold text-white">{item.title}</h3>
                                    <p className="text-[13px] text-white/55 leading-relaxed">{item.body}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── DIVIDER ──────────────────────────────────────────────────── */}
            <div className="border-t border-white/6" />

            {/* ── FAQ ──────────────────────────────────────────────────────── */}
            <section className="py-28 md:py-36">
                <div className="container mx-auto px-6 md:px-12 max-w-3xl">
                    <FadeIn className="mb-14 space-y-3">
                        <p className="text-[12px] font-semibold uppercase tracking-widest text-white/40">FAQ</p>
                        <h2 className="text-[2.2rem] md:text-[2.8rem] font-bold text-white tracking-tight">Common questions.</h2>
                    </FadeIn>
                    <FadeIn>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-6 py-2">
                            {FAQS.map((faq, i) => <FaqItem key={i} {...faq} />)}
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ── DIVIDER ──────────────────────────────────────────────────── */}
            <div className="border-t border-white/6" />

            {/* ── FINAL CTA ────────────────────────────────────────────────── */}
            <section className="relative py-36 md:py-44 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#415f91]/15 rounded-full blur-[100px]" />
                </div>
                <div className="relative z-10 container mx-auto px-6 md:px-12 max-w-3xl text-center">
                    <FadeIn className="space-y-7">
                        <h2 className="text-[2.8rem] md:text-[3.8rem] font-bold text-white leading-[1.05] tracking-tight">
                            Put your own name on it.
                        </h2>
                        <p className="text-[16px] text-white/55 max-w-lg mx-auto leading-relaxed">
                            Spin up a storefront yourself, or talk to us about a trading app. Either way you skip every infrastructure decision.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                            <Link
                                href="/auth/sign-up"
                                className="h-12 px-8 rounded-full bg-white text-[#0a0a0a] text-[15px] font-semibold hover:bg-white/90 transition-colors flex items-center gap-2"
                            >
                                Start a storefront free
                                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                            </Link>
                            <Link
                                href="/contact"
                                className="h-12 px-8 rounded-full border border-white/15 text-[15px] text-white/70 hover:text-white hover:border-white/30 transition-colors flex items-center gap-2"
                            >
                                Talk to us about trading apps
                            </Link>
                        </div>
                        <p className="text-[12px] text-white/30">
                            Storefronts from KES 1,500/mo · No card required to start
                        </p>
                    </FadeIn>
                </div>
            </section>

            <CookieBanner />
        </div>
    )
}