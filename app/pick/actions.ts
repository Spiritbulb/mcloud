'use server'

import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'

export async function getPickerData() {
    const session = await auth0.getSession()
    if (!session?.user) return { stores: [], userName: null }

    const { sub: userId } = session.user
    const supabase = await createClient()

    const { data: user } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single()

    const { data: memberships } = await supabase
        .from('store_members')
        .select(`role, store:stores (id, name, slug, logo_url)`)
        .eq('user_id', userId)

    if (!memberships?.length) return { stores: [], userName: user?.name ?? null }

    const storeIds = memberships.map(m => (m.store as any).id)

    const { data: visits } = await supabase
        .from('store_visits')
        .select('store_id, visited_at')
        .eq('user_id', userId)
        .in('store_id', storeIds)

    const visitMap = Object.fromEntries(
        (visits ?? []).map(v => [v.store_id, v.visited_at])
    )

    const stores = memberships.map(m => {
        const s = m.store as any
        return {
            id: s.id as string,
            name: s.name as string,
            slug: s.slug as string,
            logo_url: s.logo_url ?? undefined,
            last_visited_at: visitMap[s.id] ?? undefined,
        }
    })

    return { stores, userName: user?.name ?? null }
}

export async function trackVisit(storeId: string) {
    const session = await auth0.getSession()
    if (!session?.user) return

    const { sub: userId } = session.user
    const supabase = await createClient()

    await supabase
        .from('store_visits')
        .upsert(
            { user_id: userId, store_id: storeId, visited_at: new Date().toISOString() },
            { onConflict: 'user_id,store_id' }
        )
}