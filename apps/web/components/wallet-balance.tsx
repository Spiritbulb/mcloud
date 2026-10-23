'use client'

import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@mcloud/ui/kit/icon'
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

    // Each poll is a full proxy + function invocation, so keep it slow and refresh
    // immediately when the tab becomes visible again instead of polling for it.
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchBalance()
      }
    }, 5 * 60_000)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void fetchBalance()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
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
        <Icon name="account_balance_wallet" size={15} className={isLow ? undefined : 'text-muted-foreground'} />

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
  // Kit button shape (h-7, rounded-md); amber only when the balance is low.
  const base =
    'flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

  return isLow
    ? `${base} border-amber-300/70 bg-amber-50/60 text-amber-800 hover:bg-amber-100/60 dark:border-amber-500/30 dark:bg-amber-500/[0.06] dark:text-amber-300`
    : `${base} border-border bg-card text-foreground hover:bg-muted/60`
}