'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  last_visited_at?: string   // ISO string — for "recent" sort
  logo_url?: string
  order_count?: number
}

interface OnboardingPageProps {
  existingStores?: ExistingStore[]
  userName?: string          // pre-filled if we know them
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

// Sort stores by last_visited_at descending — most recent first
function sortByRecent(stores: ExistingStore[]) {
  return [...stores].sort((a, b) => {
    if (!a.last_visited_at) return 1
    if (!b.last_visited_at) return -1
    return new Date(b.last_visited_at).getTime() - new Date(a.last_visited_at).getTime()
  })
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── StoreCard ────────────────────────────────────────────────────────────────

function StoreCard({
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
  const isFirst = index === 0
  const isPicking = picking === store.slug
  const isDisabled = picking !== null && !isPicking
  const ago = timeAgo(store.last_visited_at)

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 + index * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
      onClick={() => !isDisabled && onPick(store.slug)}
      disabled={isDisabled}
      className={cn(
        'group relative text-left rounded-2xl border transition-all duration-200 overflow-hidden',
        'w-fit min-w-[180px] max-w-[240px]',
        isFirst
          // Most recent — featured style
          ? 'bg-[--md-sys-color-primary-container] border-[--md-sys-color-primary]/20 p-5'
          : 'bg-[--md-sys-color-surface] border-[--md-sys-color-outline-variant] p-4',
        !isDisabled && 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
        isPicking && 'scale-[0.99]',
        isDisabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {/* "Continue" label on first card */}
      {isFirst && (
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[--md-sys-color-primary] mb-3">
          <MSO icon="history" className="text-[13px]" />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {/* Logo */}
        <div className={cn(
          'shrink-0 flex items-center justify-center rounded-xl font-semibold text-sm overflow-hidden',
          isFirst ? 'w-11 h-11' : 'w-9 h-9',
          !store.logo_url && 'bg-[--md-sys-color-primary] text-[--md-sys-color-on-primary]'
        )}>
          {store.logo_url
            ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
            : getInitials(store.name)
          }
        </div>

        {/* Info */}
        <div className="space-y-0.5">
          <p className={cn(
            'font-semibold truncate',
            isFirst
              ? 'text-[15px] text-[--md-sys-color-on-primary-container]'
              : 'text-[13px] text-[--md-sys-color-on-surface]'
          )}>
            {store.name}
          </p>
          <p className="text-[11px] text-[--md-sys-color-on-surface-variant] truncate">
            {store.slug}.menengai.cloud
          </p>
          {ago && (
            <p className="text-[11px] text-[--md-sys-color-on-surface-variant] opacity-60">{ago}</p>
          )}
        </div>

        {/* Arrow */}
        <div className={cn('transition-all duration-150', !isDisabled && 'group-hover:translate-x-0.5')}>
          {isPicking
            ? <div className="w-4 h-4 border-2 border-[--md-sys-color-primary] border-t-transparent rounded-full animate-spin" />
            : <MSO icon="arrow_forward" className={cn('text-[18px]', isFirst ? 'text-[--md-sys-color-primary]' : 'text-[--md-sys-color-on-surface-variant]')} />
          }
        </div>
      </div>
    </motion.button>
  )
}

// ─── CREATE FORM ──────────────────────────────────────────────────────────────

type CreateStep = 'name' | 'store' | 'prefs'

function CreateForm({
  initialName,
  onBack,
  hasExisting,
}: {
  initialName?: string
  onBack: () => void
  hasExisting: boolean
}) {
  const [step, setStep] = useState<CreateStep>('name')
  const [dir, setDir] = useState(1)
  const [fullName, setFullName] = useState(initialName ?? '')
  const [storeName, setStoreName] = useState('')
  const [currency, setCurrency] = useState('KES')
  const [timezone, setTimezone] = useState('Africa/Nairobi')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  const STEPS: CreateStep[] = ['name', 'store', 'prefs']
  const stepIdx = STEPS.indexOf(step)

  const canContinue =
    step === 'name' ? fullName.trim().length > 1
      : step === 'store' ? storeName.trim().length > 1
        : true

  const next = () => {
    if (!canContinue) return
    setDir(1)
    if (step === 'name') setStep('store')
    else if (step === 'store') setStep('prefs')
  }

  const prev = () => {
    setDir(-1)
    if (step === 'store') setStep('name')
    else if (step === 'prefs') setStep('store')
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
    enter: (d: number) => ({ x: d > 0 ? 32 : -32, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.26, ease: [0.25, 0.1, 0.25, 1] as const } },
    exit: (d: number) => ({ x: d > 0 ? -32 : 32, opacity: 0, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const } }),
  }

  const inputCls = cn(
    'w-full h-12 rounded-xl border border-[--md-sys-color-outline-variant] bg-[--md-sys-color-surface]',
    'px-4 text-[14px] text-[--md-sys-color-on-surface] placeholder:text-[--md-sys-color-on-surface-variant]/40',
    'focus:outline-none focus:border-[--md-sys-color-primary] focus:ring-2 focus:ring-[--md-sys-color-primary]/15',
    'transition-all duration-150'
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.28 }}
      className="w-full max-w-md"
    >
      {/* Step dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className={cn(
            'rounded-full transition-all duration-300',
            i === stepIdx
              ? 'w-6 h-2 bg-[--md-sys-color-primary]'
              : i < stepIdx
                ? 'w-2 h-2 bg-[--md-sys-color-primary]/60'
                : 'w-2 h-2 bg-[--md-sys-color-outline-variant]'
          )} />
        ))}
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-[--md-sys-color-outline-variant] bg-[--md-sys-color-surface] overflow-hidden shadow-sm">

        <div className="relative overflow-hidden" style={{ minHeight: 340 }}>
          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={step}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              className="p-8 space-y-6"
            >
              {/* Step: name */}
              {step === 'name' && (
                <>
                  <div className="space-y-1.5">
                    <div className="w-11 h-11 rounded-2xl bg-[--md-sys-color-primary-container] flex items-center justify-center mb-4">
                      <MSO icon="waving_hand" className="text-[22px] text-[--md-sys-color-primary]" fill={1} />
                    </div>
                    <h2 className="text-[20px] font-semibold text-[--md-sys-color-on-surface] tracking-tight">
                      What's your name?
                    </h2>
                    <p className="text-[13px] text-[--md-sys-color-on-surface-variant] leading-relaxed">
                      We'll use this to personalise your experience and sign off your store communications.
                    </p>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Amina Wanjiru"
                    autoFocus
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && canContinue && next()}
                    className={inputCls}
                  />
                </>
              )}

              {/* Step: store */}
              {step === 'store' && (
                <>
                  <div className="space-y-1.5">
                    <div className="w-11 h-11 rounded-2xl bg-[--md-sys-color-primary-container] flex items-center justify-center mb-4">
                      <MSO icon="storefront" className="text-[22px] text-[--md-sys-color-primary]" fill={1} />
                    </div>
                    <h2 className="text-[20px] font-semibold text-[--md-sys-color-on-surface] tracking-tight">
                      Name your shop{fullName ? `, ${fullName.split(' ')[0]}` : ''}
                    </h2>
                    <p className="text-[13px] text-[--md-sys-color-on-surface-variant] leading-relaxed">
                      Pick a name your customers will recognise. This also sets your store's web address.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Kiko Skincare"
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
                          <MSO icon="link" className="text-[14px] text-[--md-sys-color-primary]" />
                          <span className="text-[12px] text-[--md-sys-color-on-surface-variant]">
                            Your store will be at{' '}
                            <span className="font-medium text-[--md-sys-color-primary]">
                              {slug}.menengai.cloud
                            </span>
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {/* Step: prefs */}
              {step === 'prefs' && (
                <>
                  <div className="space-y-1.5">
                    <div className="w-11 h-11 rounded-2xl bg-[--md-sys-color-primary-container] flex items-center justify-center mb-4">
                      <MSO icon="tune" className="text-[22px] text-[--md-sys-color-primary]" fill={1} />
                    </div>
                    <h2 className="text-[20px] font-semibold text-[--md-sys-color-on-surface] tracking-tight">
                      One last thing
                    </h2>
                    <p className="text-[13px] text-[--md-sys-color-on-surface-variant] leading-relaxed">
                      Set your currency and location. You can always change these later in settings.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-widest text-[--md-sys-color-on-surface-variant] mb-2">
                        Currency
                      </label>
                      <select value={currency} onChange={e => setCurrency(e.target.value)} className={cn(inputCls, 'cursor-pointer')}>
                        {CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-widest text-[--md-sys-color-on-surface-variant] mb-2">
                        Timezone
                      </label>
                      <select value={timezone} onChange={e => setTimezone(e.target.value)} className={cn(inputCls, 'cursor-pointer')}>
                        {TIMEZONES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Summary pill */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[--md-sys-color-surface-variant]/50 border border-[--md-sys-color-outline-variant]">
                      <div className="w-8 h-8 rounded-lg bg-[--md-sys-color-primary] flex items-center justify-center text-[--md-sys-color-on-primary] text-[11px] font-bold shrink-0">
                        {getInitials(storeName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-[--md-sys-color-on-surface] truncate">{storeName}</p>
                        <p className="text-[11px] text-[--md-sys-color-on-surface-variant] truncate">{slug}.menengai.cloud</p>
                      </div>
                      <MSO icon="check_circle" className="text-[18px] text-[--md-sys-color-primary] ml-auto shrink-0" fill={1} />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="px-8 pb-2"
            >
              <div className="flex items-center gap-2 text-[12px] text-[--md-sys-color-error] bg-[--md-sys-color-error]/8 px-3 py-2.5 rounded-xl">
                <MSO icon="error" className="text-[15px] shrink-0" fill={1} />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[--md-sys-color-outline-variant] px-8 py-4">
          <button
            onClick={prev}
            className="flex items-center gap-1.5 text-[13px] text-[--md-sys-color-on-surface-variant] hover:text-[--md-sys-color-on-surface] transition-colors"
          >
            <MSO icon="arrow_back" className="text-[16px]" />
            {step === 'name' && hasExisting ? 'My stores' : 'Back'}
          </button>

          {step !== 'prefs' ? (
            <button
              onClick={next}
              disabled={!canContinue}
              className={cn(
                'flex items-center gap-1.5 h-10 px-6 rounded-full text-[13px] font-medium',
                'bg-[--md-sys-color-primary] text-[--md-sys-color-on-primary]',
                'hover:opacity-90 active:scale-[0.98] transition-all duration-150',
                'disabled:opacity-30 disabled:cursor-not-allowed'
              )}
            >
              Continue
              <MSO icon="arrow_forward" className="text-[16px]" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={isLoading}
              className={cn(
                'flex items-center gap-2 h-10 px-6 rounded-full text-[13px] font-medium',
                'bg-[--md-sys-color-primary] text-[--md-sys-color-on-primary]',
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
                  <MSO icon="rocket_launch" className="text-[16px]" fill={1} />
                  Launch my shop
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage({ existingStores = [], userName }: OnboardingPageProps) {
  const sorted = sortByRecent(existingStores)
  const hasExisting = sorted.length > 0

  const [view, setView] = useState<'home' | 'create'>(hasExisting ? 'home' : 'create')
  const [picking, setPicking] = useState<string | null>(null)

  const handlePick = (slug: string) => {
    setPicking(slug)
    window.location.href = `/store/${slug}/settings`
  }

  const greeting = getGreeting()
  const firstName = userName?.split(' ')[0]

  return (
    <div className="max-h-[90vh] flex flex-col items-center justify-center px-4 py-12 relative bg-[--md-sys-color-surface]">

      {/* Ambient background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[--md-sys-color-primary-container] opacity-60 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full bg-[--md-sys-color-primary-container] opacity-30 blur-3xl" />
      </div>

      <AnimatePresence mode="wait">

        {/* ── HOME: returning user ── */}
        {view === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.28 }}
            className="w-full max-w-3xl space-y-3"
          >
            {/* Greeting */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.02 }}
              className="mt-12 mb-6 space-y-1"
            >
              <h1 className="text-[24px] font-semibold text-[--md-sys-color-on-surface] tracking-tight">
                {greeting}{firstName ? `, ${firstName}` : ''} 👋
              </h1>
              <p className="text-[14px] text-[--md-sys-color-on-surface-variant]">
                {sorted.length === 1
                  ? 'Jump back into your store, or create a new one.'
                  : `You have ${sorted.length} stores. Pick one to continue.`
                }
              </p>
            </motion.div>

            {/* Store cards — side by side, wrap on overflow */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.04 }}
              className="flex flex-wrap gap-3"
            >
              {sorted.map((store, i) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  index={i}
                  picking={picking}
                  onPick={handlePick}
                />
              ))}

              {/* Create new — same size as cards */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 + sorted.length * 0.06 }}
                onClick={() => setView('create')}
                disabled={picking !== null}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 p-5 rounded-2xl text-center',
                  'border border-dashed border-[--md-sys-color-outline-variant]',
                  'hover:border-[--md-sys-color-primary]/40 hover:bg-[--md-sys-color-primary-container]/20',
                  'transition-all duration-150 group w-fit min-w-[160px]',
                  picking !== null && 'opacity-40 cursor-not-allowed'
                )}
              >
                <div className="w-9 h-9 rounded-xl bg-[--md-sys-color-surface-variant] flex items-center justify-center group-hover:bg-[--md-sys-color-primary-container] transition-colors">
                  <MSO icon="add" className="text-[20px] text-[--md-sys-color-on-surface-variant] group-hover:text-[--md-sys-color-primary] transition-colors" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[--md-sys-color-on-surface]">New shop</p>
                  <p className="text-[11px] text-[--md-sys-color-on-surface-variant]">Free forever</p>
                </div>
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {/* ── CREATE: new store wizard ── */}
        {view === 'create' && (
          <CreateForm
            key="create"
            initialName={userName}
            onBack={() => hasExisting ? setView('home') : undefined}
            hasExisting={hasExisting}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mt-10 text-[11px] text-[--md-sys-color-on-surface-variant] opacity-40 text-center"
      >
        Menengai Cloud © {new Date().getFullYear()}
      </motion.p>
    </div>
  )
}