'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { completeOnboarding } from './actions'


// ─── MSO ─────────────────────────────────────────────────────────────────────

function MSO({ icon, className, fill = 0 }: { icon: string; className?: string; fill?: number }) {
  return (
    <span
      className={cn('material-symbols-outlined select-none leading-none', className)}
      style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}
    >
      {icon}
    </span>
  )
}


// ─── Types ────────────────────────────────────────────────────────────────────

interface ExistingStore {
  id: string
  name: string
  slug: string
  last_visited_at?: string
  logo_url?: string
}

interface OnboardingPageProps {
  existingStores?: ExistingStore[]
  userName?: string
}


// ─── Data ─────────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'KES', label: 'Kenyan Shilling (KES)', flag: '🇰🇪' },
  { code: 'UGX', label: 'Ugandan Shilling (UGX)', flag: '🇺🇬' },
  { code: 'TZS', label: 'Tanzanian Shilling (TZS)', flag: '🇹🇿' },
  { code: 'NGN', label: 'Nigerian Naira (NGN)', flag: '🇳🇬' },
  { code: 'GHS', label: 'Ghanaian Cedi (GHS)', flag: '🇬🇭' },
  { code: 'ZAR', label: 'South African Rand (ZAR)', flag: '🇿🇦' },
  { code: 'USD', label: 'US Dollar (USD)', flag: '🇺🇸' },
  { code: 'EUR', label: 'Euro (EUR)', flag: '🇪🇺' },
  { code: 'GBP', label: 'British Pound (GBP)', flag: '🇬🇧' },
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

const PROFILE_OPTIONS = [
  { id: 'new', icon: 'rocket_launch', label: "I'm just starting out", sub: 'New to selling online' },
  { id: 'existing', icon: 'storefront', label: 'I already sell somewhere', sub: 'Moving or expanding' },
  { id: 'agency', icon: 'group', label: "Setting up for a client", sub: 'Agency or freelancer' },
] as const

type ProfileId = typeof PROFILE_OPTIONS[number]['id']


// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(iso?: string) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} days ago`
  return new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
}

function sortByRecent(stores: ExistingStore[]) {
  return [...stores].sort((a, b) => {
    if (!a.last_visited_at) return 1
    if (!b.last_visited_at) return -1
    return new Date(b.last_visited_at).getTime() - new Date(a.last_visited_at).getTime()
  })
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}


// ─── HeroStoreCard ────────────────────────────────────────────────────────────

function HeroStoreCard({
  store,
  picking,
  onPick,
}: {
  store: ExistingStore
  picking: string | null
  onPick: (slug: string) => void
}) {
  const isPicking = picking === store.slug
  const isDisabled = picking !== null && !isPicking
  const ago = timeAgo(store.last_visited_at)

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
      onClick={() => !isDisabled && onPick(store.slug)}
      disabled={isDisabled}
      className={cn(
        'group w-full text-left rounded-2xl border transition-all duration-200',
        'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)]/20',
        'p-5 flex items-center gap-4',
        !isDisabled && 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
        isPicking && 'scale-[0.99]',
        isDisabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'w-12 h-12 shrink-0 flex items-center justify-center rounded-xl font-semibold text-sm overflow-hidden',
        !store.logo_url && 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]'
      )}>
        {store.logo_url
          ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
          : getInitials(store.name)
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[15px] font-semibold text-[var(--md-sys-color-on-primary-container)] truncate">
            {store.name}
          </p>
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-primary)] shrink-0">
            <MSO icon="history" className="text-[11px]" />
            Last visited
          </span>
        </div>
        <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] truncate">
          {store.slug}.menengai.cloud
          {ago && <span className="opacity-60"> · {ago}</span>}
        </p>
      </div>

      {/* Arrow */}
      <div className={cn('shrink-0 transition-transform duration-150', !isDisabled && 'group-hover:translate-x-1')}>
        {isPicking
          ? <div className="w-4 h-4 border-2 border-[var(--md-sys-color-primary)] border-t-transparent rounded-full animate-spin" />
          : <MSO icon="arrow_forward" className="text-[20px] text-[var(--md-sys-color-primary)]" />
        }
      </div>
    </motion.button>
  )
}


// ─── CompactStoreCard ─────────────────────────────────────────────────────────

