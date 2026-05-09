'use server'

import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'


export async function completeOnboarding(formData: FormData) {
    const fullName = formData.get('fullName') as string
    const storeName = formData.get('storeName') as string
    const slug = formData.get('slug') as string
    const currency = formData.get('currency') as string
    const timezone = formData.get('timezone') as string

    const session = await auth0.getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const { sub: userId, email, picture } = session.user
    const supabase = await createClient()

    await supabase.from('users').upsert({
        id: userId, email, name: fullName, avatar_url: picture,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    const { data: existingSlug } = await supabase
        .from('stores').select('slug').eq('slug', slug).single()

    const finalSlug = existingSlug
        ? `${slug}-${Math.floor(Math.random() * 10000)}`
        : slug

    const { error: storeError } = await supabase.from('stores').insert({
        name: storeName, slug: finalSlug, owner_id: userId,
        currency, timezone, is_active: true,
    })
    if (storeError) return { error: storeError.message }

    const { data: store } = await supabase
        .from('stores').select('id').eq('slug', finalSlug).single()

    const { error: memberError } = await supabase.from('store_members').insert({
        store_id: store!.id, user_id: userId, role: 'owner',
    })
    if (memberError) return { error: memberError.message }

    redirect(`/store/${finalSlug}/settings`)
}


// ─── Onboarding page data ─────────────────────────────────────────────────────

export async function getOnboardingData() {
    const session = await auth0.getSession()
    if (!session?.user) return { stores: [], userName: null }

    const { sub: userId } = session.user
    const supabase = await createClient()

    // User name
    const { data: user } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single()

    // All stores this user is a member of
    const { data: memberships } = await supabase
        .from('store_members')
        .select(`
    role,
    store:stores (
      id,
      name,
      slug,
      logo_url
    )
  `)
        .eq('user_id', userId)

    if (!memberships?.length) return { stores: [], userName: user?.name ?? null }

    const storeIds = memberships.map(m => (m.store as any).id)

    // This user's personal visit timestamps
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


// ─── Track visit (called server-side to avoid RLS issues with Auth0) ──────────

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