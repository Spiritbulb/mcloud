'use client'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import StoreCarousel from "@/components/store-carousel"
import { Check, ArrowRight } from "lucide-react"
import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import type { Variants } from "framer-motion"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

// ─── Types ───────────────────────────────────────────────────────────────────
type Sticker = { src: string; x: string; y: string; delay: number; duration: number }

// ─── Data ────────────────────────────────────────────────────────────────────
const exampleSlugs = ["locd26"]
const sampleSlugs = ["sneakercity", "joy-bakery", "mwanikimania", "hope-foundation", "the-art-of-living-kenya", "purity-hair-care", "photos-by-sam"]

// Only used in the final CTA section
const stickers: Sticker[] = [
    { src: "https://img.icons8.com/3d-fluency/94/movie-video-camera.png", x: "6%", y: "20%", delay: 0, duration: 6 },
    { src: "https://img.icons8.com/3d-fluency/94/bank-card-back-side.png", x: "88%", y: "15%", delay: 0.5, duration: 7 },
    { src: "https://img.icons8.com/3d-fluency/94/sparkling-1.png", x: "78%", y: "65%", delay: 1, duration: 5 },
]

// Social proof avatars — replace with real user photos
const avatars = [
    "https://i.pravatar.cc/40?img=27",
    "https://i.pravatar.cc/40?img=56",
    "https://i.pravatar.cc/40?img=70",
    "https://i.pravatar.cc/40?img=16",
    "https://i.pravatar.cc/40?img=18",
]

const marqueeItems = [
    { label: "E-Commerce", icon: "https://img.icons8.com/3d-fluency/94/shopping-bag.png" },
    { label: "Blog", icon: "https://img.icons8.com/3d-fluency/94/rss.png" },
    { label: "Streaming", icon: "https://img.icons8.com/3d-fluency/94/movie-video-camera.png" },
    { label: "Portfolio", icon: "https://img.icons8.com/3d-fluency/94/color-palette.png" },
    { label: "Music", icon: "https://img.icons8.com/3d-fluency/94/musical-notes.png" },
    { label: "Beauty", icon: "https://img.icons8.com/3d-fluency/94/lipstick.png" },
    { label: "Food", icon: "https://img.icons8.com/3d-fluency/94/salami-pizza.png" },
    { label: "Fashion", icon: "https://img.icons8.com/3d-fluency/94/clothes.png" },
    { label: "Fitness", icon: "https://img.icons8.com/3d-fluency/94/dumbbell.png" },
    { label: "Photography", icon: "https://img.icons8.com/3d-fluency/94/camera.png" },
    { label: "Gaming", icon: "https://img.icons8.com/3d-fluency/94/controller.png" },
    { label: "Travel", icon: "https://img.icons8.com/3d-fluency/94/sun-lounger.png" },
]

const features = [
    {
        title: "Built for creators who mean business.",
        body: "Whether you're selling merch, running a blog, or building a subscriber base — your store is ready before your competition even opens a browser tab.",
        image: "/undraw_project-completed_ug9i.svg",
        alt: "Creator filming content",
        reverse: false,
    },
    {
        title: "No agency. No waiting. No nonsense.",
        body: "Agencies take weeks, charge thousands, and hand you something you can't touch. We hand you the keys in two seconds and you drive from day one.",
        image: "/phone.svg",
        alt: "E-commerce on mobile",
        reverse: true,
    },
    {
        title: "Your brand. Your link. Your rules.",
        body: "Start on your free subdomain. When you're ready to go full brand mode, upgrade to Pro and bring your own domain. We connect it in minutes via Cloudflare.",
        image: "/undraw_website-builder_4go7.svg",
        alt: "Person working on laptop",
        reverse: false,
    },
]

const freeFeatures = [
    "Your store at slug.menengai.cloud",
    "Blog, e-commerce, or streaming — you pick",
    "SSL certificate included",
    "Mobile-optimized out of the box",
    "Basic analytics dashboard",
    "Community support",
]

const proFeatures = [
    "Everything in Free",
    "Custom domain (yourstore.com)",
    "Priority support",
    "Advanced analytics",
    "Custom email (you@yourstore.com)",
    "Remove Menengai branding",
    "Early access to new features",
]

