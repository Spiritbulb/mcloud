import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'

export default async function SettingsRedirect({
    params,
}: {
    params: Promise<{ slug: string; path?: string[] }>
}) {
    const { slug, path } = await params
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores')
        .select('slug, org:orgs(slug)')
        .eq('slug', slug)
        .single()

    const orgSlug = store ? (store.org as any)?.slug : null
    const rest = path?.length ? `/${path.join('/')}` : ''

    if (orgSlug) {
        redirect(`/org/${orgSlug}/${slug}/settings${rest}`)
    }
    // Store has no org yet — redirect to org hub
    redirect('/org')
}
