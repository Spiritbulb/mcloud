// POST /api/mobile/auth/verify  { email, code }
// Exchanges an emailed magic-code for the WorkOS token pair (the same access +
// refresh JWTs the mobile app already stores and that /api/mobile/* verify via
// JWKS). On success, provisions the users row (mobile has no login callback) so
// later org/store writes that FK to users.id resolve. Unauthenticated by
// necessity — the valid code IS the credential.
import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyMagicCode, verifyPassword } from '@mcloud/auth/management'
import { ensureUserRow } from '@mcloud/auth/callback'
import { fail } from '../../_lib'
import { allowMagicVerify } from '../../../_auth-ratelimit'

// The ONE app-store review account may sign in with a password instead of a
// magic code, because store reviewers cannot receive the emailed code. This is
// gated entirely by env: with either var unset the branch is unreachable and
// every account (including this email) stays magic-code only. Fails closed.
const REVIEW_EMAIL = process.env.REVIEW_ACCOUNT_EMAIL?.trim().toLowerCase() || ''
const REVIEW_PASSWORD = process.env.REVIEW_ACCOUNT_PASSWORD || ''

function isReviewLogin(email: string): boolean {
    return REVIEW_EMAIL !== '' && REVIEW_PASSWORD !== '' && email === REVIEW_EMAIL
}

/** Constant-time compare that never throws on length mismatch. */
function secretEquals(a: string, b: string): boolean {
    const ab = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ab.length !== bb.length) return false
    return timingSafeEqual(ab, bb)
}

export async function POST(req: NextRequest) {
    let body: { email?: unknown; code?: unknown; password?: unknown }
    try {
        body = await req.json()
    } catch {
        return fail(400, 'Invalid request body')
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email) return fail(400, 'Email is required')

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    if (!allowMagicVerify(email, ip)) {
        return fail(429, 'Too many attempts. Please wait a few minutes and try again.')
    }

    // ── Review-account password path (env-gated, single email) ────────────────
    if (isReviewLogin(email)) {
        if (!password || !secretEquals(password, REVIEW_PASSWORD)) {
            return fail(400, 'Invalid credentials.')
        }
        const tokens = await verifyPassword(email, password)
        if (!tokens) return fail(400, 'Invalid credentials.')
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

    // ── Normal magic-code path (everyone else) ────────────────────────────────
    if (!code) return fail(400, 'Email and code are required')

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