const faqs = [
    {
        q: "Does my free store stay free forever?",
        a: "Yes. Your free subdomain store (slug.menengai.cloud) never expires and never gets ads. Upgrade to Pro only when you're ready for a custom domain.",
    },
    {
        q: "What happens to my store if I cancel Pro?",
        a: "You drop back to the free plan. Your content stays intact — you just lose the custom domain and branding removal until you re-upgrade.",
    },
    {
        q: "How is this different from Shopify or Wix?",
        a: "Shopify charges from day one and is overkill for creators. Wix is a drag-and-drop maze. Menengai Cloud is instant, opinionated, and designed for Kenyan creators.",
    },
    {
        q: "Can I bring my existing content?",
        a: "Yes. We support content imports for blogs and product catalogs. Reach out to support and we'll migrate you manually at no cost.",
    },
]

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp: Variants = {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] } },
}

const staggerContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
}

// ─── Reusable components ──────────────────────────────────────────────────────
function FadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
    const ref = useRef(null)
    const inView = useInView(ref, { once: true, margin: "-80px" })
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

function CornerPlus({ className }: { className: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            width={24} height={24} strokeWidth="1" stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
        </svg>
    )
}

function FloatingStickerImage({ s, size = 48 }: { s: Sticker; size?: number }) {
    return (
        <motion.div
            className="absolute select-none pointer-events-none z-10"
            style={{ left: s.x, top: s.y }}
            animate={{ y: [0, -14, 0], rotate: [-3, 3, -3] }}
            transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        >
            <Image src={s.src} alt="" width={size} height={size} className="drop-shadow-xl" />
        </motion.div>
    )
}



