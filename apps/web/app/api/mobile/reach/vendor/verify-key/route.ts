// POST /api/mobile/reach/vendor/verify-key — check a store key and link this user to that vendor.
// Returns 200 { session: null } for a wrong key so the app can show a normal "invalid key" message.
import { NextResponse, type NextRequest } from 'next/server'
import { reachDb } from '@/lib/reach/db'
import { fail, requireMobileUser } from '../../../_lib'

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const body = (await req.json().catch(() => null)) as { key?: string } | null
    const key = typeof body?.key === 'string' ? body.key.trim() : ''
    if (!key) return fail(400, 'key is required')

    const db = await reachDb()
    const { data, error } = await db.rpc('reach_verify_courier_key', { p_key: key })
    if (error) return fail(500, error.message)

    const row = data?.[0]
    if (!row) return NextResponse.json({ session: null })

    const { error: linkErr } = await db
        .from('reach_vendor_users')
        .upsert({ user_id: auth.user.id, vendor_id: row.vendor_id }, { onConflict: 'user_id,vendor_id' })
    if (linkErr) return fail(500, linkErr.message)

    return NextResponse.json({
        session: { vendorId: row.vendor_id, vendorName: row.vendor_name, label: row.label },
    })
}