function CompactStoreCard({
  store,
  index,
  picking,
  onPick,
}: {
  store: ExistingStore
  index: number
  picking: string | null
  onPick: (slug: string) => void
}) {
  const isPicking = picking === store.slug
  const isDisabled = picking !== null && !isPicking

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay: 0.08 + index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
      onClick={() => !isDisabled && onPick(store.slug)}
      disabled={isDisabled}
      className={cn(
        'group text-left rounded-2xl border transition-all duration-200',
        'bg-[var(--md-sys-color-surface)] border-[var(--md-sys-color-outline-variant)]',
        'p-4 flex items-center gap-3',
        !isDisabled && 'hover:shadow-sm hover:border-[var(--md-sys-color-primary)]/30 cursor-pointer',
        isPicking && 'scale-[0.99]',
        isDisabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <div className={cn(
        'w-8 h-8 shrink-0 flex items-center justify-center rounded-lg font-semibold text-xs overflow-hidden',
        !store.logo_url && 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]'
      )}>
        {store.logo_url
          ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
          : getInitials(store.name)
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)] truncate">{store.name}</p>
        <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] truncate">{store.slug}.menengai.cloud</p>
      </div>
      <div className={cn('shrink-0 transition-transform duration-150', !isDisabled && 'group-hover:translate-x-0.5')}>
        {isPicking
          ? <div className="w-3.5 h-3.5 border-2 border-[var(--md-sys-color-primary)] border-t-transparent rounded-full animate-spin" />
          : <MSO icon="arrow_forward" className="text-[16px] text-[var(--md-sys-color-on-surface-variant)]" />
        }
      </div>
    </motion.button>
  )
}


// ─── CREATE FORM (split-screen) ───────────────────────────────────────────────

type CreateStep = 'profile' | 'store' | 'prefs'

const STEP_META: Record<CreateStep, { label: string; icon: string; title: (ctx: StepCtx) => string; sub: string }> = {
  profile: {
    label: 'About you',
    icon: 'person',
    title: () => 'What brings you here?',
    sub: 'This helps us set up the right experience for you.',
  },
  store: {
    label: 'Your shop',
    icon: 'storefront',
    title: (ctx) => `Name your shop${ctx.firstName ? `, ${ctx.firstName}` : ''}`,
    sub: "Pick a name your customers will recognise.",
  },
  prefs: {
    label: 'Preferences',
    icon: 'tune',
    title: () => 'One last thing',
    sub: 'Set your currency and timezone. Easy to change later.',
  },
}

type StepCtx = { firstName?: string }

const STEPS: CreateStep[] = ['profile', 'store', 'prefs']

