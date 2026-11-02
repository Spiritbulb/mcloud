import { createHash } from 'node:crypto'

export type WaitlistInput = {
  email: string
  kind: 'uploads' | 'institution'
  institutionName: string | null
  note: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** A trimmed string, or null when empty; undefined when the value is not a string. */
function optional(v: unknown): string | null | undefined {
  if (v === undefined || v === null) return null
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t === '' ? null : t
}

export function parseWaitlistInput(body: unknown): { ok: true; value: WaitlistInput } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Invalid request body' }
  const b = body as Record<string, unknown>

  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : ''
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, error: 'Enter a valid email address' }

  if (b.kind !== 'uploads' && b.kind !== 'institution') return { ok: false, error: 'Unknown waitlist' }
  const kind = b.kind

  const institutionName = optional(b.institutionName)
  if (institutionName === undefined || (institutionName?.length ?? 0) > 120) {
    return { ok: false, error: 'Institution name must be 120 characters or fewer' }
  }
  if (kind === 'institution' && institutionName === null) return { ok: false, error: 'Enter your institution name' }

  const note = optional(b.note)
  if (note === undefined || (note?.length ?? 0) > 500) return { ok: false, error: 'Note must be 500 characters or fewer' }

  return {
    ok: true,
    value: { email, kind, institutionName: kind === 'institution' ? institutionName : null, note },
  }
}

export function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}
