import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { loginHref } from '@/lib/auth-urls'
import StartClient from './start-client'

export const metadata: Metadata = {
    title: 'Create your site',
    robots: { index: false, follow: false },
}

/** Settings URL of the user's most recently joined site, or null if they have none. */
async function firstSiteHref(userId: string): Promise<string | null> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('store_members')
        .select('store:stores(slug, org:orgs(slug))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    const store = Array.isArray(data?.store) ? data?.store[0] : data?.store
    const org = Array.isArray(store?.org) ? store?.org[0] : store?.org
    return store && org ? `/org/${org.slug}/${store.slug}/settings` : null
}

export default async function StartPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
    const { new: wantsNew } = await searchParams

    // proxy.ts gates /start; this covers direct renders.
    const session = await getSession()
    if (!session?.user) redirect(loginHref('/start'))

    // Signing in lands here for everyone. Returning merchants go straight to their site;
    // `?new=1` is how someone with a site starts another.
    if (!wantsNew) {
        const href = await firstSiteHref(session.user.id)
        if (href) redirect(href)
    }

    return <StartClient firstName={session.user.name?.split(' ')[0] ?? null} />
}
