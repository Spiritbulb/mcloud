'use client'

import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import type { Variants } from "framer-motion"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Sticker     = { src: string; x: string; y: string; delay: number; duration: number }
type MarqueeItem = { label: string; icon: string }
type Feature     = { eyebrow: string; title: string; body: string; image: string; alt: string; reverse: boolean }
type FaqEntry    = { q: string; a: string }
type ValueEntry  = { icon: string; title: string; body: string }
type WhyEntry    = { icon: string; title: string; body: string }
type ShowcaseEntry = { slug: string; type: string; emoji: string }

// ─── Data ─────────────────────────────────────────────────────────────────────

const SAMPLE_SLUGS = [
    "sneakercity", "joy-bakery", "mwanikimania",
    "hope-foundation", "purity-hair-care", "photos-by-sam",
]

const STICKERS: Sticker[] = [
    { src: "https://img.icons8.com/3d-fluency/94/movie-video-camera.png", x: "6%",  y: "20%", delay: 0,   duration: 6 },
    { src: "https://img.icons8.com/3d-fluency/94/bank-card-back-side.png", x: "88%", y: "15%", delay: 0.5, duration: 7 },
    { src: "https://img.icons8.com/3d-fluency/94/sparkling-1.png",         x: "78%", y: "65%", delay: 1,   duration: 5 },
]

const AVATARS = [
    "https://i.pravatar.cc/40?img=27",
    "https://i.pravatar.cc/40?img=56",
    "https://i.pravatar.cc/40?img=70",
    "https://i.pravatar.cc/40?img=16",
    "https://i.pravatar.cc/40?img=18",
]

const MARQUEE_ITEMS: MarqueeItem[] = [
    { label: "E-Commerce",   icon: "https://img.icons8.com/3d-fluency/94/shopping-bag.png" },
    { label: "Blog",         icon: "https://img.icons8.com/3d-fluency/94/rss.png" },
    { label: "Streaming",    icon: "https://img.icons8.com/3d-fluency/94/movie-video-camera.png" },
    { label: "Portfolio",    icon: "https://img.icons8.com/3d-fluency/94/color-palette.png" },
    { label: "Music",        icon: "https://img.icons8.com/3d-fluency/94/musical-notes.png" },
    { label: "Beauty",       icon: "https://img.icons8.com/3d-fluency/94/lipstick.png" },
    { label: "Food",         icon: "https://img.icons8.com/3d-fluency/94/salami-pizza.png" },
    { label: "Fashion",      icon: "https://img.icons8.com/3d-fluency/94/clothes.png" },
    { label: "Fitness",      icon: "https://img.icons8.com/3d-fluency/94/dumbbell.png" },
    { label: "Photography",  icon: "https://img.icons8.com/3d-fluency/94/camera.png" },
    { label: "Gaming",       icon: "https://img.icons8.com/3d-fluency/94/controller.png" },
    { label: "Travel",       icon: "https://img.icons8.com/3d-fluency/94/sun-lounger.png" },
]

const FEATURES: Feature[] = [
    {
        eyebrow: "One link. Everything.",
        title:   "Sell, post, grow. All from one place.",
        body:    "Products, blog posts, bookings, a subscriber list. It all lives under one link. You don't need five different tools duct-taped together — you need one that does the job and stays out of your way.",
        image:   "/undraw_project-completed_ug9i.svg",
        alt:     "Creator with store",
        reverse: false,
    },
    {
        eyebrow: "No middlemen",
        title:   "Your site. Not theirs.",
        body:    "Agencies are expensive, slow, and hand you back a site you're scared to touch. With Menengai Cloud your store is live before they'd even reply to your inquiry. And you can change anything, anytime, without calling anyone.",
        image:   "/phone.svg",
        alt:     "Store on mobile",
        reverse: true,
    },
    {
        eyebrow: "No pressure",
        title:   "Free doesn't expire.",
        body:    "Your subdomain store is free forever — no trial countdown, no ads, no credit card sitting nervously on file. When you want more (custom domain, removed branding, priority support), one upgrade gets you there. When you're ready. Not when we decide.",
        image:   "/undraw_website-builder_4go7.svg",
        alt:     "Custom domain setup",
        reverse: false,
    },
]

