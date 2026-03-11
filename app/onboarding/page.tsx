'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { completeOnboarding } from './actions'

const STEPS = ['Your name', 'Your store', 'Preferences']

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

export default function OnboardingPage() {
    const router = useRouter()
    const [step, setStep] = useState(0)
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

    const handleNext = () => {
        if (step < STEPS.length - 1) setStep(step + 1)
    }

    const handleBack = () => {
        if (step > 0) setStep(step - 1)
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
            // on success, action redirects — no need to handle here
        } catch (e) {
            setError('Something went wrong. Please try again.')
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">

            {/* Logo / wordmark */}
            <div className="mb-10 text-center">
                <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                    menengai
                </span>
            </div>

            {/* Card */}
            <div className="w-full max-w-md border border-border bg-card">

                {/* Step indicator */}
                <div className="flex border-b border-border">
                    {STEPS.map((label, i) => (
                        <div
                            key={i}
                            className={cn(
                                'flex-1 px-4 py-3 text-xs font-mono border-r last:border-r-0 border-border transition-colors',
                                i === step
                                    ? 'bg-foreground text-background'
                                    : i < step
                                        ? 'text-muted-foreground bg-muted'
                                        : 'text-muted-foreground/40'
                            )}
                        >
                            <span className="mr-1.5 opacity-50">{i + 1}.</span>
                            {label}
                        </div>
                    ))}
                </div>

                {/* Step content */}
                <div className="p-6 flex flex-col gap-5 min-h-[260px]">

                    {/* Step 0 — Full name */}
                    {step === 0 && (
                        <div className="flex flex-col gap-5 flex-1">
                            <div>
                                <h2 className="text-base font-semibold tracking-tight">What's your name?</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    This is how you'll appear to your team.
                                </p>
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="full-name" className="text-sm">Full name</Label>
                                <Input
                                    id="full-name"
                                    type="text"
                                    placeholder="Amina Wanjiru"
                                    autoFocus
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && canAdvance() && handleNext()}
                                    className="h-10 rounded-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 1 — Store name */}
                    {step === 1 && (
                        <div className="flex flex-col gap-5 flex-1">
                            <div>
                                <h2 className="text-base font-semibold tracking-tight">Name your store</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    This becomes your store's URL and public identity.
                                </p>
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="store-name" className="text-sm">Store name</Label>
                                <div className="flex items-center border border-input focus-within:ring-1 focus-within:ring-ring">
                                    <span className="pl-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                                        menengai.cloud/
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
                                        onKeyDown={(e) => e.key === 'Enter' && canAdvance() && handleNext()}
                                        className="flex-1 h-10 bg-transparent px-2 text-sm font-mono outline-none"
                                    />
                                </div>
                                {storeName && (
                                    <p className="text-xs text-muted-foreground font-mono">
                                        → {derivedSlug}.menengai.cloud
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2 — Currency & timezone */}
                    {step === 2 && (
                        <div className="flex flex-col gap-4 flex-1">
                            <div>
                                <h2 className="text-base font-semibold tracking-tight">Store preferences</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    You can change these later in settings.
                                </p>
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="currency" className="text-sm">Currency</Label>
                                <select
                                    id="currency"
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="h-10 rounded-none border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    {CURRENCIES.map((c) => (
                                        <option key={c.code} value={c.code}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="timezone" className="text-sm">Timezone</Label>
                                <select
                                    id="timezone"
                                    value={timezone}
                                    onChange={(e) => setTimezone(e.target.value)}
                                    className="h-10 rounded-none border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    {TIMEZONES.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2">{error}</p>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between border-t border-border px-6 py-4">
                    <button
                        onClick={handleBack}
                        disabled={step === 0}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-0 disabled:pointer-events-none"
                    >
                        ← Back
                    </button>

                    {step < STEPS.length - 1 ? (
                        <Button
                            onClick={handleNext}
                            disabled={!canAdvance()}
                            className="rounded-none h-9 px-6 google-button-primary"
                        >
                            Continue →
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading || !canAdvance()}
                            className="rounded-none h-9 px-6 google-button-primary"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Setting up...
                                </span>
                            ) : (
                                'Launch my store →'
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Progress dots */}
            <div className="flex gap-2 mt-6">
                {STEPS.map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            'w-1.5 h-1.5 rounded-full transition-colors',
                            i === step ? 'bg-foreground' : i < step ? 'bg-muted-foreground' : 'bg-border'
                        )}
                    />
                ))}
            </div>
        </div>
    )
}