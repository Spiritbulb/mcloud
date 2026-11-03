'use server'
// Reach marketplace controls for the store dashboard. The logic lives in
// @mcloud/merchant/reach-listing (shared with the Reach app's API); these actions authorize the
// caller against the store (see ./access) and hand it the authorized store id.
import { createClient } from '@mcloud/db/server'
import * as listing from '@mcloud/merchant/reach-listing'
import { sendPushToUsers } from '@/lib/merchant/send-push'
import { requireManagedStore, type ActionResult } from './access'

export type { ReachKey, ReachStatus } from '@mcloud/merchant/reach-listing'

export async function getReachStatus(storeId: string): Promise<({ ok: true } & listing.ReachStatus) | { ok: false; error: string }> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    return listing.getReachStatus(await createClient(), gate.storeId)
}

/**
 * Where the store delivers from and to, and where Reach sends its money. Changing the home area of a
 * store that is already approved sends it back for review: approval was for that place.
 */
export async function saveReachLocation(
    storeId: string,
    input: { areaId: unknown; extraAreaIds: unknown; payoutPhone: unknown },
): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    return listing.saveReachLocation(await createClient(), gate.storeId, input)
}

/** "List my store" is a request. Reach approves it before shoppers see anything. */
export async function setReachListed(storeId: string, listed: boolean): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    if (typeof listed !== 'boolean') return { ok: false, error: 'Invalid request' }
    const db = await createClient()
    const result = await listing.setReachListed(db, gate.storeId, listed)
    if (!result.ok) return result
    if (result.asked) await notifyReachAdmins(db, result.storeName ?? 'A store')
    return { ok: true }
}

export async function createStoreKey(storeId: string, label: unknown): Promise<ActionResult<{ key: string }>> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    return listing.createStoreKey(await createClient(), gate.storeId, label, gate.userId)
}

export async function revokeStoreKey(storeId: string, keyId: unknown): Promise<ActionResult> {
    const gate = await requireManagedStore(storeId)
    if (!gate.ok) return gate
    return listing.revokeStoreKey(await createClient(), gate.storeId, keyId)
}

/** Tell the Reach admins there is something to review. Best effort. */
async function notifyReachAdmins(db: Awaited<ReturnType<typeof createClient>>, storeName: string) {
    try {
        const { data: admins } = await db.from('users').select('id').eq('role', 'admin')
        await sendPushToUsers((admins ?? []).map((u: { id: string }) => u.id), {
            title: 'New store to review',
            body: `${storeName} asked to be listed on Reach.`,
            data: { type: 'review' },
        })
    } catch {
        // never fail the owner's request over a notification
    }
}