const VALUE_ITEMS: ValueEntry[] = [
    {
        icon:  "https://img.icons8.com/3d-fluency/94/lightning-bolt.png",
        title: "Live before you overthink it",
        body:  "Sign up, pick a name, your store exists. No forms, no calls, no 'our team will be in touch.' Just a link the world can visit.",
    },
    {
        icon:  "https://img.icons8.com/3d-fluency/94/security-checked.png",
        title: "We handle the boring parts",
        body:  "SSL, backups, uptime. All running quietly in the background. You'll never google 'how to renew SSL certificate' at midnight. We've already done it.",
    },
    {
        icon:  "https://img.icons8.com/3d-fluency/94/money-bag.png",
        title: "Free isn't a trick",
        body:  "The free plan is genuinely free. No credit card, no expiry, no surprise invoice. Upgrade because you want more — not because we cut you off.",
    },
    {
        icon:  "https://img.icons8.com/3d-fluency/94/globe.png",
        title: "Yours. Actually yours.",
        body:  "Your content, your customers, your revenue. We're the infrastructure. You're the business. Those are different things and we know it.",
    },
]

const WHY_ITEMS: WhyEntry[] = [
    {
        icon:  "https://img.icons8.com/3d-fluency/94/lightning-bolt.png",
        title: "Actually instant",
        body:  "No waiting, no onboarding call, no 'we'll set you up in 3-5 business days.' Your store is live before you finish reading this.",
    },
    {
        icon:  "https://img.icons8.com/3d-fluency/94/security-checked.png",
        title: "Actually maintained",
        body:  "SSL, backups, uptime monitoring — handled. You'll never open a server dashboard or a cPanel ever again. You're welcome.",
    },
    {
        icon:  "https://img.icons8.com/3d-fluency/94/globe.png",
        title: "Actually yours",
        body:  "Your content, your audience, your money. We provide the infrastructure. Everything else belongs to you, including the customer relationships.",
    },
]

// Replaces TESTIMONIALS — showcase slugs instead of fake people
const SHOWCASE: ShowcaseEntry[] = [
    { slug: "joy-bakery",       type: "Bakery & catering",   emoji: "🧁" },
    { slug: "photos-by-sam",    type: "Photography portfolio", emoji: "📷" },
    { slug: "purity-hair-care", type: "Beauty & wellness",    emoji: "✨" },
    { slug: "sneakercity",      type: "Streetwear store",     emoji: "👟" },
    { slug: "hope-foundation",  type: "Non-profit",           emoji: "🌱" },
    { slug: "mwanikimania",     type: "Creator blog",         emoji: "✍️" },
]

const FAQS: FaqEntry[] = [
    {
        q: "Does my free store stay free forever?",
        a: "Yes. No expiry, no ads injected, no gotcha. Upgrade only if you want extras like a custom domain.",
    },
    {
        q: "What's the difference between the free plan and a free trial?",
        a: "Free plan is permanent — store, subdomain, core features, no time limit. Free trial lets you test Hobby or Pro before paying for it. Two different things.",
    },
    {
        q: "What happens to my content if I stop paying?",
        a: "Nothing gets deleted. You drop back to the free plan. Store stays live. You just lose the paid features until you come back.",
    },
    {
        q: "How is this different from other website builders?",
        a: "Most builders are either too simple (you outgrow them in a month) or too complicated (you need a YouTube tutorial to change a button colour). We picked a lane.",
    },
    {
        q: "Can I migrate my existing content?",
        a: "Yes. Blog posts, product catalogs — reach out to support and we'll do it for you. No charge.",
    },
    {
        q: "Do I need a business registration to sign up?",
        a: "No. Email address. That's it. Add business details later if you need to.",
    },
]

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp: Variants = {
    hidden:  { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
}

const stagger: Variants = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.1 } },
}

// ─── useTypewriter ────────────────────────────────────────────────────────────

function useTypewriter(slugs: string[], locked: boolean) {
    const [display, setDisplay] = useState("")
    const [index,   setIndex]   = useState(0)
    const [typing,  setTyping]  = useState(true)

    useEffect(() => {
        if (locked) return
        const current = slugs[index]
        let i = 0
        let timeout: ReturnType<typeof setTimeout>

        if (typing) {
            const type = () => {
                if (i <= current.length) {
                    setDisplay(current.slice(0, i++))
                    timeout = setTimeout(type, 75)
                } else {
                    timeout = setTimeout(() => setTyping(false), 2000)
                }
            }
            type()
        } else {
            i = current.length
            const erase = () => {
                if (i >= 0) {
                    setDisplay(current.slice(0, i--))
                    timeout = setTimeout(erase, 35)
                } else {
                    setIndex(p => (p + 1) % slugs.length)
                    setTyping(true)
                }
            }
            erase()
        }

        return () => clearTimeout(timeout)
    }, [index, typing, locked, slugs])

    return display
}

