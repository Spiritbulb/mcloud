// app/settings/route.ts
// /settings — resolve the user's store and redirect into its settings. Route
// Handler (not a page) so the redirect is a clean HTTP redirect.
import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { createClient } from '@/lib/server'
import { LOGIN_URL, SIGNUP_URL } from '@/lib/auth/routes'

export async function GET(request: NextRequest) {
    const user = await getCurrentUser()
    if (!user) return NextResponse.redirect(new URL(LOGIN_URL, request.url))

    const supabase = await createClient()
    const { data: memberStore } = await supabase
        .from('store_members')
        .select('store_id, role')
        .eq('user_id', user.id)
        .single()

    if (!memberStore) return NextResponse.redirect(new URL(SIGNUP_URL, request.url))

    const { data: store, error } = await supabase
        .from('stores')
        .select('slug, org:orgs(slug)')
        .eq('id', memberStore.store_id)
        .single()

    if (error) console.error('[store fetch]', error.code, error.message)
    if (!store) return new NextResponse('Not found', { status: 404 })

    const orgSlug = (store.org as { slug?: string } | null)?.slug
    const dest = orgSlug
        ? `/org/${orgSlug}/${store.slug}/settings`
        : `/store/${store.slug}/settings`
    return NextResponse.redirect(new URL(dest, request.url))
}
