import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/server'
import { createClient } from '@mcloud/db/server'
import OrgShell from '../org-shell'

export default async function OrgPagesLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ orgSlug: string }>
}) {
    const { orgSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect('/auth/login')
    const userId = session.user.id
    const supabase = await createClient()

    const { data: org } = await supabase
        .from('orgs')
        .select('id, name, slug, logo_url, type')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    const { data: membership } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', org.id)
        .eq('user_id', userId)
        .maybeSingle()

    if (!membership) notFound()

    const { data: userRow } = await supabase
        .from('users')
        .select('name, email, avatar_url')
        .eq('id', userId)
        .single()

    const user = {
        name: userRow?.name ?? session.user.name ?? 'Account',
        email: userRow?.email ?? session.user.email ?? '',
        avatarUrl: userRow?.avatar_url ?? undefined,
    }

    return (
        <OrgShell org={org} user={user} orgSlug={orgSlug}>
            {children}
        </OrgShell>
    )
}