// ─── FadeIn ───────────────────────────────────────────────────────────────────

function FadeIn({ children, className, delay = 0 }: {
    children: React.ReactNode
    className?: string
    delay?: number
}) {
    const ref    = useRef(null)
    const inView = useInView(ref, { once: true, margin: "-72px" })

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

// ─── FloatingSticker ──────────────────────────────────────────────────────────

function FloatingSticker({ s, size = 48 }: { s: Sticker; size?: number }) {
    return (
        <motion.div
            className="absolute select-none pointer-events-none z-10"
            style={{ left: s.x, top: s.y }}
            animate={{ y: [0, -14, 0], rotate: [-3, 3, -3] }}
            transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        >
            <Image src={s.src} alt="" width={size} height={size} className="drop-shadow-xl" unoptimized />
        </motion.div>
    )
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest border border-[var(--md-sys-color-primary)]/30 bg-[var(--md-sys-color-primary)]/8 text-[var(--md-sys-color-primary)]">
            {children}
        </span>
    )
}

// ─── PrimaryButton ────────────────────────────────────────────────────────────

function PrimaryButton({
    children,
    onClick,
    size = 'md',
    pill = false,
}: {
    children: React.ReactNode
    onClick?: () => void
    size?: 'md' | 'lg'
    pill?: boolean
}) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={cn(
                'inline-flex items-center justify-center gap-2 font-semibold',
                'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]',
                'transition-opacity hover:opacity-90',
                pill ? 'rounded-full' : 'rounded-xl',
                size === 'lg' ? 'h-14 px-8 text-[16px]' : 'h-11 px-6 text-[14px]',
            )}
        >
            {children}
        </motion.button>
    )
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl border border-[var(--md-sys-color-outline)] text-[14px] font-medium text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container)] transition-colors"
        >
            {children}
        </motion.button>
    )
}

// ─── FaqItem ──────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: FaqEntry) {
    const [open, setOpen] = useState(false)

    return (
        <div className="border-b border-[var(--md-sys-color-outline-variant)] last:border-0">
            <button
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                className="flex items-center justify-between w-full gap-4 text-left py-5"
            >
                <span className="text-[15px] font-medium text-[var(--md-sys-color-on-surface)] leading-snug">
                    {q}
                </span>
                <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="material-symbols-outlined text-[20px] text-[var(--md-sys-color-on-surface-variant)] shrink-0 select-none"
                >
                    add
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                        className="overflow-hidden"
                    >
                        <p className="text-[14px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed pb-5">
                            {a}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── ShowcaseCard ─────────────────────────────────────────────────────────────

function ShowcaseCard({ item, delay }: { item: ShowcaseEntry; delay: number }) {
    return (
        <FadeIn delay={delay}>
            <div className="group flex items-center gap-4 rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-5 py-4 hover:border-[var(--md-sys-color-primary)]/40 hover:shadow-sm transition-all duration-200">
                <span className="text-2xl select-none">{item.emoji}</span>
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)] truncate">
                        {item.slug}.menengai.cloud
                    </p>
                    <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">{item.type}</p>
                </div>
                <span className="material-symbols-outlined text-[16px] text-[var(--md-sys-color-on-surface-variant)]/40 group-hover:text-[var(--md-sys-color-primary)] transition-colors ml-auto shrink-0">
                    open_in_new
                </span>
            </div>
        </FadeIn>
    )
}

// ─── NewsletterSection ────────────────────────────────────────────────────────

