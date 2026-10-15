// @route-kind: mobile
// GET /api/mobile/reach/vendor/me — the store this vendor works for, and whether it is on the
// marketplace. 403 when the user is not a vendor (never joined, or their store key was revoked),
// which the app treats as "ask for a key again".
import { NextResponse, type NextRequest } from 'next/server'
import { vendorFor } from '@/lib/reach/vendor'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const vendor = await vendorFor(auth.user.id)
    if (!vendor) return fail(403, 'Not a vendor')

    return NextResponse.json({ vendor }, { headers: { 'Cache-Control': 'no-store' } })
}