function CreateForm({
  initialName,
  onBack,
  hasExisting,
}: {
  initialName?: string
  onBack: () => void
  hasExisting: boolean
}) {
  const [step, setStep] = useState<CreateStep>('profile')
  const [dir, setDir] = useState(1)
  const [profile, setProfile] = useState<ProfileId | null>(null)
  const [storeName, setStoreName] = useState('')
  const [currency, setCurrency] = useState('KES')
  const [timezone, setTimezone] = useState('Africa/Nairobi')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Name is taken from prop — no dedicated name step
  const fullName = initialName ?? ''
  const firstName = fullName.split(' ')[0] || undefined
  const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const stepIdx = STEPS.indexOf(step)

  const canContinue =
    step === 'profile' ? profile !== null
      : step === 'store' ? storeName.trim().length > 1
        : true

  const go = (s: CreateStep, d: number) => { setDir(d); setStep(s) }

  const next = () => {
    if (!canContinue) return
    if (step === 'profile') go('store', 1)
    else if (step === 'store') go('prefs', 1)
  }

  const prev = () => {
    if (step === 'store') go('profile', -1)
    else if (step === 'prefs') go('store', -1)
    else onBack()
  }

  const submit = async () => {
    setIsLoading(true); setError(null)
    const fd = new FormData()
    fd.append('fullName', fullName)
    fd.append('storeName', storeName)
    fd.append('slug', slug)
    fd.append('currency', currency)
    fd.append('timezone', timezone)
    fd.append('profile', profile ?? 'new')
    try {
      const result = await completeOnboarding(fd)
      if (result?.error) { setError(result.error); setIsLoading(false) }
    } catch (e) {
      if (e instanceof Error && (e as any).digest?.startsWith('NEXT_REDIRECT')) throw e
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  const slide = {
    enter: (d: number) => ({ x: d > 0 ? 24 : -24, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const } },
    exit: (d: number) => ({ x: d > 0 ? -24 : 24, opacity: 0, transition: { duration: 0.16 } }),
  }

  const inputCls = cn(
    'w-full h-12 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30',
    'px-4 text-[14px] text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/40',
    'focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15',
    'transition-all duration-150'
  )

  const ctx: StepCtx = { firstName }
  const meta = STEP_META[step]
  const showBack = !(step === 'profile' && !hasExisting)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.26 }}
      className="w-full max-w-3xl"
    >
      {/* ── Split layout ── */}
      <div className={cn(
        'rounded-2xl border border-[var(--md-sys-color-outline-variant)]',
        'bg-[var(--md-sys-color-surface)] shadow-sm',
        'grid grid-cols-1 md:grid-cols-[200px_1fr]',
        'overflow-hidden',
      )}>

        {/* ── Left panel — step list + live preview ── */}
        <div className="hidden md:flex flex-col justify-between border-r border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30 p-6">
          {/* Step list */}
          <ul className="space-y-1">
            {STEPS.map((s, i) => {
              const m = STEP_META[s]
              const isDone = i < stepIdx
              const isActive = s === step
              return (
                <li key={s} className="flex items-center gap-3">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold transition-colors duration-200',
                    isDone
                      ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]'
                      : isActive
                        ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-primary)]'
                        : 'bg-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)]'
                  )}>
                    {isDone
                      ? <MSO icon="check" className="text-[13px]" />
                      : <span>{i + 1}</span>
                    }
                  </div>
                  <span className={cn(
                    'text-[13px] transition-colors duration-200',
                    isActive ? 'font-semibold text-[var(--md-sys-color-on-surface)]' : 'text-[var(--md-sys-color-on-surface-variant)]'
                  )}>
                    {m.label}
                  </span>
                </li>
              )
            })}
          </ul>

          {/* Live store preview — visible from store step onwards */}
          <AnimatePresence>
            {(step === 'store' || step === 'prefs') && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-8 p-3 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)] mb-2">
                  Preview
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--md-sys-color-primary)] flex items-center justify-center text-[var(--md-sys-color-on-primary)] text-[10px] font-bold shrink-0">
                    {storeName ? getInitials(storeName) : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[var(--md-sys-color-on-surface)] truncate">
                      {storeName || <span className="opacity-30">Your shop name</span>}
                    </p>
                    <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] truncate">
                      {slug ? `${slug}.menengai.cloud` : 'yourshop.menengai.cloud'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right panel — active step ── */}
        <div className="flex flex-col">

          {/* Mobile-only step dots */}
          <div className="flex items-center gap-1.5 px-6 pt-5 md:hidden">
            {STEPS.map((s, i) => (
              <div key={s} className={cn(
                'rounded-full transition-all duration-300',
                i === stepIdx ? 'w-5 h-[4px] bg-[var(--md-sys-color-primary)]'
                  : i < stepIdx ? 'w-[4px] h-[4px] bg-[var(--md-sys-color-primary)]/50'
                    : 'w-[4px] h-[4px] bg-[var(--md-sys-color-outline)]'
              )} />
            ))}
          </div>

          {/* Sliding content */}
          <div className="relative overflow-hidden flex-1">
            <AnimatePresence custom={dir} mode="wait">
              <motion.div
                key={step}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                className="p-6 md:p-8 space-y-6"
              >
                {/* Step header */}
                <div className="space-y-1">
                  <h2 className="text-[20px] font-semibold text-[var(--md-sys-color-on-surface)] tracking-tight">
                    {meta.title(ctx)}
                  </h2>
                  <p className="text-[13px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
                    {meta.sub}
                  </p>
                </div>

                {/* ── profile ── */}
                {step === 'profile' && (
                  <div className="space-y-2">
                    {PROFILE_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setProfile(opt.id); }}
                        className={cn(
                          'w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150',
                          profile === opt.id
                            ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)]/40'
                            : 'bg-[var(--md-sys-color-surface-variant)]/30 border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)]/30'
                        )}
                      >
                        <div className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-150',
                          profile === opt.id
                            ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]'
                            : 'bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface-variant)]'
                        )}>
                          <MSO icon={opt.icon} className="text-[18px]" fill={profile === opt.id ? 1 : 0} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-[14px] font-medium',
                            profile === opt.id ? 'text-[var(--md-sys-color-on-primary-container)]' : 'text-[var(--md-sys-color-on-surface)]'
                          )}>
                            {opt.label}
                          </p>
                          <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)]">{opt.sub}</p>
                        </div>
                        {profile === opt.id && (
                          <MSO icon="check_circle" className="text-[18px] text-[var(--md-sys-color-primary)] shrink-0" fill={1} />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── store ── */}
                {step === 'store' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="e.g. Kiko Skincare"
                      autoFocus
                      value={storeName}
                      onChange={e => setStoreName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && canContinue && next()}
                      className={inputCls}
                    />
                    <AnimatePresence>
                      {slug && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-1.5 px-1"
                        >
                          <MSO icon="link" className="text-[13px] text-[var(--md-sys-color-primary)]" />
                          <span className="text-[12px] text-[var(--md-sys-color-on-surface-variant)]">
                            <span className="font-medium text-[var(--md-sys-color-primary)]">{slug}.menengai.cloud</span>
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ── prefs ── */}
                {step === 'prefs' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)] mb-1.5">
                        Currency
                      </label>
                      <select value={currency} onChange={e => setCurrency(e.target.value)} className={cn(inputCls, 'cursor-pointer')}>
                        {CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)] mb-1.5">
                        Timezone
                      </label>
                      <select value={timezone} onChange={e => setTimezone(e.target.value)} className={cn(inputCls, 'cursor-pointer')}>
                        {TIMEZONES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
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
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="px-6 md:px-8 pb-2 overflow-hidden"
              >
                <div className="flex items-center gap-2 text-[12px] text-[var(--md-sys-color-error)] bg-[var(--md-sys-color-error-container)] px-3 py-2.5 rounded-xl">
                  <MSO icon="error" className="text-[14px] shrink-0" fill={1} />
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--md-sys-color-outline-variant)] px-6 md:px-8 py-4">
            {showBack ? (
              <button
                onClick={prev}
                className="flex items-center gap-1.5 text-[13px] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] transition-colors"
              >
                <MSO icon="arrow_back" className="text-[15px]" />
                {step === 'profile' && hasExisting ? 'My stores' : 'Back'}
              </button>
            ) : <div />}

            {step !== 'prefs' ? (
              <button
                onClick={next}
                disabled={!canContinue}
                className={cn(
                  'flex items-center gap-1.5 h-10 px-6 rounded-full text-[13px] font-medium',
                  'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]',
                  'hover:opacity-90 active:scale-[0.98] transition-all duration-150',
                  'disabled:opacity-30 disabled:cursor-not-allowed'
                )}
              >
                Continue
                <MSO icon="arrow_forward" className="text-[15px]" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={isLoading}
                className={cn(
                  'flex items-center gap-2 h-10 px-6 rounded-full text-[13px] font-medium',
                  'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]',
                  'hover:opacity-90 active:scale-[0.98] transition-all duration-150',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Launching…
                  </>
                ) : (
                  <>
                    <MSO icon="rocket_launch" className="text-[15px]" fill={1} />
                    Launch my shop
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}


// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage({ existingStores = [], userName }: OnboardingPageProps) {
  const router = useRouter()
  const sorted = sortByRecent(existingStores)
  const hasExisting = sorted.length > 0
  const [view, setView] = useState<'home' | 'create'>(hasExisting ? 'home' : 'create')
  const [picking, setPicking] = useState<string | null>(null)



  const handlePick = (slug: string) => {
    setPicking(slug)
    router.push(`/store/${slug}/settings`)
  }

  const greeting = getGreeting()
  const firstName = userName?.split(' ')[0]

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-16 bg-[var(--md-sys-color-surface)]">
      <AnimatePresence mode="wait">

        {/* ── HOME ── */}
        {view === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.26 }}
            className="w-full max-w-2xl space-y-3"
          >
            {/* Greeting */}
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.02 }}
              className="mb-6"
            >
              <h1 className="text-[22px] font-semibold text-[var(--md-sys-color-on-surface)] tracking-tight">
                {greeting}{firstName ? `, ${firstName}` : ''} 👋
              </h1>
              <p className="mt-1 text-[14px] text-[var(--md-sys-color-on-surface-variant)]">
                {sorted.length === 1
                  ? 'Jump back into your store, or start a new one.'
                  : `You have ${sorted.length} stores. Pick one to continue.`}
              </p>
            </motion.div>

            {/* Hero card — most recent store */}
            <HeroStoreCard store={sorted[0]} picking={picking} onPick={handlePick} />

            {/* Compact grid — remaining stores + new shop */}
            {(sorted.length > 1 || true) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {sorted.slice(1).map((store, i) => (
                  <CompactStoreCard
                    key={store.id}
                    store={store}
                    index={i}
                    picking={picking}
                    onPick={handlePick}
                  />
                ))}

                {/* New shop */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, delay: 0.08 + (sorted.length - 1) * 0.05 }}
                  onClick={() => setView('create')}
                  disabled={picking !== null}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-2xl text-left',
                    'border border-dashed border-[var(--md-sys-color-outline-variant)]',
                    'hover:border-[var(--md-sys-color-primary)]/40 hover:bg-[var(--md-sys-color-primary-container)]/20',
                    'transition-all duration-150 group',
                    picking !== null && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--md-sys-color-surface-variant)] flex items-center justify-center group-hover:bg-[var(--md-sys-color-primary-container)] transition-colors shrink-0">
                    <MSO icon="add" className="text-[18px] text-[var(--md-sys-color-on-surface-variant)] group-hover:text-[var(--md-sys-color-primary)] transition-colors" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)]">New shop</p>
                    <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">Free forever</p>
                  </div>
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── CREATE ── */}
        {view === 'create' && (
          <CreateForm
            key="create"
            initialName={userName}
            onBack={() => hasExisting ? setView('home') : undefined}
            hasExisting={hasExisting}
          />
        )}

      </AnimatePresence>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mt-12 text-[11px] text-[var(--md-sys-color-on-surface-variant)] opacity-40 text-center"
      >
        Menengai Cloud © {new Date().getFullYear()}
      </motion.p>
    </div>
  )
}