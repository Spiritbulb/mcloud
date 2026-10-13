// Shared, framework-agnostic merchant store logic.
// Used by BOTH the Next server actions (org/[orgSlug]/stores/actions.ts) and the
// mobile API (app/api/mobile/*). Functions take an explicit `userId` and never
// touch Next-only APIs (no revalidatePath, no cookies) so they're reusable from
// route handlers. Callers that need cache revalidation do it themselves.

import { isPaidPlan } from './plans'
import { getStorePlan, getStorePlans } from './plans-server'
import { createClient } from '@mcloud/db/server'
import type { Json } from '@mcloud/db/types'
import { isVerticalId } from '@mcloud/verticals'
import { seedPageRows } from './seed-pages'
import { normalizeSlug, RESERVED_STORE_SLUGS, isValidSlug, slugFromName } from './slug'

export type Role = 'owner' | 'admin' | 'member' | string

const STORE_LIST_COLUMNS = 'id, name, slug, logo_url, is_pro, created_at'

/** A user's role in an org, or null if they aren't a member. */
export async function getOrgRole(orgId: string, userId: string): Promise<Role | null> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .maybeSingle()
    return data?.role ?? null
}

/** A user's role in a store, or null if they aren't a member. */
export async function getStoreRole(storeId: string, userId: string): Promise<Role | null> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('store_members')
        .select('role')
        .eq('store_id', storeId)
        .eq('user_id', userId)
        .maybeSingle()
    return data?.role ?? null
}

export function canManage(role: Role | null): boolean {
    return role === 'owner' || role === 'admin'
}

export type StoreAccess =
    | { error: 'not_found' | 'forbidden'; storeId: null; role: null }
    | { error: null; storeId: string; role: Role }

/**
 * Resolve a store by slug and confirm the user can access it (store member OR
 * member of the store's org). Returns the storeId + effective role. The single
 * gate every store-scoped mobile endpoint calls.
 */
export async function requireStoreAccess(slug: string, userId: string): Promise<StoreAccess> {
    return resolveStoreAccess('slug', slug, userId)
}

/** Same gate as {@link requireStoreAccess}, for callers that hold the store id (e.g. upload keys). */
export async function requireStoreAccessById(storeId: string, userId: string): Promise<StoreAccess> {
    return resolveStoreAccess('id', storeId, userId)
}

async function resolveStoreAccess(by: 'slug' | 'id', value: string, userId: string): Promise<StoreAccess> {
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('id, org_id')
        .eq(by, value)
        .single()
    if (!store) return { error: 'not_found', storeId: null, role: null }

    // Run both membership checks in parallel against the already-created client.
    const [storeMemberRow, orgMemberRow] = await Promise.all([
        supabase
            .from('store_members')
            .select('role')
            .eq('store_id', store.id)
            .eq('user_id', userId)
            .maybeSingle(),
        store.org_id
            ? supabase
                  .from('org_members')
                  .select('role')
                  .eq('org_id', store.org_id)
                  .eq('user_id', userId)
                  .maybeSingle()
            : Promise.resolve({ data: null }),
    ])

    const role = storeMemberRow.data?.role ?? orgMemberRow.data?.role ?? null
    if (!role) return { error: 'forbidden', storeId: null, role: null }

    return { error: null, storeId: store.id, role }
}

export interface StoreHub {
    id: string
    name: string
    slug: string
    logo_url: string | null
    is_pro: boolean
    custom_domain: string | null
    orgSlug: string | null
    role: Role
    canManage: boolean
}

export type StoreHubResult =
    | { error: 'not_found' | 'forbidden'; store: null }
    | { error: null; store: StoreHub }

/**
 * Resolve a single store for the hub screen, guarding access. A user may view a
 * store if they're a store member OR a member of the store's org (mirrors web).
 * Returns the store + the user's effective role.
 */
export async function getStoreHub(slug: string, userId: string): Promise<StoreHubResult> {
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('id, name, slug, logo_url, is_pro, custom_domain, org_id, org:orgs(slug)')
        .eq('slug', slug)
        .single()

    if (!store) return { error: 'not_found', store: null }

    // Effective role: prefer the store-member role; fall back to org role.
    let role = await getStoreRole(store.id, userId)
    if (!role && store.org_id) role = await getOrgRole(store.org_id, userId)
    if (!role) return { error: 'forbidden', store: null }

    const org = Array.isArray(store.org) ? store.org[0] : store.org

    return {
        error: null,
        store: {
            id: store.id,
            name: store.name,
            slug: store.slug,
            logo_url: store.logo_url ?? null,
            is_pro: isPaidPlan(await getStorePlan(store.id)),
            custom_domain: store.custom_domain ?? null,
            orgSlug: org?.slug ?? null,
            role,
            canManage: canManage(role),
        },
    }
}

