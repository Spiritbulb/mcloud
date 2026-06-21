// POST /api/mobile/auth/send-code  { email }
// Emails a one-time magic-code to `email` (WorkOS Magic Auth). This is one of the
// only two UNAUTHENTICATED mobile routes — it mints the login. It always responds
// 200 { ok: true } regardless of whether the email exists, to avoid account
// enumeration. Rate-limited per email + per IP (best-effort; see _auth-ratelimit).
import { NextResponse, type NextRequest } from 'next/server'
import { sendMagicCode } from '@mcloud/auth/management'
import { fail } from '../../_lib'
import { allowMagicSend } from '../../../_auth-ratelimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
    let body: { email?: unknown }
    try {
        body = await req.json()
    } catch {
        return fail(400, 'Invalid request body')
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!EMAIL_RE.test(email)) return fail(400, 'Enter a valid email address')

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'

    if (!allowMagicSend(email, ip)) {
        return fail(429, 'Too many attempts. Please wait a few minutes and try again.')
    }

    // Don't leak whether the email exists or whether WorkOS errored — always 200.
    // A genuine send failure simply means no code arrives; the user can retry.
    try {
        await sendMagicCode(email)
    } catch {
        // swallowed by design (no enumeration / no provider-detail leak)
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
