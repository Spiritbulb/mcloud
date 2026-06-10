'use server'

import { createClient } from '@mcloud/db/server'
import { getSession } from '@/lib/auth/server'
import { LOGIN_URL } from '@/lib/auth/routes'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function handleCallback() {
    const session = await getSession()
    if (!session?.user) return redirect(LOGIN_URL)

    const { id: userId, email, name, avatarUrl } = session.user
    const supabase = await createClient()

    await supabase.from('users').upsert({
        id: userId,
        email,
        name,
        avatar_url: avatarUrl,
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
            return redirect(`/admin/settings`)
        }
    }


    return redirect('/onboarding')
}
