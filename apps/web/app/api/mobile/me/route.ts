// GET /api/mobile/me — the authenticated mobile user (bearer token → AuthUser).
// Used by the app to hydrate the session on boot and confirm a token is valid.
import { NextResponse, type NextRequest } from 'next/server'
import { requireMobileUser } from '../_lib'
import { createClient } from '@mcloud/db/server'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const supabase = await createClient()
    const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', auth.user.id)
        .single()

    const role = (data?.role as string | null) ?? 'user'
    return NextResponse.json(
        { user: { ...auth.user, role } },
        { headers: { 'Cache-Control': 'no-store' } },
    )
}
