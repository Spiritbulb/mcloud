'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@mcloud/ui/utils'
import { completeOnboarding } from '@/app/(merchant)/org/actions'
import { useRouter } from 'next/navigation'

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

function slugPreview(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Kenyan mobile numbers: 07XXXXXXXX / 01XXXXXXXX / +2547XXXXXXXX / +2541XXXXXXXX
function isValidMpesaNumber(value: string) {
  const v = value.trim()
  if (!v) return true // optional field
  return /^(?:\+254|0)(7|1)\d{8}$/.test(v.replace(/\s+/g, ''))
}

export default function OnboardingClient({ userName, to }: { userName?: string | null; to: string }) {
  const [fullName, setFullName] = useState(userName ?? '')
  const [orgName, setOrgName] = useState('')
  const [mpesaNumber, setMpesaNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  const slug = slugPreview(orgName)
  const mpesaValid = isValidMpesaNumber(mpesaNumber)
  const canSubmit = orgName.trim().length >= 2 && fullName.trim().length >= 2 && mpesaValid
  const router = useRouter()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    start(async () => {
      const fd = new FormData()
      fd.append('orgName', orgName)
      fd.append('fullName', fullName)
      if (mpesaNumber.trim()) fd.append('mpesaNumber', mpesaNumber.trim())
      try {
        const result = await completeOnboarding(fd)
        if (result?.error) {
          setError(result.error)
          return
        }
        if (result?.success) {
          router.push(to)
        }
      } catch (err) {
        if (err instanceof Error && (err as any).digest?.startsWith('NEXT_REDIRECT')) throw err
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const inputCls = cn(
    'w-full h-12 bg-[var(--md-sys-color-surface-variant)]/30',
    'px-4 text-[14px] text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/40',
    'focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/15',
    'transition-all duration-150'
  )

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="min-h-[100dvh] flex bg-[var(--md-sys-color-surface)]">
      {/* Form side */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="w-full max-w-md"
        >
          <div className="flex justify-center mb-8 lg:hidden">
            <img src="/logo-light.svg" alt="Menengai Cloud" className="w-24 h-auto" />
          </div>

          <div className="overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <h1 className="text-[22px] font-semibold text-[var(--md-sys-color-on-surface)] tracking-tight">
                  {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}
                </h1>
                <p className="text-[13px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
                  Tell us a bit about you, then create your organisation. It will be the home for your servers and storefronts.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)]">
                    Your name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wanjiru Kamau"
                    autoFocus={!userName}
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)]">
                    Organisation name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spiritbulb LTD"
                    autoFocus={!!userName}
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && canSubmit && submit(e as any)}
                    className={inputCls}
                  />
                  {slug && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1.5 px-1"
                    >
                      <MSO icon="link" className="text-[13px] text-[var(--md-sys-color-primary)]" />
                      <span className="text-[12px] text-[var(--md-sys-color-on-surface-variant)]">
                        mcloud.co.ke/org/<span className="font-medium text-[var(--md-sys-color-primary)]">{slug}</span>
                      </span>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)]">
                      M-Pesa number
                    </label>
                    <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]/50">Optional</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="07XX XXX XXX"
                    value={mpesaNumber}
                    onChange={e => setMpesaNumber(e.target.value)}
                    className={cn(inputCls, mpesaNumber && !mpesaValid && 'border-[var(--md-sys-color-error)] focus:border-[var(--md-sys-color-error)] focus:ring-[var(--md-sys-color-error)]/15')}
                  />
                  {mpesaNumber && !mpesaValid && (
                    <p className="text-[12px] text-[var(--md-sys-color-error)] px-1">
                      Enter a valid number, e.g. 0712345678
                    </p>
                  )}
                  <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] px-1">
                    Used for payouts. You can add or change this later.
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-2 text-[12px] text-[var(--md-sys-color-error)] bg-[var(--md-sys-color-error-container)] px-3 py-2.5 rounded-xl"
                  >
                    <MSO icon="error" className="text-[14px] shrink-0" fill={1} />
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit || isPending}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 h-12 text-[14px] font-medium',
                    'text-primary border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-secondary-container)]',
                    'hover:opacity-90 active:scale-[0.98] transition-all duration-150',
                    'disabled:opacity-30 disabled:cursor-not-allowed'
                  )}
                >
                  {isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <MSO icon="rocket_launch" className="text-[16px]" fill={1} />
                      Create organisation
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-8 text-[11px] text-[var(--md-sys-color-on-surface-variant)] opacity-40 text-center"
        >
          <img src="/logo-light.svg" alt="Menengai Cloud" className="w-8 h-auto mr-1.5 pb-1 inline-block" />
          Menengai Cloud © {new Date().getFullYear()}
        </motion.p>
      </div>

      {/* Decorative side panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img src="/crater.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-center opacity-20" loading='eager'/>
      </div>
    </div>
  )
}