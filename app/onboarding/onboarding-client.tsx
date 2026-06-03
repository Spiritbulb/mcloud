'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { completeOnboarding } from '@/app/(merchant)/org/actions'

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

export default function OnboardingClient({ userName }: { userName?: string | null }) {
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  const slug = slugPreview(orgName)
  const canSubmit = orgName.trim().length >= 2

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    start(async () => {
      const fd = new FormData()
      fd.append('orgName', orgName)
      if (userName) fd.append('fullName', userName)
      try {
        const result = await completeOnboarding(fd)
        if (result?.error) { setError(result.error) }
      } catch (err) {
        if (err instanceof Error && (err as any).digest?.startsWith('NEXT_REDIRECT')) throw err
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const inputCls = cn(
    'w-full h-12 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-variant)]/30',
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

  const firstName = userName?.split(' ')[0]

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-16 bg-[var(--md-sys-color-surface)]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="w-full max-w-md"
      >
        {/* Logo / wordmark */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[var(--md-sys-color-primary)] flex items-center justify-center">
            <MSO icon="cloud" className="text-[24px] text-[var(--md-sys-color-on-primary)]" fill={1} />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] shadow-sm overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="space-y-1">
              <h1 className="text-[22px] font-semibold text-[var(--md-sys-color-on-surface)] tracking-tight">
                {greeting}{firstName ? `, ${firstName}` : ''}
              </h1>
              <p className="text-[13px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
                Start by creating your organisation. You can add stores and team members from there.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)]">
                  Organisation name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  autoFocus
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
                      admin.menengai.cloud/org/<span className="font-medium text-[var(--md-sys-color-primary)]">{slug}</span>
                    </span>
                  </motion.div>
                )}
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
                  'w-full flex items-center justify-center gap-2 h-12 rounded-xl text-[14px] font-medium',
                  'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]',
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
        className="mt-12 text-[11px] text-[var(--md-sys-color-on-surface-variant)] opacity-40 text-center"
      >
        Menengai Cloud © {new Date().getFullYear()}
      </motion.p>
    </div>
  )
}
