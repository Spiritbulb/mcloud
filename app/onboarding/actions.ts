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

    // 1. Upsert user with updated name
    await supabase.from('users').upsert({
        id: userId,
        email,
        name: fullName,
        avatar_url: picture,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    // 2. Check slug availability
    const { data: existingSlug } = await supabase
        .from('stores')
        .select('slug')
        .eq('slug', slug)
        .single()

    const finalSlug = existingSlug
        ? `${slug}-${Math.floor(Math.random() * 10000)}`
        : slug

    // 3. Create store
    const { error: storeError } = await supabase.from('stores').insert({
        name: storeName,
        slug: finalSlug,
        owner_id: userId,
        currency,
        timezone,
        is_active: true,
    })
    if (storeError) return { error: storeError.message }

    // 4. Add owner to store_members
    const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', finalSlug)
        .single()

    const { error: memberError } = await supabase.from('store_members').insert({
        store_id: store!.id,
        user_id: userId,
        role: 'owner',
    })
    if (memberError) return { error: memberError.message }

    redirect(`/store/${finalSlug}/settings/general`)
}