// POST /api/partner/auth/handoff  { accessToken, refreshToken, redirectTo }
//   header: x-partner-secret
// spiritb.uk -> mcloud.co.ke SSO handoff (flow #2). Verifies the caller (partner
// secret) AND that the access token is a live WorkOS session, then seals the pair
// into a 60s single-use ticket and returns the redeem URL. The tokens never
// appear in the returned URL; only the opaque ticket id does.
import { NextResponse, type NextRequest } from 'next/server'
import { getSessionFromToken } from '@mcloud/auth/server'
import { fail, requirePartnerSecret } from '../../_lib'
import { mintTicket } from '../../../_handoff/tickets'
import { allowHandoffMint } from '../../../_auth-ratelimit'

const MCLOUD_ORIGIN = process.env.MCLOUD_WEB_ORIGIN ?? 'https://mcloud.co.ke'

export async function POST(req: NextRequest) {
    const denied = requirePartnerSecret(req)
    if (denied) return denied

    let body: { accessToken?: unknown; refreshToken?: unknown; redirectTo?: unknown }
    try {
        body = await req.json()
    } catch {
        return fail(400, 'Invalid request body')
    }

    const accessToken = typeof body.accessToken === 'string' ? body.accessToken : ''
    const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : ''
    if (!accessToken || !refreshToken) return fail(400, 'Tokens are required')

    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'

    // The partner secret proves the caller; verifying the access token proves it is
    // a real, live session before we mint anything for that user.
    const session = await getSessionFromToken(accessToken)
    if (!session?.user) return fail(401, 'Unauthorized')

    if (!allowHandoffMint(session.user.id, ip)) {
        return fail(429, 'Too many attempts. Please wait a few minutes and try again.')
    }

    const id = await mintTicket({ accessToken, refreshToken }, body.redirectTo)
    return NextResponse.json(
        { url: `${MCLOUD_ORIGIN}/auth/handoff?ticket=${id}` },
        { headers: { 'Cache-Control': 'no-store' } },
    )
}
