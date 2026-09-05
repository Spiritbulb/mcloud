'use client'

import { useState } from 'react'

export function WalletTopupModal({
  orgSlug,
  open,
  onClose,
  onTopupInitiated,
}: {
  orgSlug: string
  open: boolean
  onClose: () => void
  onTopupInitiated?: () => void
}) {
  const [amount, setAmount] = useState('750')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  if (!open) return null

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/org/${orgSlug}/wallet/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountKes: Number(amount), phone }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to start top-up')
      }

      setSent(true)
      onTopupInitiated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start top-up')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--md-sys-color-surface)] p-6 shadow-xl">
        {sent ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--md-sys-color-on-surface)]">
              Check your phone
            </p>
            <p className="mt-2 text-[13px] text-[var(--md-sys-color-on-surface-variant)]">
              Enter your M-Pesa PIN to complete the top-up. Your credits will
              reflect within a minute of confirming.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-[var(--md-sys-color-primary)] px-4 py-2.5 text-[13px] font-semibold text-[var(--md-sys-color-on-primary)]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 className="text-base font-semibold text-[var(--md-sys-color-on-surface)]">
              Add credits
            </h3>
            <p className="mt-1 text-[12px] text-[var(--md-sys-color-on-surface-variant)]">
              Minimum top-up is KSh 750. You&apos;ll get an M-Pesa prompt on your phone.
            </p>

            <label className="mt-4 block text-[12px] font-medium text-[var(--md-sys-color-on-surface)]">
              Amount (KSh)
              <input
                type="number"
                min={750}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-[var(--md-sys-color-outline-variant)] px-3 py-2 text-[14px]"
              />
            </label>

            <label className="mt-3 block text-[12px] font-medium text-[var(--md-sys-color-on-surface)]">
              M-Pesa phone number
              <input
                type="tel"
                placeholder="0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-[var(--md-sys-color-outline-variant)] px-3 py-2 text-[14px]"
              />
            </label>

            {error && <p className="mt-3 text-[12px] text-red-700">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-[var(--md-sys-color-outline-variant)] px-4 py-2.5 text-[13px] font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-[var(--md-sys-color-primary)] px-4 py-2.5 text-[13px] font-semibold text-[var(--md-sys-color-on-primary)] disabled:opacity-40"
              >
                {submitting ? 'Sending…' : 'Send STK Push'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}