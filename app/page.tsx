'use client'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ArrowRight, Zap, Shield, Globe } from "lucide-react"
import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion"
import type { Variants } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import AuthPopup from "@/lib/auth"



// ─── Floating sticker data ────────────────────────────────────────────────────
const stickers = [
  { src: "https://img.icons8.com/3d-fluency/94/movie-video-camera.png", x: "8%", y: "20%", delay: 0, duration: 6 },
  { src: "https://img.icons8.com/3d-fluency/94/bank-card-back-side.png", x: "88%", y: "15%", delay: 0.5, duration: 7 },
  { src: "https://img.icons8.com/3d-fluency/94/sparkling-1.png", x: "75%", y: "60%", delay: 1, duration: 5 },
  { src: "https://img.icons8.com/3d-fluency/94/package.png", x: "12%", y: "70%", delay: 1.5, duration: 8 },
  { src: "https://img.icons8.com/3d-fluency/94/rocket.png", x: "50%", y: "10%", delay: 0.8, duration: 6.5 },
  { src: "https://img.icons8.com/3d-fluency/94/color-palette.png", x: "92%", y: "75%", delay: 0.3, duration: 7.5 },
]

// ─── Typewriter slugs ─────────────────────────────────────────────────────────
const exampleSlugs = ["kikoskincare", "nairobi.eats", "andrewkibe", "fashionbyamina", "techwithtony"]

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }, // cubic bezier instead of string
  },
}

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
}

// ─── Section fade wrapper ─────────────────────────────────────────────────────
function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Corner plus SVG ──────────────────────────────────────────────────────────
function CornerPlus({ className }: { className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={24}
      height={24}
      strokeWidth="1"
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  )
}

