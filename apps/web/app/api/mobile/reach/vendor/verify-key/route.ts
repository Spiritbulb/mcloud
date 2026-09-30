// POST /api/mobile/reach/vendor/verify-key — check a store key (read-only).
// Linking a user to a vendor happens in reach_confirm_vendor (your confirm-vendor endpoint),
// not here. Returns 200 { session: null } for a wrong key.
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

    return NextResponse.json({
        session: { vendorId: row.vendor_id, vendorName: row.vendor_name, label: row.label },
    })
}