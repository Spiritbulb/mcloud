// Shared, framework-agnostic merchant store logic.
// Used by BOTH the Next server actions (org/[orgSlug]/stores/actions.ts) and the
// mobile API (app/api/mobile/*). Functions take an explicit `userId` and never
// touch Next-only APIs (no revalidatePath, no cookies) so they're reusable from
// route handlers. Callers that need cache revalidation do it themselves.

import { createClient } from '@mcloud/db/server'

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

    return { error: null, orgId: org.id, stores: stores ?? [], role }
}

/** Normalize a raw slug to the canonical lowercase-hyphen form. */
export function normalizeSlug(raw: string): string {
    return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
}

export function isValidSlug(slug: string): boolean {
    return /^[a-z0-9][a-z0-9-]{1,}[a-z0-9]$/.test(slug)
}

export type CreateStoreResult =
    | { error: string; slug: null }
    | { error: null; slug: string }

/**
 * Create a store in an org. Enforces the same rules as the web action:
 * owner/admin only, valid + unique slug. Adds the creator as store owner.
 */
export async function createStoreForUser(
    input: { orgId: string; name: string; slug: string },
    userId: string,
): Promise<CreateStoreResult> {
    const name = input.name?.trim()
    const slug = normalizeSlug(input.slug ?? '')

    if (!name || !slug) return { error: 'Name and slug are required', slug: null }
    if (!isValidSlug(slug)) return { error: 'Slug must be lowercase alphanumeric with hyphens', slug: null }

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
        .insert({ name, slug, org_id: input.orgId, owner_id: userId })
        .select('id, slug')
        .single()
    if (error || !store) return { error: error?.message ?? 'Failed to create store', slug: null }

    await supabase.from('store_members').insert({
        store_id: store.id,
        user_id: userId,
        role: 'owner',
    })

    return { error: null, slug: store.slug }
}