function NewsletterSection() {
    const [email, setEmail] = useState("")
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = () => {
        if (!email.trim()) return
        // TODO: wire to Beehiiv
        setSubmitted(true)
    }

    return (
        <section className="bg-[var(--md-sys-color-surface-container)] py-20 md:py-28">
            <div className="container mx-auto px-6 md:px-12 max-w-2xl text-center">
                <FadeIn className="space-y-6">
                    <p className="text-[12px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-primary)]">
                        Stay in the loop
                    </p>
                    <h2 className="text-[1.8rem] md:text-[2.2rem] font-montserrat font-extrabold text-[var(--md-sys-color-on-surface)] leading-[1.1] tracking-tight">
                        Not ready to launch yet?<br />
                        <span className="text-[var(--md-sys-color-primary)]">Fine. Stay close.</span>
                    </h2>
                    <p className="text-[15px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed max-w-md mx-auto">
                        Creator tips, platform updates, and occasionally something that might just pay for itself. No spam. Unsubscribe whenever.
                    </p>

                    <AnimatePresence mode="wait">
                        {submitted ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-center gap-2 text-[var(--md-sys-color-primary)] font-medium text-[15px]"
                            >
                                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    check_circle
                                </span>
                                You're in. Watch your inbox.
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                            >
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                    placeholder="your@email.com"
                                    className={cn(
                                        "flex-1 h-11 px-4 rounded-xl text-[14px] outline-none",
                                        "border-2 border-[var(--md-sys-color-outline-variant)]",
                                        "focus:border-[var(--md-sys-color-primary)]",
                                        "bg-[var(--md-sys-color-surface)]",
                                        "text-[var(--md-sys-color-on-surface)]",
                                        "placeholder:text-[var(--md-sys-color-on-surface-variant)]/40",
                                        "transition-colors duration-150"
                                    )}
                                />
                                <PrimaryButton onClick={handleSubmit} size="md">
                                    Subscribe
                                </PrimaryButton>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]/60">
                        Subscribers get early access and platform credits sometimes. Just saying.
                    </p>
                </FadeIn>
            </div>
        </section>
    )
}

// ─── HomeClient ───────────────────────────────────────────────────────────────