// ─── Floating Sticker ─────────────────────────────────────────────────────────
function FloatingStickerImage({ s, size = 56 }: { s: typeof stickers[0]; size?: number }) {
  return (
    <motion.div
      className="absolute select-none pointer-events-none z-10"
      style={{ left: s.x, top: s.y }}
      animate={{ y: [0, -18, 0], rotate: [-4, 4, -4] }}
      transition={{
        duration: s.duration,
        delay: s.delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <Image src={s.src} alt="" width={size} height={size} className="drop-shadow-xl" />
    </motion.div>
  )
}

export default function Home() {
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [slug, setSlug] = useState("")
  const [displaySlug, setDisplaySlug] = useState("")
  const [slugIndex, setSlugIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(true)

  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  // Typewriter effect
  useEffect(() => {
    if (slug) return
    const current = exampleSlugs[slugIndex]
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
          setSlugIndex((prev) => (prev + 1) % exampleSlugs.length)
          setIsTyping(true)
        }
      }
      i = current.length
      erase()
    }

    return () => clearTimeout(timeout)
  }, [slugIndex, isTyping, slug])

  const handleClaim = () => {
    if (!slug.trim()) return
    setIsAuthOpen(true)
  }

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

  const features = [
    {
      title: "Built for creators who mean business.",
      body: "Whether you're selling merch, running a blog, or building a subscriber base — your store is ready before your competition even opens a browser tab.",
      image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
      alt: "Creator filming content",
      reverse: false,
    },
    {
      title: "No agency. No waiting. No nonsense.",
      body: "Agencies take weeks, charge thousands, and hand you something you can't touch. We hand you the keys in two seconds and you drive from day one.",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
      alt: "E-commerce on mobile",
      reverse: true,
    },
    {
      title: "Your brand. Your link. Your rules.",
      body: "Start on your free subdomain. When you're ready to go full brand mode, upgrade to Pro and bring your own domain. We connect it in minutes via Cloudflare.",
      image: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=800&q=80",
      alt: "Person working on laptop",
      reverse: false,
    },
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

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#1c2228]"
      >
        {/* Parallax bg */}
        <motion.div style={{ y: heroY }} className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1543343237-2259bf758f53?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Creative workspace"
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1c2228]/60 via-[#1c2228]/40 to-[#1c2228]" />
        </motion.div>

        {/* Floating stickers */}
        {stickers.map((s, i) => (
          <FloatingStickerImage key={i} s={s} size={56} />
        ))}

        {/* Hero content — outer div handles parallax opacity only */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-20 container mx-auto px-6 md:px-12 text-center"
        >
          {/* Inner div orchestrates stagger */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeUp}>

            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-5xl md:text-7xl lg:text-8xl font-montserrat font-bold text-white leading-[1.05] mb-6"
            >
              Your store.<br />
              <span className="text-white/60">Live in seconds.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg md:text-xl text-white/70 max-w-xl mx-auto mb-12"
            >
              Stop waiting on agencies. Type your name, verify your email — and you're live.
            </motion.p>

            {/* Slug input */}
            <motion.div variants={fadeUp} className="max-w-xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3 bg-white/10 backdrop-blur-md border border-white/20 p-2">
                <div className="flex-1 flex items-center gap-2 px-3">
                  <span className="text-white/40 text-sm whitespace-nowrap font-mono">
                    menengai.cloud/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    placeholder={displaySlug}
                    className="bg-transparent text-white placeholder-white/40 outline-none text-sm font-mono w-full"
                    onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                  />
                </div>
                <Button
                  onClick={handleClaim}
                  disabled={!slug.trim()}
                  className="bg-white text-[#1c2228] hover:bg-white/90 font-semibold px-6 h-10 rounded-none disabled:opacity-40 cursor-pointer"
                >
                  Claim it free
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
              <AnimatePresence>
                {slug && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-white/50 text-xs mt-2 font-mono text-left px-2"
                  >
                    ✓ {slug}.menengai.cloud will be yours
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.p
              variants={fadeUp}
              className="text-white/30 text-sm mt-6"
            >
              Join creators already live on Menengai Cloud
            </motion.p>
          </motion.div>
        </motion.div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────────────────── */}
      <div className="border-y border-border bg-background py-4 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 mx-8 text-sm font-medium text-muted-foreground">
              <Image src={item.icon} alt={item.label} width={22} height={22} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      {features.map((f, i) => (
        <section
          key={i}
          className={`py-24 ${i % 2 !== 0 ? "bg-surface" : "bg-background"}`}
        >
          <div
            className={`container mx-auto px-6 md:px-12 max-w-6xl flex flex-col ${f.reverse ? "md:flex-row-reverse" : "md:flex-row"
              } gap-16 items-center`}
          >
            <FadeIn className="flex-1">
              <Image
                src={f.image}
                alt={f.alt}
                width={600}
                height={400}
                className="w-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
              />
            </FadeIn>
            <FadeIn className="flex-1 space-y-6" delay={0.2}>
              <h2 className="text-4xl md:text-5xl font-montserrat font-bold leading-tight">
                {f.title}
              </h2>
              <p className="text-body-large text-muted-foreground leading-relaxed">{f.body}</p>
              <Button
                variant="ghost"
                className="px-0 font-medium cursor-pointer group"
                onClick={() => setIsAuthOpen(true)}
              >
                Get started free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </FadeIn>
          </div>
        </section>
      ))}

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section className="bg-[#1c2228] py-24">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { stat: "2 sec", label: "Average setup time" },
              { stat: "100%", label: "Managed for you" },
              { stat: "Ksh 0", label: "To get started" },
              { stat: "∞", label: "Earning potential" },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <p className="text-5xl font-montserrat font-bold text-white mb-2">{item.stat}</p>
                <p className="text-white/50 text-sm">{item.label}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-background">
        <div className="container mx-auto px-6 md:px-12 py-24">
          <FadeIn className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-display-small font-montserrat mb-4">
              Start free. Own it when you're ready.
            </h2>
            <p className="text-body-large text-muted-foreground">
              Your free store stays free. Upgrade only when your brand outgrows a subdomain.
            </p>
          </FadeIn>

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-start">
            {/* Free */}
            <FadeIn delay={0}>
              <div className="relative border bg-background p-8 space-y-6 hover:shadow-md transition-shadow">
                <CornerPlus className="text-foreground size-6 absolute -top-3 -left-3" />
                <CornerPlus className="text-foreground size-6 absolute -top-3 -right-3" />
                <CornerPlus className="text-foreground size-6 absolute -bottom-3 -left-3" />
                <CornerPlus className="text-foreground size-6 absolute -bottom-3 -right-3" />
                <div>
                  <p className="text-headline-small font-montserrat mb-1">Free</p>
                  <p className="text-muted-foreground text-body-medium">For creators just getting started.</p>
                </div>
                <div>
                  <span className="text-[48px] font-montserrat font-normal">Ksh 0</span>
                  <span className="text-muted-foreground font-montserrat">/month</span>
                </div>
                <ul className="space-y-3">
                  {freeFeatures.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <span className="text-body-medium">{feat}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full h-11 google-button-secondary cursor-pointer"
                  onClick={() => setIsAuthOpen(true)}
                >
                  Get your free store
                </Button>
              </div>
            </FadeIn>

            {/* Pro */}
            <FadeIn delay={0.15}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="relative bg-[#1c2228] p-8 space-y-6 cursor-pointer"
              >
                <CornerPlus className="text-white/30 size-6 absolute -top-3 -left-3" />
                <CornerPlus className="text-white/30 size-6 absolute -top-3 -right-3" />
                <CornerPlus className="text-white/30 size-6 absolute -bottom-3 -left-3" />
                <CornerPlus className="text-white/30 size-6 absolute -bottom-3 -right-3" />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-white text-[#1c2228] px-3 py-1 text-xs font-semibold">
                    Own your brand
                  </Badge>
                </div>
                <div>
                  <p className="text-headline-small font-montserrat mb-1 text-white">Pro</p>
                  <p className="text-white/50 text-body-medium">For serious creators and businesses.</p>
                </div>
                <div>
                  <span className="text-[48px] font-montserrat font-normal text-white">Ksh 9,500</span>
                  <span className="text-white/50 font-montserrat">/month</span>
                </div>
                <ul className="space-y-3">
                  {proFeatures.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-white" />
                      <span className="text-body-medium text-white/80">{feat}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full h-11 bg-white text-[#1c2228] hover:bg-white/90 font-semibold rounded-none cursor-pointer"
                  onClick={() => setIsAuthOpen(true)}
                >
                  Go Pro
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── WHY MENENGAI ─────────────────────────────────────────────────── */}
      <section className="bg-surface">
        <div className="container mx-auto px-6 md:px-12 py-24">
          <FadeIn className="max-w-6xl mx-auto">
            <h2 className="text-display-small font-montserrat mb-16 max-w-2xl">
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
                  icon: "https://img.icons8.com/3d-fluency/94/security-shield-green.png",
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
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="w-14 h-14"
                    >
                      <Image src={item.icon} alt={item.title} width={56} height={56} className="drop-shadow-md" />
                    </motion.div>
                    <h3 className="text-headline-small font-montserrat">{item.title}</h3>
                    <p className="text-body-medium text-muted-foreground">{item.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-[#1c2228]">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&q=80"
            alt="Creative team"
            fill
            className="object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-[#1c2228]/80" />
        </div>

        {/* Stickers in CTA — smaller, only first 3 */}
        {stickers.slice(0, 3).map((s, i) => (
          <FloatingStickerImage key={i} s={s} size={48} />
        ))}

        <div className="relative z-20 container mx-auto px-6 md:px-12 text-center">
          <FadeIn>
            <h2 className="text-5xl md:text-7xl font-montserrat font-bold text-white mb-6">
              Your audience<br />is waiting.
            </h2>
            <p className="text-white/60 text-lg max-w-xl mx-auto mb-10">
              Every day without your own platform is a day you're building someone else's business.
              Your store is free. Take it.
            </p>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button
                className="bg-white text-[#1c2228] hover:bg-white/90 font-semibold px-10 py-6 text-base h-auto rounded-none cursor-pointer"
                onClick={() => setIsAuthOpen(true)}
              >
                Claim your free store now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
            <p className="text-white/30 text-sm mt-6">
              Free forever · No credit card · Live in seconds
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── AUTH DIALOG ──────────────────────────────────────────────────── */}
      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Claim your free store</DialogTitle>
            <DialogDescription>
              {slug
                ? `menengai.cloud/${slug} is waiting for you.`
                : "Pick your slug and you're live in seconds."}
            </DialogDescription>
          </DialogHeader>
          <AuthPopup slug={slug} />
        </DialogContent>
      </Dialog>

    </div>
  )
}
