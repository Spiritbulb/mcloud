// Resolves every user who should receive store-level notifications: the store
// owner, any org_members with a manage-capable role on the store's org (if it
// belongs to one), and any store_members granted direct access. Dedupes by
// user_id since a user could show up via more than one path (e.g. org admin
// who is also the listed owner).
//
// Reuses canManage() from stores.ts so "who counts as a manager" has exactly
// one definition in the codebase — this file doesn't redecide that.
import { createClient } from '@mcloud/db/server'
import { canManage } from './stores'

export async function getStoreManagerUserIds(storeId: string): Promise<string[]> {
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('owner_id, org_id')
        .eq('id', storeId)
        .single()

    if (!store) return []

    const userIds = new Set<string>()
    if (store.owner_id) userIds.add(store.owner_id)

    if (store.org_id) {
        const { data: orgMembers } = await supabase
            .from('org_members')
            .select('user_id, role')
            .eq('org_id', store.org_id)

        for (const m of orgMembers ?? []) {
            if (canManage(m.role)) userIds.add(m.user_id)
        }
    }

    const { data: storeMembers } = await supabase
        .from('store_members')
        .select('user_id, role')
        .eq('store_id', storeId)

    for (const m of storeMembers ?? []) {
        if (canManage(m.role)) userIds.add(m.user_id)
    }

    return [...userIds]
}