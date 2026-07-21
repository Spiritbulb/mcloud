// POST /api/mobile/auth/handoff  { refreshToken, redirectTo }
//   header: Authorization: Bearer <accessToken>
// mobile -> mcloud.co.ke web SSO handoff. Bearer-authed (no secret, since an app
// binary cannot hold one). The access token comes from the bearer header; the
// refresh token is sent in the body (the app holds it on-device) so the sealed
// pair is refreshable after redeem. Seals the pair into a 60s single-use ticket.
import { NextResponse, type NextRequest } from 'next/server'
import { fail, requireMobileUser } from '../../_lib'
import { mintTicket } from '../../../_handoff/tickets'
import { allowHandoffMint } from '../../../_auth-ratelimit'

const MCLOUD_ORIGIN = process.env.MCLOUD_WEB_ORIGIN ?? 'https://mcloud.co.ke'

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const accessToken =
        req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? ''

    let body: { refreshToken?: unknown; redirectTo?: unknown }
    try {
        body = await req.json()
    } catch {
        return fail(400, 'Invalid request body')
    }
    const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : ''
    if (!accessToken || !refreshToken) return fail(400, 'Tokens are required')

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    if (!allowHandoffMint(auth.user.id, ip)) {
        return fail(429, 'Too many attempts. Please wait a few minutes and try again.')
    }

    const id = await mintTicket({ accessToken, refreshToken }, body.redirectTo)
    return NextResponse.json(
        { url: `${MCLOUD_ORIGIN}/auth/handoff?ticket=${id}` },
        { headers: { 'Cache-Control': 'no-store' } },
    )
}
