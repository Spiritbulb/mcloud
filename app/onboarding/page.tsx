'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from 'framer-motion'

import { completeOnboarding } from './actions'

// ─── Data ─────────────────────────────────────────────────────────────────────

const STEPS = [
    {
        key: 'name',
        label: 'Identity',
        headline: 'Who are you?',
        sub: 'The name your audience will know you by.',
    },
    {
        key: 'store',
        label: 'Your link',
        headline: 'Claim your corner of the internet.',
        sub: 'This is your permanent address. Choose something you\'ll be proud of.',
    },
    {
        key: 'prefs',
        label: 'Launch',
        headline: 'Almost live.',
        sub: 'A few quick settings. You can change these any time.',
    },
]

const CURRENCIES = [
    { code: 'KES', label: 'KES — Kenyan Shilling' },
    { code: 'USD', label: 'USD — US Dollar' },
    { code: 'EUR', label: 'EUR — Euro' },
    { code: 'GBP', label: 'GBP — British Pound' },
    { code: 'NGN', label: 'NGN — Nigerian Naira' },
    { code: 'GHS', label: 'GHS — Ghanaian Cedi' },
    { code: 'ZAR', label: 'ZAR — South African Rand' },
    { code: 'UGX', label: 'UGX — Ugandan Shilling' },
    { code: 'TZS', label: 'TZS — Tanzanian Shilling' },
]

const TIMEZONES = [
    { value: 'Africa/Nairobi', label: 'Nairobi (EAT, UTC+3)' },
    { value: 'Africa/Lagos', label: 'Lagos (WAT, UTC+1)' },
    { value: 'Africa/Accra', label: 'Accra (GMT, UTC+0)' },
    { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST, UTC+2)' },
    { value: 'Africa/Cairo', label: 'Cairo (EET, UTC+2)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET, UTC+1)' },
    { value: 'America/New_York', label: 'New York (ET)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST, UTC+4)' },
]

// ─── Animation variants ────────────────────────────────────────────────────────

