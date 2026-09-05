'use client'

import { useEffect, useState } from 'react'
import { WalletTopupModal } from './topup-modal'

function formatKes(amount: number) {
  return `KSh ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function WalletBalancePill({ orgSlug }: { orgSlug: string }) {
  const [balanceCents, setBalanceCents] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTopup, setShowTopup] = useState(false)

  async function fetchBalance() {
    try {
      const res = await fetch(`/api/org/${orgSlug}/wallet/balance`)
      if (res.ok) {
        const data = await res.json()
        setBalanceCents(data.balanceCents)
      }
    } catch {
      // non-fatal — pill just stays in its last known state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchBalance()
    // Light polling so the pill updates after a webhook lands or an hourly
    // charge fires elsewhere, without needing a realtime channel for this.
    const interval = setInterval(fetchBalance, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug])

  const balanceKes = balanceCents === null ? null : balanceCents / 100
  const isLow = balanceKes !== null && balanceKes < 750

  return (
    <>
      <button
        type="button"
        onClick={() => setShowTopup(true)}
        className={cnPill(isLow)}
        aria-label="Add credits"
      >
        <span className="material-symbols-outlined text-[16px] leading-none">
          account_balance_wallet
        </span>
        <span className="whitespace-nowrap">
          {loading ? '…' : balanceKes === null ? 'Add credits' : formatKes(balanceKes)}
        </span>
      </button>

      <WalletTopupModal
        orgSlug={orgSlug}
        open={showTopup}
        onClose={() => setShowTopup(false)}
        onTopupInitiated={() => {
          // Balance updates async once the webhook confirms — re-poll shortly
          // after the user confirms the STK prompt on their phone.
          setTimeout(fetchBalance, 15000)
        }}
      />
    </>
  )
}

function cnPill(isLow: boolean) {
  const base =
    'flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--md-sys-color-surface-variant)] cursor-pointer rounded-2xl'
  return isLow
    ? `${base} text-amber-500`
    : `${base} text-[var(--md-sys-color-on-surface)]`
}