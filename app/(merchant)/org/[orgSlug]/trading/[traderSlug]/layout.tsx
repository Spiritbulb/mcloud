import { redirect, notFound } from 'next/navigation'
import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import TraderShell from './trader-shell'

export default async function TraderLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ orgSlug: string; traderSlug: string }>
}) {
    const { orgSlug, traderSlug } = await params
    const session = await auth0.getSession()
    if (!session?.user) redirect('/auth/login')

    const supabase = await createClient()

    const { data: org } = await supabase
        .from('orgs')
        .select('id')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    const { data: member } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', org.id)
        .eq('user_id', session.user.sub)
        .single()

    if (!member) notFound()

    const { data: app } = await supabase
        .from('trading_apps')
        .select('id, slug, brand_name, logo_url, custom_domain, primary_color, is_active')
        .eq('slug', traderSlug)
        .eq('org_id', org.id)
        .single()

    if (!app) notFound()

    return (
        <TraderShell app={app} orgSlug={orgSlug}>
            {children}
        </TraderShell>
    )
}
