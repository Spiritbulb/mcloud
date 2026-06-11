// Shared, framework-agnostic merchant org logic.
// Reusable from server actions and the mobile API (no Next-only calls).

import { createClient } from '@mcloud/db/server'
import { canManage, type Role } from './stores'

export interface UserOrg {
    id: string
    name: string
    slug: string
    logo_url: string | null
    role: Role
    canManage: boolean
}

/** Orgs the user is a member of, with their role. Mirrors the web org picker. */
export async function listUserOrgs(userId: string): Promise<UserOrg[]> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('org_members')
        .select('role, org:orgs (id, name, slug, logo_url)')
        .eq('user_id', userId)

    return (data ?? [])
        .map((m) => {
            const o = m.org as unknown as { id: string; name: string; slug: string; logo_url: string | null }
            if (!o) return null
            return {
                id: o.id,
                name: o.name,
                slug: o.slug,
                logo_url: o.logo_url ?? null,
                role: m.role,
                canManage: canManage(m.role),
            }
        })
        .filter((o): o is UserOrg => o !== null)
}

export interface PickerStore {
    id: string
    name: string
    slug: string
    logo_url: string | null
    is_pro: boolean
}

export interface PickerOrgGroup extends UserOrg {
    stores: PickerStore[]
}

export interface PickerOtherStore extends PickerStore {
    orgSlug: string | null
    orgName: string | null
}

export interface PickerData {
    orgs: PickerOrgGroup[]
    otherStores: PickerOtherStore[]
}

const STORE_COLS = 'id, name, slug, logo_url, is_pro'

/**
 * Full picker payload for the mobile home screen — mirrors the web org page model
 * (apps/web/.../org/[orgSlug]/page.tsx):
 *   • orgs the user belongs to, each with its stores
 *   • "other workspace" stores: ones the user owns/admins that live in orgs the
 *     user is NOT a member of (from store_members), so they aren't lost.
 */
export async function getPickerData(userId: string): Promise<PickerData> {
    const supabase = await createClient()

    const orgs = await listUserOrgs(userId)
    const orgIds = orgs.map((o) => o.id)

    // Stores in the user's orgs, grouped per org.
    const { data: orgStores } = orgIds.length
        ? await supabase
              .from('stores')
              .select(`${STORE_COLS}, org_id`)
              .in('org_id', orgIds)
              .order('created_at', { ascending: false })
        : { data: [] as any[] }

    const byOrg = new Map<string, PickerStore[]>()
    for (const s of orgStores ?? []) {
        const list = byOrg.get(s.org_id) ?? []
        list.push({ id: s.id, name: s.name, slug: s.slug, logo_url: s.logo_url ?? null, is_pro: !!s.is_pro })
        byOrg.set(s.org_id, list)
    }

    const orgGroups: PickerOrgGroup[] = orgs.map((o) => ({ ...o, stores: byOrg.get(o.id) ?? [] }))

    // Stores the user manages (owner/admin) that are NOT in one of their orgs.
    const { data: managed } = await supabase
        .from('store_members')
        .select('role, store:stores (id, name, slug, logo_url, is_pro, org_id, org:orgs(slug, name))')
        .eq('user_id', userId)
        .in('role', ['owner', 'admin'])

    const orgIdSet = new Set(orgIds)
    const otherStores: PickerOtherStore[] = (managed ?? [])
        .map((m) => m.store as any)
        .filter((s) => s && !orgIdSet.has(s.org_id))
        .map((s) => {
            const org = Array.isArray(s.org) ? s.org[0] : s.org
            return {
                id: s.id,
                name: s.name,
                slug: s.slug,
                logo_url: s.logo_url ?? null,
                is_pro: !!s.is_pro,
                orgSlug: org?.slug ?? null,
                orgName: org?.name ?? null,
            }
        })

    return { orgs: orgGroups, otherStores }
}
