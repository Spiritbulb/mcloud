'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { completeOnboarding } from './actions'
import { Store, Plus, ArrowRight, CheckCircle2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExistingStore {
  id: string
  name: string
  slug: string
}

interface OnboardingPageProps {
  existingStores?: ExistingStore[]
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    key: 'name',
    emoji: '👋',
    label: 'Your name',
    headline: "What should we call you?",
    sub: 'This is how your customers and team will know you.',
  },
  {
    key: 'store',
    emoji: '🏪',
    label: 'Your shop',
    headline: 'Name your shop',
    sub: 'This becomes your shop link. Keep it short and memorable!',
  },
  {
    key: 'prefs',
    emoji: '⚙️',
    label: 'Settings',
    headline: "Almost ready!",
    sub: 'Set your currency and timezone. You can change these later.',
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
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
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

// ─── Store Avatar ──────────────────────────────────────────────────────────────

function StoreAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center flex-shrink-0">
      {initials || <Store className="w-4 h-4" />}
    </div>
  )
}

// ─── Store Picker ──────────────────────────────────────────────────────────────

function StorePicker({
  stores,
  onPickStore,
  onCreateNew,
}: {
  stores: ExistingStore[]
  onPickStore: (slug: string) => void
  onCreateNew: () => void
}) {
  const [picking, setPicking] = useState<string | null>(null)

  const handlePick = (slug: string) => {
    setPicking(slug)
    onPickStore(slug)
  }

  return (
    <div className="w-full max-w-md space-y-5">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="text-3xl">👋</div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Welcome back!
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick a shop to jump back in, or start a fresh one.
        </p>
      </div>

      {/* Store cards */}
      <div className="space-y-2">
        {stores.map((store) => (
          <button
            key={store.id}
            onClick={() => handlePick(store.slug)}
            disabled={picking !== null}
            className={cn(
              'w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card text-left',
              'hover:border-primary/50 hover:bg-accent/40 transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              picking === store.slug && 'border-primary bg-primary/5'
            )}
          >
            <StoreAvatar name={store.name} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">
                {store.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {store.slug}.menengai.cloud
              </p>
            </div>
            {picking === store.slug ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
            ) : (
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      {/* Create new */}
      <button
        onClick={onCreateNew}
        disabled={picking !== null}
        className={cn(
          'w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-border',
          'text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-accent/20',
          'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        <Plus className="w-4 h-4" />
        Create a new shop
      </button>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function OnboardingPage({ existingStores = [] }: OnboardingPageProps) {
  // If the user has stores, start in picker mode
  const [mode, setMode] = useState<'pick' | 'create'>(
    existingStores.length > 0 ? 'pick' : 'create'
  )

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
    if (step === 0 && existingStores.length > 0) {
      // Go back to store picker
      setMode('pick')
      return
    }
    setDirection(-1)
    setStep((s) => s - 1)
  }

  const handlePickStore = async (slug: string) => {
    window.location.href = `/store/${slug}/settings`
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
      if (e instanceof Error && (e as any).digest?.startsWith('NEXT_REDIRECT')) throw e
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden relative">

      {/* Warm gradient background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-accent/20 pointer-events-none" />

      {/* Subtle dot grid */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ── Store Picker Mode ── */}
      <AnimatePresence mode="wait">
        {mode === 'pick' ? (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="relative z-10 w-full flex flex-col items-center"
          >
            <StorePicker
              stores={existingStores}
              onPickStore={handlePickStore}
              onCreateNew={() => {
                setMode('create')
                setStep(0)
              }}
            />

            <p className="text-center text-xs text-muted-foreground/40 mt-6">
              free forever · no credit card · live in seconds
            </p>
          </motion.div>

        ) : (

          /* ── Create Mode ── */
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md relative z-10"
          >
            {/* Step progress pills */}
            <div className="flex items-center gap-2 mb-6 px-1">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-medium transition-all duration-300',
                      i < step
                        ? 'text-primary'
                        : i === step
                          ? 'text-foreground'
                          : 'text-muted-foreground/40'
                    )}
                  >
                    {i < step ? (
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : (
                      <span className={cn(
                        'w-5 h-5 rounded-full border text-[10px] flex items-center justify-center flex-shrink-0 font-semibold',
                        i === step
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border text-muted-foreground/40'
                      )}>
                        {i + 1}
                      </span>
                    )}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn(
                      'flex-1 h-px transition-all duration-300',
                      i < step ? 'bg-primary' : 'bg-border'
                    )} />
                  )}
                </div>
              ))}
            </div>

            {/* Card */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">

              {/* Step content */}
              <div className="relative overflow-hidden" style={{ minHeight: 300 }}>
                <AnimatePresence custom={direction} mode="wait">
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="p-7 flex flex-col gap-6"
                  >
                    {/* Headline */}
                    <div className="space-y-1">
                      <div className="text-3xl mb-3">{STEPS[step].emoji}</div>
                      <h1 className="text-xl font-display font-bold text-foreground leading-tight">
                        {STEPS[step].headline}
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        {STEPS[step].sub}
                      </p>
                    </div>

                    {/* Step 0 — Full name */}
                    {step === 0 && (
                      <div className="grid gap-2">
                        <Label htmlFor="full-name" className="text-xs font-medium text-muted-foreground">
                          Full name
                        </Label>
                        <Input
                          id="full-name"
                          type="text"
                          placeholder="e.g. Amina Wanjiru"
                          autoFocus
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && canAdvance() && advance()}
                          className="h-11 text-base rounded-xl focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    )}

                    {/* Step 1 — Store name */}
                    {step === 1 && (
                      <div className="grid gap-2">
                        <Label htmlFor="store-name" className="text-xs font-medium text-muted-foreground">
                          Shop name
                        </Label>
                        <div className="flex items-center h-11 border border-input rounded-xl bg-background px-3 focus-within:ring-1 focus-within:ring-ring transition-all">
                          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap select-none pr-1">
                            menengai.cloud/store/
                          </span>
                          <input
                            id="store-name"
                            type="text"
                            placeholder="kikoskincare"
                            autoFocus
                            value={storeName}
                            onChange={(e) =>
                              setStoreName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                            }
                            onKeyDown={(e) => e.key === 'Enter' && canAdvance() && advance()}
                            className="flex-1 h-full bg-transparent text-sm outline-none"
                          />
                        </div>
                        <AnimatePresence>
                          {storeName && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {derivedSlug}.menengai.cloud will be yours
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Step 2 — Preferences */}
                    {step === 2 && (
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="currency" className="text-xs font-medium text-muted-foreground">
                            What currency do you sell in?
                          </Label>
                          <select
                            id="currency"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                          >
                            {CURRENCIES.map((c) => (
                              <option key={c.code} value={c.code}>{c.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="timezone" className="text-xs font-medium text-muted-foreground">
                            Where are you based?
                          </Label>
                          <select
                            id="timezone"
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                          >
                            {TIMEZONES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Store summary */}
                        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Your shop summary
                          </p>
                          <div className="flex items-center gap-3">
                            <StoreAvatar name={storeName} />
                            <div>
                              <p className="text-sm font-semibold text-foreground">{storeName || '—'}</p>
                              <p className="text-xs text-muted-foreground">
                                {derivedSlug}.menengai.cloud
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                            Owner: <span className="text-foreground font-medium">{fullName || '—'}</span>
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
                    className="px-7 pb-2"
                  >
                    <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between border-t border-border px-7 py-4">
                <button
                  onClick={back}
                  disabled={step === 0 && existingStores.length === 0}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-0 disabled:pointer-events-none"
                >
                  ← Back
                </button>

                {step < STEPS.length - 1 ? (
                  <Button
                    onClick={advance}
                    disabled={!canAdvance()}
                    className="rounded-xl h-10 px-6 font-medium disabled:opacity-30 transition-opacity"
                  >
                    Continue →
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="rounded-xl h-10 px-6 font-medium disabled:opacity-50 transition-opacity"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Launching…
                      </span>
                    ) : (
                      '🚀 Launch my shop'
                    )}
                  </Button>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground/40 mt-5">
              free forever · no credit card · live in seconds
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}