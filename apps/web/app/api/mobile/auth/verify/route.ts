// POST /api/mobile/auth/verify  { email, code }
// Exchanges an emailed magic-code for the WorkOS token pair (the same access +
// refresh JWTs the mobile app already stores and that /api/mobile/* verify via
// JWKS). On success, provisions the users row (mobile has no login callback) so
// later org/store writes that FK to users.id resolve. Unauthenticated by
// necessity — the valid code IS the credential.
import { NextResponse, type NextRequest } from 'next/server'
import { verifyMagicCode } from '@mcloud/auth/management'
import { ensureUserRow } from '@mcloud/auth/callback'
import { fail } from '../../_lib'

export async function POST(req: NextRequest) {
    let body: { email?: unknown; code?: unknown }
    try {
        body = await req.json()
    } catch {
        return fail(400, 'Invalid request body')
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!email || !code) return fail(400, 'Email and code are required')

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
