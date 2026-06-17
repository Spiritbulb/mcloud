'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { BetaSignupForm } from './beta-signup-form'

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

export default function BetaClient() {
    return (
        <div className="min-h-[100dvh] bg-background text-foreground">

            {/* Glow */}
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#3fa9f5]/15 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 container mx-auto px-6 md:px-12 max-w-2xl py-28 md:py-36">
                <FadeIn className="space-y-5">
                    <p className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        Closed beta
                    </p>
                    <h1 className="text-[2.8rem] md:text-[3.5rem] font-bold leading-[1.04] tracking-tight">
                        Get early access<br />
                        <span className="text-muted-foreground/60">to Menengai Cloud.</span>
                    </h1>
                    <p className="text-[15px] text-muted-foreground/70 leading-relaxed max-w-lg">
                        We&apos;re onboarding a small group of merchants first. Drop your email and
                        we&apos;ll reach out with an invite as spots open up.
                    </p>
                </FadeIn>

                <FadeIn delay={0.1} className="mt-10">
                    <BetaSignupForm source="beta-page" />
                    <p className="mt-3 text-[12px] text-muted-foreground/50">
                        No spam. We&apos;ll only email you about your beta invite.
                    </p>
                </FadeIn>
            </div>
        </div>
    )
}
