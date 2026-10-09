// Picker data for the merchant org shell (org layout context + store switcher).
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PickerStore {
    id: string
    name: string
    slug: string
    logo_url?: string
    last_visited_at?: string
    org_id: string | null
    canManage: boolean
}

export interface PickerOrg {
    id: string
    name: string
    slug: string
    logo_url?: string
    canManage: boolean
}

// ─── Picker data ──────────────────────────────────────────────────────────────

export async function getPickerData(): Promise<{
    stores: PickerStore[]
    orgs: PickerOrg[]
    userName: string | null
}> {
    const session = await getSession()
    if (!session?.user) return { stores: [], orgs: [], userName: null }

    const { id: userId } = session.user
    const supabase = await createClient()

    const { data: user } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single()

    const { data: memberships } = await supabase
        .from('store_members')
        .select(`role, store:stores (id, name, slug, logo_url, org_id)`)
        .eq('user_id', userId)

    const { data: orgMemberships } = await supabase
        .from('org_members')
        .select(`role, org:orgs (id, name, slug, logo_url)`)
        .eq('user_id', userId)

    const stores: PickerStore[] = (memberships ?? []).map(m => {
        const s = m.store as any
        return {
            id: s.id,
            name: s.name,
            slug: s.slug,
            logo_url: s.logo_url ?? undefined,
            org_id: s.org_id ?? null,
            last_visited_at: undefined,
            canManage: m.role === 'owner',
        }
    })

    // Visit timestamps for sorting
    if (stores.length) {
        const { data: visits } = await supabase
            .from('store_visits')
            .select('store_id, visited_at')
            .eq('user_id', userId)
            .in('store_id', stores.map(s => s.id))

        const visitMap = Object.fromEntries((visits ?? []).map(v => [v.store_id, v.visited_at]))
        stores.forEach(s => { s.last_visited_at = visitMap[s.id] ?? undefined })
    }

    const managedOrgIds = new Set((orgMemberships ?? []).map(m => (m.org as any).id))
    const orgMap = new Map<string, PickerOrg>()

    for (const m of orgMemberships ?? []) {
        const o = m.org as any
        orgMap.set(o.id, {
            id: o.id,
            name: o.name,
            slug: o.slug,
            logo_url: o.logo_url ?? undefined,
            canManage: m.role === 'owner' || m.role === 'admin',
        })
    }

    const referencedOrgIds = stores
        .map(s => s.org_id)
        .filter((id): id is string => !!id && !orgMap.has(id))

    if (referencedOrgIds.length) {
        const { data: extraOrgs } = await supabase
            .from('orgs')
            .select('id, name, slug, logo_url')
            .in('id', referencedOrgIds)

        for (const o of extraOrgs ?? []) {
            orgMap.set(o.id, {
                id: o.id,
                name: o.name,
                slug: o.slug,
                logo_url: o.logo_url ?? undefined,
                canManage: managedOrgIds.has(o.id),
            })
        }
    }

    return { stores, orgs: [...orgMap.values()], userName: user?.name ?? null }
}
