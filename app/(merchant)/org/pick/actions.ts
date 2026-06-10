'use server'

import { getSession } from '@/lib/auth/server'
import { createClient } from '@/lib/server'
import { revalidatePath } from 'next/cache'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string) {
    return s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

async function uniqueOrgSlug(supabase: any, base: string) {
    const slug = slugify(base) || 'org'
    const { data } = await supabase.from('orgs').select('slug').eq('slug', slug).maybeSingle()
    return data ? `${slug}-${Math.floor(Math.random() * 10000)}` : slug
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

    // Orgs the user manages, plus any org referenced by their stores (for naming sections)
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

// ─── Track visit ──────────────────────────────────────────────────────────────

export async function trackVisit(storeId: string) {
    const session = await getSession()
    if (!session?.user) return

    const { id: userId } = session.user
    const supabase = await createClient()

    await supabase
        .from('store_visits')
        .upsert(
            { user_id: userId, store_id: storeId, visited_at: new Date().toISOString() },
            { onConflict: 'user_id,store_id' }
        )
}

// ─── Org CRUD ─────────────────────────────────────────────────────────────────

export async function createOrg(name: string): Promise<{ error?: string; org?: { id: string; slug: string } }> {
    const trimmed = name?.trim()
    if (!trimmed || trimmed.length < 2) return { error: 'Name must be at least 2 characters.' }

    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const { id: userId } = session.user
    const supabase = await createClient()

    const slug = await uniqueOrgSlug(supabase, trimmed)
    const publicId = `org_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`

    const { data: org, error } = await supabase
        .from('orgs')
        .insert({ name: trimmed, slug, owner_id: userId, public_id: publicId })
        .select('id, slug')
        .single()

    if (error || !org) return { error: error?.message ?? 'Could not create organization.' }

    const { error: memberError } = await supabase
        .from('org_members')
        .insert({ org_id: org.id, user_id: userId, role: 'owner' })

    if (memberError) return { error: memberError.message }

    revalidatePath('/org/pick')
    return { org }
}

export async function updateOrg(
    orgId: string,
    patch: { name?: string; slug?: string; logo_url?: string | null }
): Promise<{ error?: string; slug?: string }> {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const { id: userId } = session.user
    const supabase = await createClient()

    if (!(await canManageOrg(supabase, orgId, userId))) return { error: 'Forbidden' }

    const update: Record<string, any> = { updated_at: new Date().toISOString() }
    if (patch.name !== undefined) {
        const n = patch.name.trim()
        if (n.length < 2) return { error: 'Name must be at least 2 characters.' }
        update.name = n
    }
    if (patch.slug !== undefined) {
        const s = slugify(patch.slug)
        if (!s) return { error: 'Invalid slug.' }
        const { data: clash } = await supabase
            .from('orgs').select('id').eq('slug', s).neq('id', orgId).maybeSingle()
        if (clash) return { error: 'That slug is already taken.' }
        update.slug = s
    }
    if (patch.logo_url !== undefined) update.logo_url = patch.logo_url

    const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('orgs').update(update as any).eq('id', orgId).select('slug').single()

    if (error) return { error: error.message }

    revalidatePath('/org/pick')
    revalidatePath(`/org/${data.slug}/settings`)
    return { slug: data.slug }
}

export async function deleteOrg(orgId: string): Promise<{ error?: string }> {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const { id: userId } = session.user
    const supabase = await createClient()

    // Only the owner can delete an org
    const { data: org } = await supabase.from('orgs').select('owner_id').eq('id', orgId).single()
    if (!org) return { error: 'Organization not found.' }
    if (org.owner_id !== userId) return { error: 'Only the owner can delete this organization.' }

    // Detach stores to personal so we never orphan/lose store data
    await supabase.from('stores').update({ org_id: null }).eq('org_id', orgId)
    await supabase.from('org_members').delete().eq('org_id', orgId)

    const { error } = await supabase.from('orgs').delete().eq('id', orgId)
    if (error) return { error: error.message }

    revalidatePath('/org/pick')
    return {}
}

// ─── Store ↔ org CRUD ─────────────────────────────────────────────────────────

export async function moveStore(storeId: string, orgId: string | null): Promise<{ error?: string }> {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const { id: userId } = session.user
    const supabase = await createClient()

    const { data: store } = await supabase.from('stores').select('owner_id').eq('id', storeId).single()
    if (!store) return { error: 'Store not found.' }
    if (store.owner_id !== userId) return { error: 'Only the store owner can move it.' }

    if (orgId && !(await canManageOrg(supabase, orgId, userId))) return { error: 'You are not a member of that organization.' }

    const { error } = await supabase
        .from('stores')
        .update({ org_id: orgId, updated_at: new Date().toISOString() })
        .eq('id', storeId)

    if (error) return { error: error.message }

    revalidatePath('/org/pick')
    return {}
}

export async function deleteStore(storeId: string): Promise<{ error?: string }> {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const { id: userId } = session.user
    const supabase = await createClient()

    const { data: store } = await supabase.from('stores').select('owner_id').eq('id', storeId).single()
    if (!store) return { error: 'Store not found.' }
    if (store.owner_id !== userId) return { error: 'Only the store owner can delete it.' }

    await supabase.from('store_members').delete().eq('store_id', storeId)
    const { error } = await supabase.from('stores').delete().eq('id', storeId)
    if (error) return { error: 'Could not delete store. It may still have orders or products attached.' }

    revalidatePath('/org/pick')
    return {}
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function canManageOrg(supabase: any, orgId: string, userId: string) {
    const { data } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .maybeSingle()
    return data?.role === 'owner' || data?.role === 'admin'
}