const slideVariants = {
    enter: (dir: number) => ({
        x: dir > 0 ? 40 : -40,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
        transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
    },
    exit: (dir: number) => ({
        x: dir > 0 ? -40 : 40,
        opacity: 0,
        transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const },
    }),
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
    const [step, setStep] = useState(0)
    const [direction, setDirection] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [fullName, setFullName] = useState('')
    const [storeName, setStoreName] = useState('')
    const [currency, setCurrency] = useState('KES')
    const [timezone, setTimezone] = useState('Africa/Nairobi')

    const derivedSlug = storeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    const canAdvance = () => {
        if (step === 0) return fullName.trim().length > 0
        if (step === 1) return storeName.trim().length > 0
        return true
    }

    const advance = () => {
        if (!canAdvance()) return
        setDirection(1)
        setStep((s) => s + 1)
    }

    const back = () => {
        setDirection(-1)
        setStep((s) => s - 1)
    }

    const handleSubmit = async () => {
        setIsLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append('fullName', fullName)
        formData.append('storeName', storeName)
        formData.append('slug', derivedSlug)
        formData.append('currency', currency)
        formData.append('timezone', timezone)

        try {
            const result = await completeOnboarding(formData)
            if (result?.error) {
                setError(result.error)
                setIsLoading(false)
            }
        } catch (e) {
            // Next.js redirect() throws internally — let it propagate
            if (e instanceof Error && (e as any).digest?.startsWith('NEXT_REDIRECT')) throw e
            setError('Something went wrong. Please try again.')
            setIsLoading(false)
        }
    }

    const progress = ((step + 1) / STEPS.length) * 100

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 overflow-hidden">

            {/* Dot grid background */}
            <div
                className="fixed inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            />

            {/* Wordmark */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="mb-10 text-center relative z-10"
            >
                <span className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase">
                    mcloud
                </span>
            </motion.div>

            {/* Card */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full max-w-lg relative z-10"
            >
                {/* Step tabs */}
                <div className="flex">
                    {STEPS.map((s, i) => (
                        <div
                            key={i}
                            className={cn(
                                'flex-1 px-4 py-3 font-mono text-[11px] tracking-wider uppercase transition-all duration-300 select-none',
                                i === step
                                    ? 'bg-[#425e7b] text-white'
                                    : i < step
                                        ? 'bg-[#425e7b] text-white'
                                        : 'text-muted-foreground/30 bg-background'
                            )}
                        >
                            <span className="opacity-40 mr-1.5">{i + 1}.</span>
                            {s.label}
                        </div>
                    ))}
                </div>

                {/* Progress bar */}
                <div className="h-[2px] bg-[#425e7b] w-full overflow-hidden">
                    <motion.div
                        className="h-full bg-[#425e7b]"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                </div>

                {/* Main content */}
                <div className="bg-card overflow-hidden">

                    {/* Animated step content */}
                    <div className="relative overflow-hidden" style={{ minHeight: 280 }}>
                        <AnimatePresence custom={direction} mode="wait">
                            <motion.div
                                key={step}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                className="p-8 flex flex-col gap-6"
                            >
                                {/* Headline */}
                                <div className="space-y-1">
                                    <h1 className="text-2xl font-montserrat font-bold text-foreground leading-tight">
                                        {STEPS[step].headline}
                                    </h1>
                                    <p className="text-sm text-muted-foreground">
                                        {STEPS[step].sub}
                                    </p>
                                </div>

                                {/* Step 0 — Full name */}
                                {step === 0 && (
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="full-name" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                                            Full name
                                        </Label>
                                        <Input
                                            id="full-name"
                                            type="text"
                                            placeholder="Amina Wanjiru"
                                            autoFocus
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && canAdvance() && advance()}
                                            className="h-12 rounded-none text-base border-border focus-visible:ring-0 focus-visible:border-foreground transition-colors"
                                        />
                                    </div>
                                )}

                                {/* Step 1 — Store name */}
                                {step === 1 && (
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="store-name" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                                            Store handle
                                        </Label>
                                        <div className="flex items-center border border-border focus-within:border-foreground transition-colors h-12">
                                            <span className="pl-3 text-xs text-muted-foreground font-mono whitespace-nowrap select-none">
                                                menengai.cloud/store/
                                            </span>
                                            <input
                                                id="store-name"
                                                type="text"
                                                placeholder="kikoskincare"
                                                autoFocus
                                                required
                                                value={storeName}
                                                onChange={(e) =>
                                                    setStoreName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                                                }
                                                onKeyDown={(e) => e.key === 'Enter' && canAdvance() && advance()}
                                                className="flex-1 h-full bg-transparent px-2 text-sm font-mono outline-none"
                                            />
                                        </div>
                                        <AnimatePresence>
                                            {storeName && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    className="text-xs font-mono text-muted-foreground"
                                                >
                                                    ✓ {derivedSlug}.menengai.cloud will be yours
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Step 2 — Preferences */}
                                {step === 2 && (
                                    <div className="grid gap-4">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="currency" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                                                Currency
                                            </Label>
                                            <select
                                                id="currency"
                                                value={currency}
                                                onChange={(e) => setCurrency(e.target.value)}
                                                className="h-10 rounded-none border border-border bg-background px-3 text-sm focus:outline-none focus:border-foreground transition-colors"
                                            >
                                                {CURRENCIES.map((c) => (
                                                    <option key={c.code} value={c.code}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="timezone" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                                                Timezone
                                            </Label>
                                            <select
                                                id="timezone"
                                                value={timezone}
                                                onChange={(e) => setTimezone(e.target.value)}
                                                className="h-10 rounded-none border border-border bg-background px-3 text-sm focus:outline-none focus:border-foreground transition-colors"
                                            >
                                                {TIMEZONES.map((t) => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Store summary */}
                                        <div className="border border-border bg-muted/30 p-4 space-y-2 mt-1">
                                            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                                                Your store
                                            </p>
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold text-foreground">{storeName || '—'}</p>
                                                <p className="text-xs font-mono text-muted-foreground">
                                                    {derivedSlug}.menengai.cloud
                                                </p>
                                            </div>
                                            <div className="flex gap-4 pt-1">
                                                <span className="text-xs text-muted-foreground">
                                                    Owner: <span className="text-foreground font-medium">{fullName || '—'}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="px-8 pb-2"
                            >
                                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 font-mono">
                                    ✗ {error}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex items-center justify-between border-t border-border px-8 py-5">
                        <button
                            onClick={back}
                            disabled={step === 0}
                            className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-0 disabled:pointer-events-none"
                        >
                            ← back
                        </button>

                        {step < STEPS.length - 1 ? (
                            <Button
                                onClick={advance}
                                disabled={!canAdvance()}
                                className="rounded-none h-10 px-8 bg-foreground text-background hover:bg-foreground/90 font-mono text-sm tracking-wide disabled:opacity-30 transition-opacity"
                            >
                                continue →
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="rounded-none h-10 px-8 bg-foreground text-background hover:bg-foreground/90 font-mono text-sm tracking-wide disabled:opacity-50 transition-opacity"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                        launching...
                                    </span>
                                ) : (
                                    'launch my store →'
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Footer note */}
                <p className="text-center text-xs text-muted-foreground/50 mt-5">
                    free forever · no credit card · live in seconds
                </p>
            </motion.div>
        </div>
    )
}