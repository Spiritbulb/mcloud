// GET /api/mobile/me — the authenticated mobile user (bearer token → AuthUser).
// Used by the app to hydrate the session on boot and confirm a token is valid.
import { NextResponse, type NextRequest } from 'next/server'
import { requireMobileUser } from '../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    return NextResponse.json({ user: auth.user })
}
