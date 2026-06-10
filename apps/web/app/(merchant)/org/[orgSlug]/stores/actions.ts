'use server'

import { getSession } from '@/lib/auth/server'
import { createClient } from '@mcloud/db/server'
import { revalidatePath } from 'next/cache'

export async function getOrgStores(orgSlug: string) {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated', stores: [], role: null }

    const supabase = await createClient()

    const { data: org } = await supabase
        .from('orgs')
        .select('id, name, slug')
        .eq('slug', orgSlug)
        .single()

    if (!org) return { error: 'Org not found', stores: [], role: null }

    const { data: membership } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', org.id)
        .eq('user_id', session.user.id)
        .maybeSingle()

    if (!membership) return { error: 'Not a member', stores: [], role: null }

    const { data: stores } = await supabase
        .from('stores')
        .select('id, name, slug, logo_url, is_pro, created_at')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })

    return { orgId: org.id, stores: stores ?? [], role: membership.role }
}

export async function createStore(formData: FormData) {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const orgId = formData.get('orgId') as string
    const orgSlug = formData.get('orgSlug') as string
    const name = (formData.get('name') as string)?.trim()
    const slug = (formData.get('slug') as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')

    if (!name || !slug) return { error: 'Name and slug are required' }
    if (!/^[a-z0-9][a-z0-9-]{1,}[a-z0-9]$/.test(slug)) return { error: 'Slug must be lowercase alphanumeric with hyphens' }

    const supabase = await createClient()

    const { data: membership } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', session.user.id)
        .maybeSingle()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return { error: 'Only owners and admins can create stores' }
    }

    const { data: existing } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

    if (existing) return { error: 'A store with this slug already exists' }

    const { data: store, error } = await supabase
        .from('stores')
        .insert({ name, slug, org_id: orgId, owner_id: session.user.id })
        .select('id, slug')
        .single()

    if (error) return { error: error.message }

    // Add creator as store owner
    await supabase.from('store_members').insert({
        store_id: store.id,
        user_id: session.user.id,
        role: 'owner',
    })

    revalidatePath(`/org/${orgSlug}/stores`)
    return { success: true, slug: store.slug }
}

export async function deleteStore(storeId: string, orgSlug: string) {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('owner_id, org_id, orgs(slug)')
        .eq('id', storeId)
        .single()

    if (!store) return { error: 'Store not found' }
    if (store.owner_id !== session.user.id) return { error: 'Only the store owner can delete it' }

    const { error } = await supabase.from('stores').delete().eq('id', storeId)
    if (error) return { error: error.message }

    revalidatePath(`/org/${orgSlug}/stores`)
    return { success: true }
}

export async function updateStore(storeId: string, orgSlug: string, fields: { name?: string; logo_url?: string | null }) {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const supabase = await createClient()

    const { data: member } = await supabase
        .from('store_members')
        .select('role')
        .eq('store_id', storeId)
        .eq('user_id', session.user.id)
        .maybeSingle()

    if (!member || !['owner', 'admin'].includes(member.role)) {
        return { error: 'Not authorized' }
    }

    const { error } = await supabase.from('stores').update(fields).eq('id', storeId)
    if (error) return { error: error.message }

    revalidatePath(`/org/${orgSlug}/stores`)
    return { success: true }
}
