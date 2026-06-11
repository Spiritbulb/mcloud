// TEMPORARY diagnostic — remove after the auth env issue is resolved.
// GET /api/mobile/debug-auth  (with Authorization: Bearer <token>)
// Reports which step of token verification fails, and whether the server env is
// configured, WITHOUT exposing secret values.
import { NextResponse, type NextRequest } from 'next/server'
import { createRemoteJWKSet, jwtVerify } from 'jose'

export async function GET(req: NextRequest) {
    const out: Record<string, unknown> = {}

    // 1. Env presence (values masked).
    const clientId = process.env.WORKOS_CLIENT_ID ?? null
    out.env = {
        WORKOS_CLIENT_ID: clientId ? `${clientId.slice(0, 14)}…` : 'MISSING',
        WORKOS_CLIENT_ID_full: clientId, // the client id is public, safe to show
        WORKOS_API_KEY: process.env.WORKOS_API_KEY ? 'present' : 'MISSING',
    }

    const header = req.headers.get('authorization')
    const token = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
    if (!token) {
        out.token = 'no bearer token provided'
        return NextResponse.json(out)
    }
    out.tokenLength = token.length

    // 2. JWKS signature verification (uses WORKOS_CLIENT_ID).
    try {
        const jwks = createRemoteJWKSet(new URL(`https://api.workos.com/sso/jwks/${clientId}`))
        const { payload } = await jwtVerify(token, jwks)
        out.jwtVerify = 'OK'
        out.sub = typeof payload.sub === 'string' ? payload.sub : null
        out.iss = payload.iss ?? null
        out.aud = payload.aud ?? null
    } catch (e) {
        out.jwtVerify = `FAILED: ${e instanceof Error ? e.message : String(e)}`
        return NextResponse.json(out)
    }

    // 3. getUser via the management API (uses WORKOS_API_KEY).
    try {
        const { getWorkOS } = await import('@workos-inc/authkit-nextjs')
        const user = await getWorkOS().userManagement.getUser(out.sub as string)
        out.getUser = user ? 'OK' : 'returned null'
        out.userEmailPresent = !!(user as { email?: string })?.email
    } catch (e) {
        out.getUser = `FAILED: ${e instanceof Error ? e.message : String(e)}`
    }

    return NextResponse.json(out)
}
