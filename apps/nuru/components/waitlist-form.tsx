'use client'
import { useState, type FormEvent } from 'react'

type Props = { kind: 'uploads' | 'institution'; signedInEmail: string | null }
type Status = { state: 'idle' } | { state: 'sending' } | { state: 'done'; already: boolean } | { state: 'error'; message: string }

const field =
  'ui-sans mt-1 w-full rounded-md border border-[var(--line)] bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 read-only:text-[var(--muted)]'

export function WaitlistForm({ kind, signedInEmail }: Props) {
  const [status, setStatus] = useState<Status>({ state: 'idle' })

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setStatus({ state: 'sending' })
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          kind,
          institutionName: form.get('institutionName') ?? undefined,
          note: form.get('note'),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.')
      setStatus({ state: 'done', already: data.already === true })
    } catch (err) {
      setStatus({ state: 'error', message: err instanceof Error ? err.message : 'Something went wrong. Please try again.' })
    }
  }

  if (status.state === 'done') {
    return (
      <p role="status" className="mt-6 border-l-2 border-[var(--accent)] pl-3 text-[var(--ink)]">
        {status.already ? "You're already on the list." : "You're on the list. We'll email you."}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="ui-sans block text-sm">
        Email
        <input name="email" type="email" required maxLength={254} autoComplete="email"
          defaultValue={signedInEmail ?? ''} readOnly={signedInEmail !== null} className={field} />
      </label>
      {kind === 'institution' && (
        <label className="ui-sans block text-sm">
          Institution name
          <input name="institutionName" type="text" required maxLength={120} className={field} />
        </label>
      )}
      <label className="ui-sans block text-sm">
        Note (optional)
        <textarea name="note" rows={3} maxLength={500} className={field} />
      </label>
      {status.state === 'error' && (
        <p role="alert" className="ui-sans text-sm text-red-700 dark:text-red-400">{status.message}</p>
      )}
      <button type="submit" disabled={status.state === 'sending'}
        className="ui-sans rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--paper)] transition-opacity disabled:opacity-60">
        {status.state === 'sending' ? 'Joining...' : 'Join the waitlist'}
      </button>
    </form>
  )
}
