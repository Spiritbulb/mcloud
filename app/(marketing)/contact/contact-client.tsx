'use client'

import { useState, useTransition, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const INTERESTS = [
    { id: 'storefront', label: 'E-commerce storefront' },
    { id: 'trading', label: 'Trading app (white-label)' },
    { id: 'both', label: 'Both' },
    { id: 'other', label: 'Something else' },
]

function FadeIn({ children, className, delay = 0 }: {
    children: React.ReactNode
    className?: string
    delay?: number
}) {
    const ref = useRef(null)
    const inView = useInView(ref, { once: true, margin: '-40px' })
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

const inputCls = cn(
    'w-full h-11 rounded-xl px-4 text-[14px] text-white placeholder:text-white/25',
    'bg-white/5 border border-white/10',
    'focus:outline-none focus:border-white/30 focus:bg-white/8',
    'transition-all duration-150'
)

const labelCls = 'block text-[12px] font-medium text-white/50 mb-1.5'

export default function ContactClient() {
    const [interest, setInterest] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [org, setOrg] = useState('')
    const [message, setMessage] = useState('')
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPending, start] = useTransition()

    const canSubmit = name.trim() && email.trim() && interest

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit) return
        setError(null)

        const subject = encodeURIComponent(`[Menengai Cloud] Enquiry — ${interest}`)
        const body = encodeURIComponent(
            `Name: ${name}\nEmail: ${email}\nOrganisation: ${org || 'N/A'}\nInterest: ${interest}\n\n${message}`
        )

        // Open mailto — fallback if blocked is shown as an error
        try {
            window.location.href = `mailto:sales@spiritb.uk?subject=${subject}&body=${body}`
            start(async () => {
                await new Promise(r => setTimeout(r, 600))
                setSent(true)
            })
        } catch {
            setError('Could not open your mail client. Email us directly at sales@spiritb.uk')
        }
    }

    return (
        <div className="min-h-[100dvh] bg-[#0a0a0a] text-white">

            {/* Glow */}
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#3fa9f5]/15 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 container mx-auto px-6 md:px-12 max-w-4xl py-24 md:py-32">

                <FadeIn className="mb-14 space-y-4 max-w-xl">
                    <p className="text-[12px] font-semibold uppercase tracking-widest text-white/30">Contact sales</p>
                    <h1 className="text-[2.8rem] md:text-[3.5rem] font-bold leading-[1.04] tracking-tight">
                        Let's talk<br />
                        <span className="text-white/30">about your project.</span>
                    </h1>
                    <p className="text-[15px] text-white/40 leading-relaxed">
                        Tell us what you're building and we'll figure out how Menengai Cloud can help. We typically respond within one business day.
                    </p>
                </FadeIn>

                <div className="grid md:grid-cols-[1fr_320px] gap-10">

                    {/* Form */}
                    <FadeIn delay={0.1}>
                        <AnimatePresence mode="wait">
                            {sent ? (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-start gap-4 py-12"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[22px] text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            check_circle
                                        </span>
                                    </div>
                                    <h2 className="text-[20px] font-semibold text-white">Message sent.</h2>
                                    <p className="text-[14px] text-white/45 leading-relaxed max-w-sm">
                                        Your default mail client should have opened with the message pre-filled. If it didn't, email us directly at{' '}
                                        <a href="mailto:sales@spiritb.uk" className="text-white/70 underline underline-offset-2 hover:text-white transition-colors">
                                            sales@spiritb.uk
                                        </a>
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.form
                                    key="form"
                                    onSubmit={submit}
                                    className="space-y-5"
                                >
                                    {/* Interest chips */}
                                    <div>
                                        <label className={labelCls}>I'm interested in</label>
                                        <div className="flex flex-wrap gap-2">
                                            {INTERESTS.map(opt => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setInterest(opt.id)}
                                                    className={cn(
                                                        'h-8 px-4 rounded-full text-[13px] font-medium border transition-all duration-150',
                                                        interest === opt.id
                                                            ? 'bg-white text-[#0a0a0a] border-white'
                                                            : 'border-white/12 text-white/50 hover:border-white/25 hover:text-white'
                                                    )}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Name + email row */}
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelCls}>Name <span className="text-white/25">*</span></label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                placeholder="Your name"
                                                className={inputCls}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Email <span className="text-white/25">*</span></label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="you@example.com"
                                                className={inputCls}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Org */}
                                    <div>
                                        <label className={labelCls}>Organisation <span className="text-white/20">(optional)</span></label>
                                        <input
                                            type="text"
                                            value={org}
                                            onChange={e => setOrg(e.target.value)}
                                            placeholder="Company or project name"
                                            className={inputCls}
                                        />
                                    </div>

                                    {/* Message */}
                                    <div>
                                        <label className={labelCls}>Message <span className="text-white/20">(optional)</span></label>
                                        <textarea
                                            value={message}
                                            onChange={e => setMessage(e.target.value)}
                                            placeholder="Tell us what you're building, any specific requirements, or questions you have…"
                                            rows={5}
                                            className={cn(inputCls, 'h-auto py-3 resize-none')}
                                        />
                                    </div>

                                    {error && (
                                        <p className="text-[13px] text-red-400">{error}</p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={!canSubmit || isPending}
                                        className={cn(
                                            'h-11 px-6 rounded-full bg-white text-[#0a0a0a] text-[14px] font-semibold',
                                            'flex items-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all',
                                            'disabled:opacity-30 disabled:cursor-not-allowed'
                                        )}
                                    >
                                        {isPending && (
                                            <div className="w-3.5 h-3.5 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin" />
                                        )}
                                        Send message
                                        {!isPending && <span className="material-symbols-outlined text-[16px]">send</span>}
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </FadeIn>

                    {/* Sidebar */}
                    <FadeIn delay={0.2} className="space-y-6">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-5">
                            <h3 className="text-[13px] font-semibold text-white/60 uppercase tracking-widest">Direct contact</h3>
                            <a
                                href="mailto:sales@spiritb.uk"
                                className="flex items-center gap-3 group"
                            >
                                <div className="w-9 h-9 rounded-xl bg-[#3fa9f5]/20 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[18px] text-[#95ccff]">mail</span>
                                </div>
                                <div>
                                    <p className="text-[13px] font-medium text-white group-hover:text-white/80 transition-colors">sales@spiritb.uk</p>
                                    <p className="text-[11px] text-white/30">Typically replies in 1 business day</p>
                                </div>
                            </a>
                        </div>

                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-4">
                            <h3 className="text-[13px] font-semibold text-white/60 uppercase tracking-widest">Good to know</h3>
                            {[
                                'No lock-in contracts',
                                'Setup assistance included',
                                'Custom domain supported on all plans',
                                'Dedicated support for trading app clients',
                            ].map(item => (
                                <div key={item} className="flex items-start gap-2.5">
                                    <span className="material-symbols-outlined text-[14px] text-emerald-400 mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        check_circle
                                    </span>
                                    <span className="text-[13px] text-white/45 leading-snug">{item}</span>
                                </div>
                            ))}
                        </div>
                    </FadeIn>

                </div>
            </div>
        </div>
    )
}
