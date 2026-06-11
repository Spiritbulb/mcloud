// GET /api/mobile/orgs — orgs the authenticated mobile user belongs to.
import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { listUserOrgs } from '@/lib/merchant/orgs'
import { requireMobileUser } from '../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const orgs = await listUserOrgs(auth.user.id)
    return NextResponse.json({ orgs })
}
