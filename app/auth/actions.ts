'use server'

import { createClient } from '@/lib/server'
import { auth0 } from '@/lib/auth0'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function signUpAction(formData: FormData) {
    const storeName = formData.get('storeName') as string
    const slug = formData.get('slug') as string

    const cookieStore = await cookies()
    cookieStore.set('pending_store', JSON.stringify({ storeName, slug }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 10,
        path: '/',
    })

    redirect('/auth/login?screen_hint=signup')
}

export async function handleCallback(searchParams: URLSearchParams) {
    const supabase = await createClient()
    const session = await auth0.getSession()
    if (!session?.user) return redirect('/auth/login')

    const { sub: userId, email, name, picture } = session.user

    await supabase.from('users').upsert({
        id: userId,
        email,
        name,
        avatar_url: picture,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    // Read from cookie — set by login-handoff on www
    const cookieStore = await cookies()
    const returnTo = cookieStore.get('auth_return_to')?.value
    console.log('[callback] auth_return_to:', returnTo) // keep until confirmed working

    if (returnTo) {
        cookieStore.delete('auth_return_to')
        try {
            const url = new URL(returnTo)
            if (url.hostname === 'menengai.cloud' || url.hostname.endsWith('.menengai.cloud')) {
                return redirect(returnTo)
            }
        } catch { }
    }

    // Check existing store membership
    const { data: membership } = await supabase
        .from('store_members')
        .select('store_id, role')
        .eq('user_id', userId)
        .eq('role', 'owner')
        .single()

    if (membership) {
        return redirect(`/settings`)
    }

    // New user — check for pending store cookie
    const pending = cookieStore.get('pending_store')?.value

    if (pending) {
        try {
            const { storeName, slug } = JSON.parse(pending)
            cookieStore.delete('pending_store')

            if (storeName && slug) {
                const { data: existingSlug } = await supabase
                    .from('stores')
                    .select('slug')
                    .eq('slug', slug)
                    .single()

                const finalSlug = existingSlug
                    ? `${slug}-${Math.floor(Math.random() * 10000)}`
                    : slug

                const { data: newStore, error: storeError } = await supabase
                    .from('stores')
                    .insert({
                        name: storeName,
                        slug: finalSlug,
                        owner_id: userId,
                        currency: 'KES',
                        timezone: 'Africa/Nairobi',
                        is_active: true,
                    })
                    .select('id')
                    .single()

                if (storeError) throw storeError

                await supabase.from('store_members').insert({
                    store_id: newStore.id,
                    user_id: userId,
                    role: 'owner',
                })

                return redirect(`/settings`)
            }
        } catch (e) {
            console.error('Failed to create store:', e)
        }
    }

    return redirect('/onboarding')
}
