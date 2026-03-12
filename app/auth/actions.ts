'use server'

import { createClient } from '@/lib/server'
import { auth0 } from '@/lib/auth0'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function handleCallback() {
    const session = await auth0.getSession()
    if (!session?.user) return redirect('/auth/login')

    const { sub: userId, email, name, picture } = session.user
    const supabase = await createClient()

    await supabase.from('users').upsert({
        id: userId,
        email,
        name,
        avatar_url: picture,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    // Step 1: Check if user already has a store — returning user fast path
    const { data: membership } = await supabase
        .from('store_members')
        .select('store_id, role')
        .eq('user_id', userId)
        .eq('role', 'owner')
        .single()

    if (membership) {
        const { data: store } = await supabase
            .from('stores')
            .select('slug')
            .eq('id', membership.store_id)
            .single()

        if (store?.slug) {
            // Redirect straight to their subdomain — no homepage detour
            return redirect(`https://${store.slug}.menengai.cloud/settings`)
        }
    }


    return redirect('/onboarding')
}
