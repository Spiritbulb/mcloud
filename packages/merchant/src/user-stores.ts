// "What can this user reach?" keyed on a userId, for callers with no cookie session (the WhatsApp
// webhook). Mirrors the access rule in requireStoreAccess: a store is reachable through store
// membership OR membership of the store's org. The cookie-based getPickerData() cannot be used here.
import { createClient } from '@mcloud/db/server'

export interface AccessibleStore {
    id: string
    slug: string
    name: string
    orgId: string | null
    orgName: string | null
    lastVisitedAt: string | null
}

/** Dedupe by id, optionally filter by a name search, and order recently visited first, then by name. */
export function arrangeStores(stores: AccessibleStore[], query?: string): AccessibleStore[] {
    const byId = new Map<string, AccessibleStore>()
    for (const s of stores) if (!byId.has(s.id)) byId.set(s.id, s)
    const q = query?.trim().toLowerCase()
    return [...byId.values()]
        .filter((s) => !q || s.name.toLowerCase().includes(q) || s.slug.includes(q))
        .sort((a, b) => {
            if (a.lastVisitedAt !== b.lastVisitedAt) {
                if (!a.lastVisitedAt) return 1
                if (!b.lastVisitedAt) return -1
                return a.lastVisitedAt < b.lastVisitedAt ? 1 : -1
            }
            return a.name.localeCompare(b.name)
        })
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))

/** Every store the user can open: stores they are a member of plus all stores of orgs they belong to. */
export async function listAccessibleStores(userId: string, query?: string): Promise<AccessibleStore[]> {
    const supabase = await createClient()

    const [direct, orgMemberships] = await Promise.all([
        supabase
            .from('store_members')
            .select('store:stores(id, name, slug, org_id, org:orgs(name))')
            .eq('user_id', userId),
        supabase.from('org_members').select('org_id').eq('user_id', userId),
    ])

    const orgIds = (orgMemberships.data ?? []).map((m) => m.org_id)
    const viaOrg = orgIds.length
        ? await supabase.from('stores').select('id, name, slug, org_id, org:orgs(name)').in('org_id', orgIds)
        : { data: [] as Record<string, unknown>[] }

    type Row = { id: string; name: string; slug: string; org_id: string | null; org: { name: string } | { name: string }[] | null }
    const rows: Row[] = [
        ...(direct.data ?? []).map((m) => one((m as { store: Row | Row[] | null }).store)).filter((r): r is Row => !!r),
        ...((viaOrg.data ?? []) as unknown as Row[]),
    ]
    if (rows.length === 0) return []

    const ids = [...new Set(rows.map((r) => r.id))]
    const { data: visits } = await supabase
        .from('store_visits')
        .select('store_id, visited_at')
        .eq('user_id', userId)
        .in('store_id', ids)
    const visited = new Map((visits ?? []).map((v) => [v.store_id, v.visited_at as string]))

    return arrangeStores(
        rows.map((r) => ({
            id: r.id,
            slug: r.slug,
            name: r.name,
            orgId: r.org_id ?? null,
            orgName: one(r.org)?.name ?? null,
            lastVisitedAt: visited.get(r.id) ?? null,
        })),
        query,
    )
}

export interface CreatableOrg { id: string; name: string }

/** Orgs where the user is owner or admin: the only ones they may create a store in. */
export async function listCreatableOrgs(userId: string): Promise<CreatableOrg[]> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('org_members')
        .select('role, org:orgs(id, name)')
        .eq('user_id', userId)
        .in('role', ['owner', 'admin'])
        .order('created_at', { ascending: true })
    const seen = new Set<string>()
    const out: CreatableOrg[] = []
    for (const m of data ?? []) {
        const org = one(m.org as { id: string; name: string } | { id: string; name: string }[] | null)
        if (org && !seen.has(org.id)) { seen.add(org.id); out.push({ id: org.id, name: org.name }) }
    }
    return out
}
