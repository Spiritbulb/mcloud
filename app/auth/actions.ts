// app/auth/actions.ts
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
        maxAge: 60 * 10, // 10 minutes
        path: '/',
    })

    redirect('/auth/login?screen_hint=signup')
}

export async function handleCallback(searchParams: URLSearchParams) {
    const supabase = await createClient()
    const session = await auth0.getSession()
    const cookieStore = await cookies()
    const returnTo = cookieStore.get('auth_return_to')?.value

    if (returnTo) {
        cookieStore.delete('auth_return_to')
        try {
            const url = new URL(returnTo)
            if (url.hostname === 'menengai.cloud' || url.hostname.endsWith('.menengai.cloud')) {
                return redirect(returnTo)
            }
        } catch { }
    }

    if (!session?.user) return redirect('/auth/login')

    const { sub: userId, email, name, picture } = session.user

    await supabase.from('users').upsert({
        id: userId,
        email,
        name,
        avatar_url: picture,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    const { data: existingStore } = await supabase
        .from('stores')
        .select('slug')
        .eq('owner_id', userId)
        .single()

    if (existingStore) {
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

                const { error: storeError } = await supabase.from('stores').insert({
                    name: storeName,
                    slug: finalSlug,
                    owner_id: userId,
                    currency: 'KES',
                    timezone: 'Africa/Nairobi',
                    is_active: true,
                })
                if (storeError) throw storeError

                const { data: store } = await supabase
                    .from('stores')
                    .select('id')
                    .eq('slug', finalSlug)
                    .single()

                await supabase.from('store_members').insert({
                    store_id: store!.id,
                    user_id: userId,
                    role: 'owner',
                })

                return redirect(`/settings`)
            }
        } catch (e) {
            console.error('Failed to parse pending store:', e)
        }
    }

    return redirect('/onboarding')
}