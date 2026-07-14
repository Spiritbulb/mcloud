// POST /api/partner/auth/send-code  { email }   (header: x-partner-secret)
// Partner (spiritb.uk) counterpart to /api/mobile/auth/send-code. Emails a
// one-time magic-code (WorkOS Magic Auth). Gated by the partner shared secret
// (server-to-server); otherwise identical to the mobile route: always responds
// 200 { ok: true } to avoid account enumeration, rate-limited per email + IP.
import { NextResponse, type NextRequest } from 'next/server'
import { sendMagicCode } from '@mcloud/auth/management'
import { fail, requirePartnerSecret } from '../../_lib'
import { allowMagicSend } from '../../../_auth-ratelimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
    const denied = requirePartnerSecret(req)
    if (denied) return denied

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
    try {
        await sendMagicCode(email)
    } catch {
        // swallowed by design (no enumeration / no provider-detail leak)
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
