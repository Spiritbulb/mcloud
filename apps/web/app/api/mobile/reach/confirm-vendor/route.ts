// POST /api/mobile/reach/confirm-vendor
import { NextResponse, type NextRequest } from 'next/server'
import { requireMobileUser, fail } from '../../_lib'
import { createClient } from '@mcloud/db/server'

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const body = await req.json().catch(() => null)
    const storeKey = typeof body?.storeKey === 'string' ? body.storeKey.trim() : ''
    if (!storeKey) return fail(400, 'Enter your store key')

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('reach_confirm_vendor', {
        p_user_id: auth.user.id,
        p_key: storeKey,
    })

    if (error) {
        const msg = error.message ?? ''
        if (msg.includes('bad_key')) return fail(404, "That key isn't recognised, or has been revoked.")
        if (msg.includes('role_conflict')) return fail(409, 'This account is already registered with another role. Contact support to update this information.')
        return fail(500, 'Could not confirm your account')
    }

    return NextResponse.json({ role: data }, { headers: { 'Cache-Control': 'no-store' } })
}