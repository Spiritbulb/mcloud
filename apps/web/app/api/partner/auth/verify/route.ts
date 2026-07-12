// POST /api/partner/auth/verify  { email, code }   (header: x-partner-secret)
// Partner (spiritb.uk) counterpart to /api/mobile/auth/verify. Exchanges an
// emailed magic-code for the WorkOS token pair and provisions the users row.
// Gated by the partner shared secret (server-to-server); otherwise identical to
// the mobile route. Returns { accessToken, refreshToken, expiresIn } — the shape
// spiritbulb's mcloud-client already consumes.
import { NextResponse, type NextRequest } from 'next/server'
import { verifyMagicCode } from '@mcloud/auth/management'
import { ensureUserRow } from '@mcloud/auth/callback'
import { fail, requirePartnerSecret } from '../../_lib'
import { allowMagicVerify } from '../../../_auth-ratelimit'

export async function POST(req: NextRequest) {
    const denied = requirePartnerSecret(req)
    if (denied) return denied

    let body: { email?: unknown; code?: unknown }
    try {
        body = await req.json()
    } catch {
        return fail(400, 'Invalid request body')
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!email || !code) return fail(400, 'Email and code are required')

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    if (!allowMagicVerify(email, ip)) {
        return fail(429, 'Too many attempts. Please wait a few minutes and try again.')
    }

    const tokens = await verifyMagicCode(email, code)
    if (!tokens) return fail(400, 'That code is invalid or expired. Request a new one.')

    // Provision the DB row before returning so the very first authed action
    // (e.g. creating an org) has a users row to FK against. Idempotent.
    await ensureUserRow(tokens.user)

    return NextResponse.json(
        {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
        },
        { headers: { 'Cache-Control': 'no-store' } },
    )
}
