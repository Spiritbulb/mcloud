'use client'

import { useState } from 'react'

const TOP_UP_AMOUNTS = [200, 500, 750, 1500]

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
        body: JSON.stringify({
          amountKes: Number(amount),
          phone,
        }),
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
      <div className="w-full max-w-sm border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-6 shadow-xl">
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
              className="mt-5 w-full bg-[var(--md-sys-color-primary)] px-4 py-2.5 text-[13px] font-semibold text-[var(--md-sys-color-on-primary)]"
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
              You&apos;ll get an M-Pesa prompt on your phone.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {TOP_UP_AMOUNTS.map((value) => {
                const selected = Number(amount) === value

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    className={[
                      'border px-3 py-2.5 text-left text-[13px] font-semibold transition-colors',
                      selected
                        ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]'
                        : 'border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container)]',
                    ].join(' ')}
                  >
                    KSh {value.toLocaleString()}
                  </button>
                )
              })}
            </div>

            <label className="mt-4 block text-[12px] font-medium text-[var(--md-sys-color-on-surface)]">
              Amount (KSh)
              <input
                type="number"
                min={20}
                step={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                className="mt-1 w-full border border-[var(--md-sys-color-outline-variant)] px-3 py-2 text-[14px] text-[var(--md-sys-color-on-surface)]"
              />
            </label>

            <label className="mt-3 block text-[12px] font-medium text-[var(--md-sys-color-on-surface)]">
              M-Pesa phone number
              <input
                type="tel"
                placeholder="0712345678"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                className="mt-1 w-full border border-[var(--md-sys-color-outline-variant)] px-3 py-2 text-[14px] text-[var(--md-sys-color-on-surface)]"
              />
            </label>

            {error && <p className="mt-3 text-[12px] text-red-700">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 border border-[var(--md-sys-color-outline-variant)] px-4 py-2.5 text-[13px] font-medium text-[var(--md-sys-color-on-surface)] disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || Number(amount) < 20}
                className="flex-1 bg-[var(--md-sys-color-primary)] px-4 py-2.5 text-[13px] font-semibold text-[var(--md-sys-color-on-primary)] disabled:opacity-40"
              >
                {submitting ? 'Sending…' : 'Done'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}