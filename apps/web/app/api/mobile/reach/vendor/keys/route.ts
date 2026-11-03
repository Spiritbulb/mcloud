// @route-kind: mobile
// GET  /api/mobile/reach/vendor/keys — my store's staff keys (masked) and who joined with each
// POST /api/mobile/reach/vendor/keys — { label } → a new key, shown in full this once
// Owners/admins only (myManagedStore); scoped to the store this user is the vendor of.
import { NextResponse, type NextRequest } from 'next/server'
import { maskStoreKey } from '@mcloud/merchant/reach'
import { createStoreKey, getReachStatus } from '@mcloud/merchant/reach-listing'
import { reachDb } from '@/lib/reach/db'
import { myManagedStore } from '@/lib/reach/vendor-stores'
import { fail, requireMobileUser } from '../../../_lib'

export async function GET(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const mine = await myManagedStore(auth.user.id)
    if (!mine.ok) return fail(mine.status, mine.error)

    const status = await getReachStatus(await reachDb(), mine.storeId)
    if (!status.ok) return fail(500, status.error)
    const keys = status.keys.map((k) => ({ ...k, key: maskStoreKey(k.key) }))
    return NextResponse.json(
        { keys, activeKeyCount: status.activeKeyCount, maxKeys: status.maxKeys },
        { headers: { 'Cache-Control': 'no-store' } },
    )
}

export async function POST(req: NextRequest) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const mine = await myManagedStore(auth.user.id)
    if (!mine.ok) return fail(mine.status, mine.error)

    const body = (await req.json().catch(() => null)) as { label?: unknown } | null
    const result = await createStoreKey(await reachDb(), mine.storeId, body?.label, auth.user.id)
    if (!result.ok) return fail(400, result.error)
    return NextResponse.json({ key: result.key }, { status: 201 })
}
