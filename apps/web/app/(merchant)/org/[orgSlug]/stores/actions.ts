'use server'

import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { revalidatePath } from 'next/cache'
import { createStoreForUser, listOrgStores } from '@/lib/merchant/stores'

export async function getOrgStores(orgSlug: string) {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated', stores: [], role: null }

    const result = await listOrgStores(orgSlug, session.user.id)
    if (result.error === 'not_found') return { error: 'Org not found', stores: [], role: null }
    if (result.error === 'not_member') return { error: 'Not a member', stores: [], role: null }

    return { orgId: result.orgId, stores: result.stores, role: result.role }
}

export async function createStore(formData: FormData) {
    const session = await getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const orgId = formData.get('orgId') as string
    const orgSlug = formData.get('orgSlug') as string
    const name = formData.get('name') as string
    const slug = formData.get('slug') as string

    const result = await createStoreForUser({ orgId, name, slug }, session.user.id)
    if (result.error) return { error: result.error }

    revalidatePath(`/org/${orgSlug}/stores`)
    return { success: true, slug: result.slug }
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
