// apps/web/app/dev-login/page.tsx
'use client'

import { useState } from 'react'
import { NextRequest } from 'next/server'
import { useRouter } from 'next/navigation'
import { redirectToOrgPath } from '../(merchant)/org/_lib/redirect'

export default function DevLoginPage( { to }: { to: string } ) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (process.env.NODE_ENV === 'production') {
    return <p className="p-8 text-sm text-neutral-500">Not available in production.</p>
  }

  async function sendCode() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to send code')
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function verify() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Verification failed')
      router.push(to)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto mt-20 max-w-xs space-y-3 px-4">
      <h1 className="text-lg font-semibold">Dev Login</h1>

      {!sent ? (
        <>
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          <button
            onClick={sendCode}
            disabled={loading || !email}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            placeholder="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          <button
            onClick={verify}
            disabled={loading || !code}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}