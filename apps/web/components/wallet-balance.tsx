'use client'

import { useCallback, useEffect, useState } from 'react'
import { WalletTopupModal } from './topup-modal'

function formatKes(amount: number) {
  return `KSh ${amount.toLocaleString('en-KE', {
    maximumFractionDigits: 0,
  })}`
}

const LOW_BALANCE_THRESHOLD_KES = 750

export function WalletBalancePill({ orgSlug }: { orgSlug: string }) {
  const [balanceCents, setBalanceCents] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTopup, setShowTopup] = useState(false)

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/${orgSlug}/wallet/balance`, {
        cache: 'no-store',
      })

      if (!res.ok) {
        return
      }

      const data = await res.json()

      if (typeof data.balanceCents === 'number') {
        setBalanceCents(data.balanceCents)
      }
    } catch {
      // This is deliberately non-fatal. Keep the last known balance visible.
    } finally {
      setLoading(false)
    }
  }, [orgSlug])

  useEffect(() => {
    void fetchBalance()

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchBalance()
      }
    }, 30_000)

    return () => {
      window.clearInterval(interval)
    }
  }, [fetchBalance])

  const balanceKes = balanceCents === null ? null : balanceCents / 100
  const isLow =
    balanceKes !== null && balanceKes < LOW_BALANCE_THRESHOLD_KES

  const buttonText = loading
    ? 'Loading wallet…'
    : balanceKes === null
      ? 'Add credits'
      : formatKes(balanceKes)

  const ariaLabel = loading
    ? 'Loading wallet balance'
    : balanceKes === null
      ? 'Add credits to organisation wallet'
      : isLow
        ? `Low wallet balance: ${formatKes(balanceKes)}. Add credits.`
        : `Wallet balance: ${formatKes(balanceKes)}. Add credits.`

  return (
    <>
      <button
        type="button"
        onClick={() => setShowTopup(true)}
        className={cnPill(isLow)}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <span
          className="material-symbols-outlined text-[16px] leading-none"
          aria-hidden="true"
        >
          account_balance_wallet
        </span>

        <span className="whitespace-nowrap">
          {isLow && !loading && balanceKes !== null ? 'Low: ' : null}
          {buttonText}
        </span>
      </button>

      <WalletTopupModal
        orgSlug={orgSlug}
        open={showTopup}
        onClose={() => setShowTopup(false)}
        onTopupInitiated={() => {
          window.setTimeout(() => {
            void fetchBalance()
          }, 15_000)
        }}
      />
    </>
  )
}

function cnPill(isLow: boolean) {
  const base =
    'flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2'

  return isLow
    ? `${base} bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 dark:text-amber-400`
    : `${base} text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-variant)]`
}