// apps/web/app/api/auth/verify/route.ts
// POST /api/auth/verify  { email, code, returnTo? }
// Verifies an emailed magic-code and sets the authkit session cookie via the
// provider (verifyMagicCodeWeb → saveSession). No OAuth redirect. The client then
// navigates to `next` (sanitized returnTo, else /auth/post-login, which upserts
// the users row and routes to org/onboarding). Rate-limited per email + IP.
// Same-origin form POST; the cookie is set here so it MUST stay same-origin.
import { NextResponse, type NextRequest } from 'next/server'
import { verifyMagicCodeWeb } from '@mcloud/auth/management'
import { allowMagicVerify } from '../../_auth-ratelimit'
import { sanitizeReturnTo } from '../_return-to'

export async function POST(req: NextRequest) {
    let body: { email?: unknown; code?: unknown; returnTo?: unknown }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!email || !code) {
        return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    if (!allowMagicVerify(email, ip)) {
        return NextResponse.json(
            { error: 'Too many attempts. Please wait a few minutes and try again.' },
            { status: 429 },
        )
    }

    const user = await verifyMagicCodeWeb(email, code, req)
    if (!user) {
        return NextResponse.json(
            { error: 'That code is invalid or expired. Request a new one.' },
            { status: 400 },
        )
    }

    const next = sanitizeReturnTo(body.returnTo)
    return NextResponse.json({ ok: true, next }, { headers: { 'Cache-Control': 'no-store' } })
}