export type OrgStoresResult =
    | { error: 'not_found' | 'not_member'; orgId: null; stores: []; role: null }
    | { error: null; orgId: string; stores: any[]; role: Role }

/** List the stores in an org for a member, with the member's org role. */
export async function listOrgStores(orgSlug: string, userId: string): Promise<OrgStoresResult> {
    const supabase = await createClient()

    const { data: org } = await supabase
        .from('orgs')
        .select('id, name, slug')
        .eq('slug', orgSlug)
        .single()
    if (!org) return { error: 'not_found', orgId: null, stores: [], role: null }

    const role = await getOrgRole(org.id, userId)
    if (!role) return { error: 'not_member', orgId: null, stores: [], role: null }

    const { data: stores } = await supabase
        .from('stores')
        .select(STORE_LIST_COLUMNS)
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })

    // is_pro is derived from subscription rows, not trusted from the stores column.
    const list = stores ?? []
    const plans = await getStorePlans(list.map((s) => s.id))
    return {
        error: null,
        orgId: org.id,
        stores: list.map((s) => ({ ...s, is_pro: isPaidPlan(plans.get(s.id) ?? 'free') })),
        role,
    }
}

export { normalizeSlug, RESERVED_STORE_SLUGS, isValidSlug } from './slug'

export type CreateStoreResult =
    | { error: string; slug: null }
    | { error: null; slug: string }

/**
 * Create a store in an org. Enforces the same rules as the web action:
 * owner/admin only, valid + unique slug. Adds the creator as store owner.
 */
export async function createStoreForUser(
    input: { orgId: string; name: string; slug: string; type?: string },
    userId: string,
): Promise<CreateStoreResult> {
    const name = input.name?.trim()
    const slug = normalizeSlug(input.slug ?? '')
    const type = input.type && isVerticalId(input.type) ? input.type : 'shop'

    if (!name || !slug) return { error: 'Name and slug are required', slug: null }
    if (!isValidSlug(slug)) return { error: 'Slug must be lowercase alphanumeric with hyphens', slug: null }
    if (RESERVED_STORE_SLUGS.has(slug)) return { error: 'That slug is reserved', slug: null }

    const supabase = await createClient()

    if (!canManage(await getOrgRole(input.orgId, userId))) {
        return { error: 'Only owners and admins can create stores', slug: null }
    }

    const { data: existing } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
    if (existing) return { error: 'A store with this slug already exists', slug: null }

    const { data: store, error } = await supabase
        .from('stores')
        .insert({ name, slug, org_id: input.orgId, owner_id: userId, type })
        .select('id, slug')
        .single()
    if (error || !store) return { error: error?.message ?? 'Failed to create store', slug: null }

    await supabase.from('store_members').insert({
        store_id: store.id,
        user_id: userId,
        role: 'owner',
    })

    // Best-effort: seed the vertical's default pages. A failure here must never
    // block store creation — the storefront's vertical-aware fallback renders
    // the correct default even with no page row.
    const seedRows = seedPageRows(store.id, type).map((r) => ({
        ...r,
        sections: r.sections as unknown as Json,
    }))
    const { error: seedError } = await supabase.from('pages').insert(seedRows)
    if (seedError) {
        console.error('[stores] default page seed failed (store still created):', seedError.message)
    }

    return { error: null, slug: store.slug }
}

/** First org (oldest membership) where the user is owner or admin, or null. */
export async function findManageableOrg(userId: string): Promise<{ id: string; slug: string } | null> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('org_members')
        .select('role, org:orgs(id, slug)')
        .eq('user_id', userId)
        .in('role', ['owner', 'admin'])
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
    const org = Array.isArray(data?.org) ? data?.org[0] : data?.org
    return org ? { id: org.id, slug: org.slug } : null
}

/** Create an org owned by `userId`, with a unique slug derived from `name`. */
export async function createOrgForUser(
    name: string,
    userId: string,
): Promise<{ error: string; org: null } | { error: null; org: { id: string; slug: string } }> {
    const trimmed = name.trim()
    if (trimmed.length < 2) return { error: 'Name must be at least 2 characters', org: null }

    const supabase = await createClient()
    const base = slugFromName(trimmed) || 'org'
    const { data: taken } = await supabase.from('orgs').select('slug').eq('slug', base).maybeSingle()
    const slug = taken ? `${base}-${Math.floor(Math.random() * 10000)}` : base
    const publicId = `org_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`

    const { data: org, error } = await supabase
        .from('orgs')
        .insert({ name: trimmed, slug, owner_id: userId, public_id: publicId })
        .select('id, slug')
        .single()
    if (error || !org) return { error: error?.message ?? 'Could not create organisation', org: null }

    const { error: memberError } = await supabase
        .from('org_members')
        .insert({ org_id: org.id, user_id: userId, role: 'owner' })
    if (memberError) return { error: memberError.message, org: null }

    return { error: null, org }
}
