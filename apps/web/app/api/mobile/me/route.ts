// GET /api/mobile/me — the authenticated mobile user (bearer token → AuthUser).
// Used by the app to hydrate the session on boot and confirm a token is valid.
import { NextResponse, type NextRequest } from 'next/server'
import { requireMobileUser } from '../_lib'
import { createClient } from '@mcloud/db/server'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const supabase = await createClient()
    const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', auth.user.id)
    .single()

if (error) {
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
}

const role = data?.role ?? 'user'
    return NextResponse.json(
        { user: { ...auth.user, role } },
        { headers: { 'Cache-Control': 'no-store' } },
    )
}
