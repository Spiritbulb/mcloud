'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@mcloud/ui/utils'
import { Button } from '@mcloud/ui/button'

type Mode = 'login' | 'signup'

async function postJson(url: string, data: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; next?: string; error?: string }
  return { ok: res.ok, json }
}

export function MagicCodeForm({
  className,
  mode = 'login',
  returnTo,
  onSwitch,
}: {
  className?: string
  mode?: Mode
  returnTo?: string
  onSwitch?: () => void
}) {
  const router = useRouter()
  const [step, setStep] = React.useState<'email' | 'code'>('email')
  const [email, setEmail] = React.useState('')
  const [code, setCode] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const cta = mode === 'signup' ? 'Create account' : 'Continue'

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { ok, json } = await postJson('/api/auth/send-code', { email })
    setBusy(false)
    if (!ok) {
      setError(json.error ?? 'Could not send a code. Please try again.')
      return
    }
    setStep('code')
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { ok, json } = await postJson('/api/auth/verify', { email, code, returnTo })
    if (!ok) {
      setBusy(false)
      setError(json.error ?? 'That code is invalid or expired. Request a new one.')
      return
    }
    router.push(json.next ?? '/auth/post-login')
  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {step === 'email' ? (
        <form onSubmit={sendCode} className="flex flex-col gap-4">
          <input
            type="email"
            required
            autoFocus
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address"
            className="h-10 w-full rounded-none border border-input bg-background px-3 text-sm"
          />
          <Button type="submit" disabled={busy} className="w-full h-10 rounded-none google-button-primary">
            {busy ? 'Sending…' : cta}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code we emailed to <span className="text-foreground">{email}</span>.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-label="6-digit code"
            maxLength={6}
            pattern="[0-9]{6}"
            className="h-10 w-full rounded-none border border-input bg-background px-3 text-center text-lg tracking-[0.4em]"
          />
          <Button type="submit" disabled={busy} className="w-full h-10 rounded-none google-button-primary">
            {busy ? 'Verifying…' : 'Verify'}
          </Button>
          <button
            type="button"
            onClick={() => { setStep('email'); setCode(''); setError(null) }}
            className="text-center text-sm text-muted-foreground hover:underline underline-offset-4"
          >
            Use a different email
          </button>
        </form>
      )}

      {error && <p className="text-center text-sm text-destructive">{error}</p>}

      {onSwitch && (
        <p className="text-center text-sm text-muted-foreground">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={onSwitch}
            className="text-foreground font-medium hover:underline underline-offset-4"
          >
            {mode === 'signup' ? 'Sign in' : 'Get started free'}
          </button>
        </p>
      )}
    </div>
  )
}
