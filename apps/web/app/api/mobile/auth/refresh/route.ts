// POST /api/mobile/auth/refresh  { refreshToken }
// Unauthenticated by necessity (the access token may already be expired —
// that's the whole reason this call exists). The refresh token IS the
// credential. Returns a fresh WorkOS pair, same shape as verify/redeem.
import { NextResponse, type NextRequest } from 'next/server'
import { WorkOS } from '@workos-inc/node'
import { fail } from '../../_lib'

const workos = new WorkOS(process.env.WORKOS_API_KEY!)

export async function POST(req: NextRequest) {
    let body: { refreshToken?: unknown }
    try {
        body = await req.json()
    } catch {
        return fail(400, 'Invalid request body')
    }

    const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : ''
    if (!refreshToken) return fail(400, 'Refresh token is required')

    try {
        const result = await workos.userManagement.authenticateWithRefreshToken({
            clientId: process.env.WORKOS_CLIENT_ID!,
            refreshToken,
        })
        return NextResponse.json(
            { accessToken: result.accessToken, refreshToken: result.refreshToken },
            { headers: { 'Cache-Control': 'no-store' } },
        )
    } catch {
        // Refresh token invalid/revoked/expired — caller must re-authenticate.
        return fail(401, 'Session expired. Please sign in again.')
    }
}