// ─── FAQ accordion item ───────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div
            className="border-b border-outline py-5 cursor-pointer"
            onClick={() => setOpen(!open)}
        >
            <div className="flex items-center justify-between gap-4">
                <p className="text-body-large font-medium text-foreground">{q}</p>
                <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-2xl text-on-surface-muted flex-shrink-0 leading-none"
                >
                    +
                </motion.span>
            </div>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="text-body-medium text-on-surface-muted mt-3 overflow-hidden"
                    >
                        {a}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HomeClient() {
    const [slug, setSlug] = useState("")
    const [displaySlug, setDisplaySlug] = useState("")
    const [slugIndex, setSlugIndex] = useState(0)
    const [isTyping, setIsTyping] = useState(true)

    // Typewriter effect only while user hasn't typed
    useEffect(() => {
        if (slug) return
        const current = sampleSlugs[slugIndex]
        let i = 0
        let timeout: NodeJS.Timeout

        if (isTyping) {
            const type = () => {
                if (i <= current.length) {
                    setDisplaySlug(current.slice(0, i))
                    i++
                    timeout = setTimeout(type, 80)
                } else {
                    setTimeout(() => setIsTyping(false), 1800)
                }
            }
            type()
        } else {
            const erase = () => {
                if (i >= 0) {
                    setDisplaySlug(current.slice(0, i))
                    i--
                    timeout = setTimeout(erase, 40)
                } else {
                    setSlugIndex((prev) => (prev + 1) % sampleSlugs.length)
                    setIsTyping(true)
                }
            }
            i = current.length
            erase()
        }

        return () => clearTimeout(timeout)
    }, [slugIndex, isTyping, slug])

    const handleClaim = () => {
        const destination = slug.trim() ? `/auth/sign-up?slug=${slug}` : "/auth/sign-up"
        window.location.href = destination
    }

    return (
        <div className="min-h-screen bg-background overflow-x-hidden">

            {/* ── HERO — split layout ───────────────────────────────────────────── */}
            <section className="relative min-h-screen flex items-center bg-background overflow-hidden">
                {/* Subtle dot grid background */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                        backgroundSize: "28px 28px",
                    }}
                />

                <div className="relative z-10 container mx-auto px-6 md:px-12 max-w-6xl">
                    <div className="grid md:grid-cols-2 gap-16 items-center">

                        {/* LEFT — text + CTA */}
                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            animate="visible"
                            className="space-y-8"
                        >

                            {/* Headline */}
                            <motion.h1
                                variants={fadeUp}
                                className="text-5xl md:text-4xl lg:text-5xl font-montserrat font-bold text-foreground leading-[1.05]"
                            >
                                Everything your<br />
                                audience needs.<br />
                                <span className="text-on-surface-muted font-normal">One link.</span>
                            </motion.h1>

                            {/* Subtext */}
                            <motion.p variants={fadeUp} className="text-body-large text-on-surface-muted max-w-md">
                                Stop waiting on agencies. Type your name, verify your email — and you're live with a full store, blog, or streaming page.
                            </motion.p>

                            {/* Slug input */}
                            <motion.div variants={fadeUp}>
                                <div className="flex flex-col sm:flex-row gap-3 border border-light bg-background p-2 py-4">
                                    <div className="flex-1 flex items-center gap-2 px-3">
                                        <span className="text-on-surface-muted text-sm whitespace-nowrap">
                                            menengai.cloud/store/
                                        </span>
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) =>
                                                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                                            }
                                            placeholder={displaySlug || ""}
                                            className="bg-transparent text-foreground placeholder:text-on-surface-muted/50 outline-none text-sm font-mono w-full"
                                            onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                                            aria-label="Choose your store slug"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleClaim}
                                        className="text-white px-6 h-10 rounded-none cursor-pointer bg-[#425e7b]"
                                    >
                                        Claim it free
                                        <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                                <AnimatePresence>
                                    {slug && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="text-on-surface-muted text-xs mt-2 font-mono px-2"
                                        >
                                            ✓ {slug}.menengai.cloud will be yours
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                                <p className="text-xs text-on-surface-muted/60 mt-2 px-2">
                                    Only letters, numbers, and hyphens · No credit card required
                                </p>
                            </motion.div>

                            {/* Social proof */}
                            <motion.div variants={fadeUp} className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    {avatars.map((src, i) => (
                                        <div
                                            key={i}
                                            className="w-8 h-8 rounded-full border-2 border-background overflow-hidden"
                                        >
                                            <Image src={src} alt="" width={32} height={32} className="object-cover" />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-body-small text-on-surface-muted">
                                    Join <span className="font-semibold text-foreground">the creators</span> already live on Menengai Cloud
                                </p>
                            </motion.div>
                        </motion.div>

                        {/* RIGHT — phone mockup */}
                        <motion.div
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                            className="hidden md:flex justify-center items-center"
                        >
                            <Image
                                src="/settings-mockup.png"
                                alt="Store preview"
                                width={600}
                                height={600}
                                className="object-contain"
                            />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── MARQUEE ──────────────────────────────────────────────────────── */}
            <div className="border-y border-light bg-surface py-4 overflow-hidden">
                <div className="flex animate-marquee whitespace-nowrap">
                    {[...marqueeItems, ...marqueeItems].map((item, i) => (
                        <span
                            key={i}
                            className="inline-flex items-center gap-2 mx-8 text-body-small font-medium text-on-surface-muted"
                        >
                            <Image src={item.icon} alt={item.label} width={22} height={22} unoptimized />
                            {item.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── LIVE STORE BANNER ─────────────────────────────────────────────── */}
            <section className="bg-background py-20">
                <div className="container mx-auto px-6 md:px-12 max-w-6xl">
                    <FadeIn className="text-center mb-12">
                        <p className="text-body-small text-on-surface-muted uppercase tracking-widest mb-2">Live on Menengai Cloud</p>
                        <h2 className="text-3xl md:text-4xl font-montserrat font-bold text-foreground">
                            Real stores. Real creators.
                        </h2>
                    </FadeIn>

                    <StoreCarousel slugs={exampleSlugs} />
                </div>
            </section>

            {/* ── FEATURES ─────────────────────────────────────────────────────── */}
            {features.map((f, i) => (
                <section key={i} className={i % 2 !== 0 ? "bg-surface py-24" : "bg-background py-24"}>
                    <div
                        className={`container mx-auto px-6 md:px-12 max-w-6xl flex flex-col ${f.reverse ? "md:flex-row-reverse" : "md:flex-row"
                            } gap-16 items-center`}
                    >
                        <FadeIn className="flex-1">
                            <img
                                src={f.image}
                                alt={f.alt}
                                className="w-full h-120 object-contain transition-all duration-700"
                            />
                        </FadeIn>
                        <FadeIn className="flex-1 space-y-6" delay={0.2}>
                            <h2 className="text-4xl md:text-5xl font-montserrat font-bold leading-tight text-foreground">
                                {f.title}
                            </h2>
                            <p className="text-body-large text-on-surface-muted leading-relaxed">{f.body}</p>
                            <Button
                                className="text-white bg-[#425e7b] hover:bg-[#425e7b]/90 px-0 font-medium cursor-pointer group rounded-full"
                                onClick={handleClaim}
                            >
                                Get started free
                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </FadeIn>
                    </div>
                </section>
            ))}

            {/* ── STATS ────────────────────────────────────────────────────────── */}
            <section className="dark-section py-24">
                <div className="container mx-auto px-6 md:px-12">
                    <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[
                            { stat: "200+", label: "Stores live today" },
                            { stat: "2 sec", label: "Average setup time" },
                            { stat: "Ksh 0", label: "To get started" },
                            { stat: "100%", label: "Managed infrastructure" },
                        ].map((item, i) => (
                            <FadeIn key={i} delay={i * 0.1}>
                                <p className="text-5xl font-montserrat font-bold text-on-dark mb-2">{item.stat}</p>
                                <p className="text-on-dark-dim text-body-small">{item.label}</p>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>


            {/* ── WHY MENENGAI ─────────────────────────────────────────────────── */}
            <section className="bg-surface">
                <div className="container mx-auto px-6 md:px-12 py-24">
                    <FadeIn className="max-w-6xl mx-auto">
                        <h2 className="text-display-small font-montserrat mb-16 max-w-2xl text-foreground">
                            Built for people who create,{" "}
                            <span className="font-bold">not IT departments</span>
                        </h2>
                        <div className="grid md:grid-cols-3 gap-16">
                            {[
                                {
                                    icon: "https://img.icons8.com/3d-fluency/94/lightning-bolt.png",
                                    title: "Actually instant",
                                    body: "No waiting, no onboarding calls, no back-and-forth. Your store is live before you finish your coffee.",
                                },
                                {
                                    icon: "https://img.icons8.com/3d-fluency/94/security-checked.png",
                                    title: "Actually maintained",
                                    body: "SSL, backups, uptime monitoring — all handled. You'll never touch a cPanel or a server again.",
                                },
                                {
                                    icon: "https://img.icons8.com/3d-fluency/94/globe.png",
                                    title: "Actually yours",
                                    body: "Your content, your audience, your money. We just keep the lights on.",
                                },
                            ].map((item, i) => (
                                <FadeIn key={i} delay={i * 0.15}>
                                    <div className="space-y-4">
                                        <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-14 h-14">
                                            <Image src={item.icon} alt={item.title} width={56} height={56} className="drop-shadow-md" unoptimized />
                                        </motion.div>
                                        <h3 className="text-headline-small font-montserrat text-foreground">{item.title}</h3>
                                        <p className="text-body-medium text-on-surface-muted">{item.body}</p>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ── FAQ ──────────────────────────────────────────────────────────── */}
            <section className="bg-background py-24">
                <div className="container mx-auto px-6 md:px-12 max-w-5xl">
                    <FadeIn className="text-center mb-14">
                        <h2 className="text-display-small font-montserrat text-foreground">
                            Questions, answered.
                        </h2>
                    </FadeIn>
                    <FadeIn>
                        {faqs.map((faq, i) => (
                            <FaqItem key={i} q={faq.q} a={faq.a} />
                        ))}
                    </FadeIn>
                </div>
            </section>

            {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
            <section className="dark-section relative min-h-[100vh] flex items-center justify-center overflow-hidden">

                {stickers.map((s, i) => (
                    <FloatingStickerImage key={i} s={s} size={48} />
                ))}

                <div className="relative z-20 container mx-auto px-6 md:px-12 py-10 text-center">
                    <FadeIn>
                        <h2 className="text-5xl md:text-7xl font-montserrat font-bold text-on-dark mb-6">
                            Your audience<br />is waiting.
                        </h2>
                        <p className="text-on-dark-secondary text-body-large max-w-xl mx-auto mb-10">
                            Every day without your own platform is a day you're building someone else's business.
                            Your store is free. Take it.
                        </p>
                        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                            <Button
                                className="bg-[#425e7b] hover:bg-[#425e7b]/90 text-white px-6 py-3 text-base h-auto rounded-full cursor-pointer"
                                onClick={handleClaim}
                            >
                                Claim your free store now
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </motion.div>
                        <p className="text-on-dark-muted text-body-small mt-6">
                            Free forever · No credit card · Live in seconds
                        </p>
                    </FadeIn>
                </div>
            </section>

        </div>
    )
}
