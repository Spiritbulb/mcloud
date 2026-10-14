// @route-kind: mobile
// GET /api/mobile/me — the authenticated mobile user (bearer token → AuthUser).
// Used by the app to hydrate the session on boot and confirm a token is valid.
import { NextResponse, type NextRequest } from 'next/server'
import { requireMobileUser } from '../_lib'
import { createClient } from '@mcloud/db/server'
import { resolveMobileRole } from '@/lib/reach-role'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const supabase = await createClient()
    const [{ data, error }, { data: reach }] = await Promise.all([
        supabase.from('users').select('role').eq('id', auth.user.id).single(),
        supabase.from('reach_users').select('role').eq('user_id', auth.user.id).maybeSingle(),
    ])

    if (error) {
        return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
    }

    const role = resolveMobileRole(data?.role, reach?.role)
    return NextResponse.json(
        { user: { ...auth.user, role } },
        { headers: { 'Cache-Control': 'no-store' } },
    )
}
