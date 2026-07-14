'use client'

// Client island for NGO stores. It attaches a single delegated click listener
// for the campaigns section's `.sf-donate` buttons (`[data-campaign-id]`),
// opens an on-theme modal to collect amount + guest + dedication + payment
// method, POSTs to /api/store/{slug}/donate, and — on success — drives the
// SAME payment provider steps the cart uses (via lib/payment-trigger), keyed by
// the returned orderNumber. It does NOT reimplement provider logic.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolveAmount, buildDonatePayload } from './donate-island-logic'
import { submitMpesaCode, triggerDarajaStkPush, triggerPaypalOrder } from '@/lib/payment-trigger'

interface Integrations {
  mpesaEnabled: boolean
  darajaEnabled: boolean
  paypalEnabled: boolean
}

interface OpenCampaign {
  id: string
  title: string
  presets: number[]
  allowCustom: boolean
}

type Status = { phase: 'form' } | { phase: 'submitting' } | { phase: 'stk'; phone: string } | { phase: 'error'; message: string }

const API = process.env.NEXT_PUBLIC_API_BASE_URL

function parsePresets(raw: string | null): number[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
}

export function DonateIsland({ slug }: { slug: string }) {
  const [campaign, setCampaign] = useState<OpenCampaign | null>(null)
  const [integrations, setIntegrations] = useState<Integrations | null>(null)

  // Form state (reset per open).
  const [preset, setPreset] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [mpesaCode, setMpesaCode] = useState('')
  const [dedication, setDedication] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'paypal'>('mpesa')
  const [status, setStatus] = useState<Status>({ phase: 'form' })
  const idempotencyKey = useRef('')

  // Delegated listener for the section's Donate buttons.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const btn = target?.closest<HTMLElement>('[data-campaign-id]')
      if (!btn) return
      e.preventDefault()
      const presets = parsePresets(btn.getAttribute('data-presets'))
      const allowCustom = btn.getAttribute('data-allow-custom') === 'true'
      setCampaign({
        id: btn.getAttribute('data-campaign-id') ?? '',
        title: btn.getAttribute('data-campaign-title') ?? 'this campaign',
        presets,
        allowCustom,
      })
      // Fresh state per open, including a fresh idempotency key so a resubmit of
      // the same modal dedupes but a new donation gets a new key.
      idempotencyKey.current = crypto.randomUUID()
      setPreset(presets[0] ?? null)
      setCustom('')
      setEmail('')
      setPhone('')
      setMpesaCode('')
      setDedication('')
      setPaymentMethod('mpesa')
      setStatus({ phase: 'form' })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // Load the store's configured providers once (same route the cart uses).
  useEffect(() => {
    let alive = true
    fetch(`${API}/store/${slug}/integrations`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return
        setIntegrations({
          mpesaEnabled: data?.mpesa?.enabled ?? false,
          darajaEnabled: data?.mpesa?.darajaEnabled ?? false,
          paypalEnabled: data?.paypal?.enabled ?? false,
        })
      })
      .catch(() => { if (alive) setIntegrations({ mpesaEnabled: false, darajaEnabled: false, paypalEnabled: false }) })
    return () => { alive = false }
  }, [slug])

  const close = useCallback(() => setCampaign(null), [])

  const amount = useMemo(() => resolveAmount({ preset, custom }), [preset, custom])
  const isDaraja = paymentMethod === 'mpesa' && integrations?.darajaEnabled

  const submit = useCallback(async () => {
    if (!campaign) return
    if (amount === null) { setStatus({ phase: 'error', message: 'Choose or enter a valid amount' }); return }
    if (paymentMethod === 'mpesa' && !phone.trim()) {
      setStatus({ phase: 'error', message: 'M-PESA phone number is required' }); return
    }

    setStatus({ phase: 'submitting' })
    try {
      const body = buildDonatePayload({
        campaignId: campaign.id,
        amount,
        email: email.trim(),
        phone: phone.trim(),
        paymentMethod,
        idempotencyKey: idempotencyKey.current,
        dedication,
      })
      const res = await fetch(`/api/store/${slug}/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as { orderNumber?: string; error?: string }
      if (!res.ok || !data.orderNumber) {
        throw new Error(data.error ?? 'Donation failed')
      }
      const orderNumber = data.orderNumber

      // Drive the SAME provider step the cart uses, by orderNumber.
      if (paymentMethod === 'paypal') {
        const approvalUrl = await triggerPaypalOrder(
          orderNumber,
          [{ name: `Donation · ${campaign.title}`.slice(0, 100), sku: 'DONATION', price: Math.max(0.01, amount), quantity: 1 }],
          amount,
        )
        window.location.href = approvalUrl
        return
      }

      // M-PESA: STK push when Daraja is on, else attach the manual code.
      if (isDaraja) {
        await triggerDarajaStkPush(slug, orderNumber, phone.trim(), amount)
        setStatus({ phase: 'stk', phone: phone.trim() })
        // The order is created; the payment confirms out-of-band via the STK
        // prompt. Send the donor to their order page to track it.
        setTimeout(() => { window.location.href = `/orders/${orderNumber}` }, 1500)
        return
      }

      await submitMpesaCode(slug, orderNumber, mpesaCode)
      window.location.href = `/orders/${orderNumber}`
    } catch (e: any) {
      setStatus({ phase: 'error', message: e?.message || 'Donation failed' })
    }
  }, [campaign, amount, paymentMethod, phone, email, dedication, slug, mpesaCode, isDaraja])

  if (!campaign) return null

  const submitting = status.phase === 'submitting' || status.phase === 'stk'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Donate to ${campaign.title}`}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) close() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '1rem',
        background: 'color-mix(in srgb, var(--sf-foreground) 45%, transparent)',
      }}
    >
      <div
        className="sf-card"
        style={{
          width: '100%', maxWidth: '28rem', maxHeight: '90vh', overflowY: 'auto',
          background: 'var(--sf-background)', border: '1px solid var(--sf-border)', padding: '1.5rem',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="sf-heading text-xl font-light" style={{ color: 'var(--sf-foreground)' }}>
            Donate to {campaign.title}
          </h2>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            aria-label="Close"
            style={{ color: 'var(--sf-foreground)', opacity: 0.5, fontSize: '1.25rem', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {status.phase === 'stk' ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm font-medium" style={{ color: 'var(--sf-foreground)' }}>Check your phone</p>
            <p className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
              An M-PESA prompt was sent to {status.phone}. Enter your PIN to complete the donation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Amount presets */}
            {campaign.presets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--sf-foreground-subtle)' }}>Amount (KES)</p>
                <div className="flex flex-wrap gap-2">
                  {campaign.presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setPreset(p); setCustom('') }}
                      className={`sf-pill ${preset === p ? 'sf-pill-active' : 'sf-pill-inactive'} border px-4 py-2 text-sm`}
                    >
                      {p.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {campaign.allowCustom && (
              <div className="space-y-1.5">
                <label htmlFor="donate-custom" className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                  {campaign.presets.length > 0 ? 'Or enter a custom amount' : 'Amount (KES)'}
                </label>
                <input
                  id="donate-custom"
                  inputMode="numeric"
                  value={custom}
                  onChange={(e) => { setCustom(e.target.value); setPreset(null) }}
                  placeholder="e.g. 2000"
                  className="w-full px-3 py-2 text-sm"
                  style={{ background: 'var(--sf-background)', border: '1px solid var(--sf-border)', color: 'var(--sf-foreground)' }}
                />
              </div>
            )}

            {/* Payment method */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--sf-foreground-subtle)' }}>Payment method</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mpesa')}
                  disabled={!integrations?.mpesaEnabled}
                  className={`flex-1 py-2 text-sm border sf-pill ${paymentMethod === 'mpesa' ? 'sf-pill-active' : 'sf-pill-inactive'}`}
                >
                  M-PESA
                </button>
                {integrations?.paypalEnabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paypal')}
                    className={`flex-1 py-2 text-sm border sf-pill ${paymentMethod === 'paypal' ? 'sf-pill-active' : 'sf-pill-inactive'}`}
                  >
                    PayPal
                  </button>
                )}
              </div>
              {integrations && !integrations.mpesaEnabled && !integrations.paypalEnabled && (
                <p className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                  Payments are not yet configured for this store.
                </p>
              )}
            </div>

            {/* M-PESA fields */}
            {paymentMethod === 'mpesa' && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="donate-phone" className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                    M-PESA Phone <span className="sf-required">*</span>
                  </label>
                  <input
                    id="donate-phone"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0712 345 678"
                    className="w-full px-3 py-2 text-sm"
                    style={{ background: 'var(--sf-background)', border: '1px solid var(--sf-border)', color: 'var(--sf-foreground)' }}
                  />
                </div>
                {!isDaraja && (
                  <div className="space-y-1.5">
                    <label htmlFor="donate-code" className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                      Transaction Code <span style={{ opacity: 0.55 }}>(after paying)</span>
                    </label>
                    <input
                      id="donate-code"
                      value={mpesaCode}
                      onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                      placeholder="e.g. QW12ABCDEF"
                      className="w-full px-3 py-2 text-sm"
                      style={{ background: 'var(--sf-background)', border: '1px solid var(--sf-border)', color: 'var(--sf-foreground)' }}
                    />
                  </div>
                )}
              </>
            )}

            {/* Email (receipt) */}
            <div className="space-y-1.5">
              <label htmlFor="donate-email" className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                Email <span style={{ opacity: 0.55 }}>(for receipt)</span>
              </label>
              <input
                id="donate-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 text-sm"
                style={{ background: 'var(--sf-background)', border: '1px solid var(--sf-border)', color: 'var(--sf-foreground)' }}
              />
            </div>

            {/* Dedication */}
            <div className="space-y-1.5">
              <label htmlFor="donate-dedication" className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                Dedication <span style={{ opacity: 0.55 }}>(optional)</span>
              </label>
              <input
                id="donate-dedication"
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
                placeholder="In honour of…"
                className="w-full px-3 py-2 text-sm"
                style={{ background: 'var(--sf-background)', border: '1px solid var(--sf-border)', color: 'var(--sf-foreground)' }}
              />
            </div>

            {status.phase === 'error' && (
              <p className="text-xs" style={{ color: 'var(--sf-accent)' }}>{status.message}</p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting || (!integrations?.mpesaEnabled && !integrations?.paypalEnabled)}
              className="w-full sf-btn-primary py-3 text-sm"
            >
              {status.phase === 'submitting'
                ? 'Processing…'
                : amount !== null
                  ? `Donate KES ${amount.toLocaleString()}`
                  : 'Donate'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
