// GET /api/mobile/picker — the mobile home payload: the user's orgs (each with
// their stores) + "other workspace" stores they manage elsewhere. Mirrors the
// web org-page model. Bearer-authed.
import { NextResponse, type NextRequest } from 'next/server'
import { getPickerData } from '@/lib/merchant/orgs'
import { requireMobileUser } from '../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const data = await getPickerData(auth.user.id)
    return NextResponse.json(data, {
        headers: { 'Cache-Control': 'no-store' },
    })
}
