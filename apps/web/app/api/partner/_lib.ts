// Shared helpers for /api/partner/* route handlers.
// Partner routes serve a SINGLE known cross-origin caller (spiritb.uk) over
// server-to-server HTTP. They are gated by a shared secret (not bearer auth,
// not a browser session), so the caller must send `x-partner-secret` matching
// PARTNER_AUTH_SECRET. The gate FAILS CLOSED: a missing/unset secret is a 401,
// never an open fallthrough — this is safe precisely because there is one known
// caller (unlike /api/mobile/auth/*, where the mobile app sends no secret).

import { NextResponse, type NextRequest } from 'next/server'

/** JSON error response. Mirrors mobile/_lib's fail so the partner folder is self-contained. */
export function fail(status: number, error: string) {
    return NextResponse.json({ error }, { status })
}

/**
 * Enforce the partner shared secret. Returns a 401 NextResponse when the secret
 * is missing on the server, missing on the request, or does not match; returns
 * null when the caller is authorized.
 *
 * Usage:
 *   const denied = requirePartnerSecret(req)
 *   if (denied) return denied
 */
export function requirePartnerSecret(req: NextRequest): NextResponse | null {
    const expected = process.env.PARTNER_AUTH_SECRET
    const got = req.headers.get('x-partner-secret')
    // Fail closed if the server has no secret configured — never allow through
    // an unconfigured deployment.
    if (!expected || !got) return fail(401, 'Unauthorized')
    if (!timingSafeEqual(got, expected)) return fail(401, 'Unauthorized')
    return null
}

/**
 * Length-independent constant-time string comparison, to avoid leaking the
 * secret's length or a prefix via response timing. Compares char codes rather
 * than short-circuiting on the first mismatch.
 */
function timingSafeEqual(a: string, b: string): boolean {
    let diff = a.length ^ b.length
    const len = Math.max(a.length, b.length)
    for (let i = 0; i < len; i++) {
        diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
    }
    return diff === 0
}
