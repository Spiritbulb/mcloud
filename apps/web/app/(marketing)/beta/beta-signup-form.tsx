'use client'

// Email-only closed-beta signup form. Shared by the /beta page and the homepage
// CTA band — pass `source` so each placement attributes correctly.
import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@mcloud/ui/utils'
import { joinBeta } from './actions'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputCls = cn(
    'w-full h-11 rounded-xl px-4 text-[14px] text-foreground placeholder:text-muted-foreground/60',
    'bg-foreground/5 border border-border',
    'focus:outline-none focus:border-foreground/30 focus:bg-foreground/[0.08]',
    'transition-all duration-150'
)

export function BetaSignupForm({ source, className }: { source: string; className?: string }) {
    const [email, setEmail] = useState('')
    const [optInUrl, setOptInUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPending, start] = useTransition()

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = email.trim()
        if (!EMAIL_RE.test(trimmed)) {
            setError('Please enter a valid email address.')
            return
        }
        setError(null)
        start(async () => {
            const res = await joinBeta({ email: trimmed, source })
            if (res.ok) setOptInUrl(res.optInUrl)
            else setError(res.error)
        })
    }

    return (
        <div className={className}>
            <AnimatePresence mode="wait">
                {optInUrl !== null ? (
                    <motion.div
                        key="done"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-border bg-foreground/5 px-4 py-4 space-y-3"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-lg">🎉</span>
                            <p className="text-[14px] text-foreground">
                                You&apos;re on the list.
                            </p>
                        </div>
                        {optInUrl && (
                            <a
                                href={optInUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90 transition-opacity"
                            >
                                Opt in to the Android beta →
                            </a>
                        )}
                        <p className="text-[12px] text-muted-foreground">
                            Open this on the Android device you&apos;ll test with, signed in to the Google account on this email.
                        </p>
                    </motion.div>
                ) : (
                    <motion.form
                        key="form"
                        onSubmit={submit}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-2 sm:flex-row"
                    >
                        <div className="flex-1">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); if (error) setError(null) }}
                                placeholder="you@gmail.com"
                                aria-label="Email address"
                                className={inputCls}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isPending}
                            className={cn(
                                'h-11 shrink-0 rounded-xl px-6 text-[14px] font-medium transition-all duration-150',
                                'bg-foreground text-background hover:opacity-90 disabled:opacity-60'
                            )}
                        >
                            {isPending ? 'Joining…' : 'Join the beta'}
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>
            {error && (
                <p className="mt-2 text-[13px] text-red-500">{error}</p>
            )}
        </div>
    )
}
