// @route-kind: mobile
// POST /api/mobile/reach/confirm-vendor — join a store as its vendor with a store key issued
// from the store's dashboard (settings/reach). Revoking the key later ends this access.
import { NextResponse, type NextRequest } from 'next/server'
import { requireMobileUser, fail } from '../../_lib'
import { createClient } from '@mcloud/db/server'
import { normalizeStoreKey } from '@mcloud/merchant/reach'
import { vendorFor } from '@/lib/reach/vendor'

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const body = await req.json().catch(() => null)
    const storeKey = normalizeStoreKey(body?.storeKey)
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

    // Return the store they just joined so the app can say "Welcome to <store>" without a second call.
    const vendor = await vendorFor(auth.user.id)
    return NextResponse.json({ role: data, vendor }, { headers: { 'Cache-Control': 'no-store' } })
}