export default function HomeClient() {
    const [slug, setSlug] = useState("")
    const displaySlug     = useTypewriter(SAMPLE_SLUGS, !!slug.trim())

    const handleClaim = () => {
        const destination = slug.trim()
            ? `/auth/sign-up?slug=${encodeURIComponent(slug.trim())}`
            : "/auth/sign-up"
        window.location.href = destination
    }

    const handleTrial = () => {
        window.location.href = "/auth/sign-up?plan=hobby&trial=true"
    }

    return (
        <div className="min-h-[100dvh] bg-[var(--md-sys-color-background)] overflow-x-hidden">

            {/* ── HERO ─────────────────────────────────────────────────────── */}
            <section className="relative min-h-[90dvh] flex items-center bg-[var(--md-sys-color-background)] overflow-hidden">


                <div className="relative z-10 container mx-auto px-6 md:px-12 max-w-6xl w-full py-14 md:py-12">
                    <div className="grid md:grid-cols-2 gap-16 items-center">

                        <motion.div
                            variants={stagger}
                            initial="hidden"
                            animate="visible"
                            className="space-y-7"
                        >

                            {/* Headline */}
                            <motion.h1
                                variants={fadeUp}
                                className="text-[2.8rem] md:text-[3.5rem] font-montserrat font-extrabold text-[var(--md-sys-color-on-background)] leading-[1.06] tracking-tight"
                            >
                                The easiest way<br />
                                <span className="text-[var(--md-sys-color-primary)]">
                                    to sell online
                                </span>
                            </motion.h1>

                            {/* Subheadline */}
                            <motion.p
                                variants={fadeUp}
                                className="text-[16px] text-[var(--md-sys-color-on-surface-variant)] max-w-[440px] leading-relaxed"
                            >
                                We built this to help creators sell things, share their work, and build their audiences. Your business deserves a home that can scale with you.
                            </motion.p>

                            {/* Slug claim box */}
                            <motion.div variants={fadeUp} className="space-y-3 max-w-[480px]">
                                <div className={cn(
                                    'flex items-center rounded-xl overflow-hidden',
                                    'border-2 border-[var(--md-sys-color-outline-variant)]',
                                    'focus-within:border-[var(--md-sys-color-primary)]',
                                    'bg-[var(--md-sys-color-surface)] transition-colors duration-150'
                                )}>
                                    <span className="pl-4 pr-1 text-[14px] text-[var(--md-sys-color-on-surface-variant)] whitespace-nowrap select-none font-medium">
                                        menengai.cloud/
                                    </span>
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        onKeyDown={e => e.key === 'Enter' && handleClaim()}
                                        placeholder={displaySlug || "your-store-name"}
                                        className="flex-1 bg-transparent pr-3 py-3.5 text-[14px] text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/35 outline-none"
                                        maxLength={48}
                                        spellCheck={false}
                                        autoComplete="off"
                                        autoCapitalize="off"
                                        aria-label="Your store slug"
                                    />
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <PrimaryButton onClick={handleClaim} size="md">
                                        Grab it free
                                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                    </PrimaryButton>
                                </div>
                            </motion.div>
                        </motion.div>

                        {/* Hero image */}
                        <motion.div
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.65, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                            className="hidden md:flex justify-center items-center"
                        >
                            <Image
                                src="/settings-mockup.png"
                                alt="Store preview"
                                width={580}
                                height={580}
                                className="object-contain drop-shadow-2xl"
                                priority
                            />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── MARQUEE ──────────────────────────────────────────────────── */}
            <div className="border-y border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] py-3.5 overflow-hidden">
                <div className="flex animate-marquee whitespace-nowrap">
                    {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                        <span
                            key={i}
                            className="inline-flex items-center gap-2 mx-8 text-[12px] font-medium text-[var(--md-sys-color-on-surface-variant)]"
                        >
                            <Image src={item.icon} alt={item.label} width={20} height={20} unoptimized />
                            {item.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── FEATURES ─────────────────────────────────────────────────── */}
            {FEATURES.map((f, i) => (
                <section
                    key={i}
                    className={cn(
                        'py-24 md:py-32',
                        i % 2 !== 0
                            ? 'bg-[var(--md-sys-color-surface-container-low)]'
                            : 'bg-[var(--md-sys-color-background)]'
                    )}
                >
                    <div className={cn(
                        'container mx-auto px-6 md:px-12 max-w-6xl',
                        'flex flex-col gap-14 items-center',
                        f.reverse ? 'md:flex-row-reverse' : 'md:flex-row'
                    )}>
                        <FadeIn className="flex-1">
                            <img src={f.image} alt={f.alt} className="w-full max-h-[28rem] object-contain" />
                        </FadeIn>
                        <FadeIn className="flex-1 space-y-5" delay={0.15}>
                            
                            <h2 className="text-[2rem] md:text-[2.4rem] font-montserrat font-extrabold leading-[1.1] text-[var(--md-sys-color-on-surface)] tracking-tight">
                                {f.title}
                            </h2>
                            <p className="text-[15px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed max-w-[480px]">
                                {f.body}
                            </p>
                            <SecondaryButton onClick={handleClaim}>
                                Get started free
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </SecondaryButton>
                        </FadeIn>
                    </div>
                </section>
            ))}

            {/* ── VALUE GRID (replaces STATS) ───────────────────────────────── */}
            <section className="dark-section py-24 md:py-32">
                <div className="container mx-auto px-6 md:px-12 max-w-6xl">
                    <FadeIn className="text-center mb-16">
                        <h2 className="text-[2rem] md:text-[2.4rem] font-montserrat font-extrabold text-on-dark tracking-tight leading-tight">
                            It just works.
                        </h2>
                        <p className="mt-4 text-[15px] text-on-dark-secondary max-w-lg mx-auto leading-relaxed">
                            We handle the infrastructure. You handle the rest. That's the deal.
                        </p>
                    </FadeIn>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                        {VALUE_ITEMS.map((item, i) => (
                            <FadeIn key={i} delay={i * 0.08}>
                                <div className="flex flex-col gap-4 p-6 rounded-2xl border border-white/10 bg-white/5 h-full">
                                    <motion.div whileHover={{ scale: 1.08, rotate: 4 }} className="w-10 h-10">
                                        <Image src={item.icon} alt="" width={40} height={40} className="drop-shadow-md" unoptimized />
                                    </motion.div>
                                    <h3 className="text-[15px] font-bold text-on-dark leading-snug">{item.title}</h3>
                                    <p className="text-[13px] text-on-dark-secondary leading-relaxed">{item.body}</p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── WHY MENENGAI ─────────────────────────────────────────────── */}
            <section className="bg-[var(--md-sys-color-surface-container-low)] py-24 md:py-32">
                <div className="container mx-auto px-6 md:px-12 max-w-6xl">
                    <FadeIn className="mb-14">
                        <p className="text-[12px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-primary)] mb-3">
                            Why Menengai Cloud
                        </p>
                        <h2 className="text-[2rem] md:text-[2.4rem] font-montserrat font-extrabold leading-[1.1] text-[var(--md-sys-color-on-surface)] tracking-tight max-w-2xl">
                            Built for people who make things.{" "}
                            <span className="text-[var(--md-sys-color-primary)]">Not people who manage things.</span>
                        </h2>
                    </FadeIn>
                    <div className="grid md:grid-cols-3 gap-5">
                        {WHY_ITEMS.map((item, i) => (
                            <FadeIn key={i} delay={i * 0.12}>
                                <div className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-6 space-y-4 h-full hover:shadow-md transition-shadow duration-200">
                                    <motion.div whileHover={{ scale: 1.08, rotate: 4 }} className="w-12 h-12">
                                        <Image src={item.icon} alt="" width={48} height={48} className="drop-shadow-md" unoptimized />
                                    </motion.div>
                                    <h3 className="text-[17px] font-bold font-montserrat text-[var(--md-sys-color-on-surface)]">
                                        {item.title}
                                    </h3>
                                    <p className="text-[14px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
                                        {item.body}
                                    </p>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── SHOWCASE (replaces TESTIMONIALS) ─────────────────────────── */}
            <section className="bg-[var(--md-sys-color-background)] py-24 md:py-32">
                <div className="container mx-auto px-6 md:px-12 max-w-6xl">
                    <FadeIn className="mb-12">
                        <p className="text-[12px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-primary)] mb-3">
                            Already live
                        </p>
                        <h2 className="text-[2rem] md:text-[2.4rem] font-montserrat font-extrabold text-[var(--md-sys-color-on-surface)] tracking-tight max-w-xl">
                            Stores built on Menengai Cloud
                        </h2>
                        <p className="mt-3 text-[15px] text-[var(--md-sys-color-on-surface-variant)] max-w-md leading-relaxed">
                            Bakeries. Photographers. Non-profits. Streetwear brands. If you have something worth sharing, it fits.
                        </p>
                    </FadeIn>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {SHOWCASE.map((item, i) => (
                            <ShowcaseCard key={i} item={item} delay={i * 0.07} />
                        ))}
                    </div>
                    <FadeIn delay={0.3} className="mt-8">
                        <SecondaryButton onClick={handleClaim}>
                            Add yours to the list
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </SecondaryButton>
                    </FadeIn>
                </div>
            </section>

            {/* ── NEWSLETTER ───────────────────────────────────────────────── */}
            <NewsletterSection />

            {/* ── FAQ ──────────────────────────────────────────────────────── */}
            <section className="bg-[var(--md-sys-color-surface-container-low)] py-24 md:py-32">
                <div className="container mx-auto px-6 md:px-12 max-w-3xl">
                    <FadeIn className="text-center mb-12">
                        <h2 className="text-[2rem] md:text-[2.4rem] font-montserrat font-extrabold text-[var(--md-sys-color-on-surface)] tracking-tight">
                            Questions.
                        </h2>
                    </FadeIn>
                    <FadeIn>
                        <div className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-6 py-2">
                            {FAQS.map((faq, i) => (
                                <FaqItem key={i} {...faq} />
                            ))}
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ── FINAL CTA ────────────────────────────────────────────────── */}
            <section className="dark-section relative min-h-[80dvh] flex items-center justify-center overflow-hidden">
                {STICKERS.map((s, i) => (
                    <FloatingSticker key={i} s={s} size={44} />
                ))}

                {/* Glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-[var(--md-sys-color-primary)] opacity-10 blur-3xl" />
                </div>

                <div className="relative z-20 container mx-auto px-6 md:px-12 py-20 text-center max-w-3xl">
                    <FadeIn className="space-y-7">
                        <p className="text-[12px] font-semibold uppercase tracking-widest text-on-dark-dim">
                            Your move
                        </p>
                        <h2 className="text-[3rem] md:text-[4rem] font-montserrat font-extrabold text-on-dark leading-[1.04] tracking-tight">
                            Your audience<br />
                            <span className="text-[var(--md-sys-color-primary-container)]">isn't waiting.</span>
                        </h2>
                        <p className="text-[16px] text-on-dark-secondary max-w-lg mx-auto leading-relaxed">
                            Every day without your own platform is a day you're building on someone else's terms. Your store is free. Takes two minutes. Go.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                            <PrimaryButton onClick={handleClaim} size="lg" pill>
                                Claim your free store
                                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                            </PrimaryButton>
                            <button
                                onClick={handleTrial}
                                className="text-[14px] text-on-dark-secondary hover:text-on-dark underline underline-offset-2 transition-colors"
                            >
                                Or try a paid plan free
                            </button>
                        </div>
                        <p className="text-[12px] text-on-dark-muted">
                            Free forever · No credit card · Live in seconds
                        </p>
                    </FadeIn>
                </div>
            </section>

        </div>
    )
}