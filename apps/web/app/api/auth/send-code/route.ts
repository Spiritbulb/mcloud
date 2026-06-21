// apps/web/app/api/auth/send-code/route.ts
// POST /api/auth/send-code  { email }
// Emails a one-time magic-code (WorkOS Magic Auth) for in-app web login. Always
// 200 regardless of whether the email exists, to avoid account enumeration.
// Rate-limited per email + per IP. Same-origin form POST (no CORS needed).
import { NextResponse, type NextRequest } from 'next/server'
import { sendMagicCode } from '@mcloud/auth/management'
import { allowMagicSend } from '../../_auth-ratelimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
    let body: { email?: unknown }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!EMAIL_RE.test(email)) {
        return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'

    if (!allowMagicSend(email, ip)) {
        return NextResponse.json(
            { error: 'Too many attempts. Please wait a few minutes and try again.' },
            { status: 429 },
        )
    }

    // Don't leak whether the email exists or whether WorkOS errored — always 200.
    try {
        await sendMagicCode(email)
    } catch {
        // swallowed by design (no enumeration / no provider-detail leak)
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
