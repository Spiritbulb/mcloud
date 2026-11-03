// @route-kind: mobile
// DELETE /api/mobile/reach/vendor/keys/[keyId] — revoke one of my store's keys. Everyone who joined
// with it loses access at once. Owners/admins only; a key of another store matches nothing.
import { NextResponse, type NextRequest } from 'next/server'
import { revokeStoreKey } from '@mcloud/merchant/reach-listing'
import { reachDb } from '@/lib/reach/db'
import { myManagedStore } from '@/lib/reach/vendor-stores'
import { fail, requireMobileUser } from '../../../../_lib'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ keyId: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth
    const mine = await myManagedStore(auth.user.id)
    if (!mine.ok) return fail(mine.status, mine.error)

    const { keyId } = await params
    const result = await revokeStoreKey(await reachDb(), mine.storeId, keyId)
    if (!result.ok) return fail(404, result.error)
    return NextResponse.json({ ok: true })
}
