'use server'

import { createClient } from '@/lib/server'

export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const redirectParams = formData.get('redirect') as string | null

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    const supabase = await createClient()

    // This runs on the server, bypassing any browser CORS limitations
    // and writes the auth cookies for the domain the request came from.
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    // Get user's store via store_members
    const { data: membership } = await supabase
        .from('store_members')
        .select('store_id, stores(slug)')
        .eq('user_id', data.user.id)
        .eq('role', 'owner')
        .single()

    const storesData = Array.isArray(membership?.stores)
        ? membership.stores[0]
        : membership?.stores

    if (!storesData?.slug) {
        return { error: 'No store found. Please contact support.' }
    }

    const slug = storesData.slug as string
    const redirect = redirectParams

    // redirect is a full encoded URL from middleware
    const destination = (() => {
        if (!redirect) return `https://${slug}.menengai.cloud/settings`
        try {
            const decoded = decodeURIComponent(redirect)
            const url = new URL(decoded)
            // Safety check: only allow redirects to *.menengai.cloud OR path starting with /
            if (
                url.hostname.endsWith('.menengai.cloud') ||
                url.hostname === 'menengai.cloud' ||
                decoded.startsWith('/')
            ) {
                return decoded
            }
        } catch {
            // invalid URL, fall through to default
        }
        return `https://${slug}.menengai.cloud/settings`
    })()

    return { success: true, destination }
}
