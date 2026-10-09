// app/settings/route.ts
// /settings — resolve the user's store and redirect into its settings. Route
// Handler (not a page) so the redirect is a clean HTTP redirect.
import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { LOGIN_URL, SIGNUP_URL } from '@mcloud/auth/routes'
import { storeSettingsUrl } from '@mcloud/merchant/storefront-url'

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
    return NextResponse.redirect(
        orgSlug
            ? storeSettingsUrl(orgSlug, store.slug)
            : new URL(`/store/${store.slug}/settings`, process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN ?? request.url),
    )
}
