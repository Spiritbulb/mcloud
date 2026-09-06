import OrgShell from '../org-shell'
import { createClient } from '@mcloud/db/server'
import { getSession } from '@mcloud/auth/server'
import { redirect, notFound } from 'next/navigation'
import { loginUrlWithReturn } from '@mcloud/auth/routes'

export default async function OrgPagesLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ orgSlug: string }>
}) {
    const { orgSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect(loginUrlWithReturn(`/org/${orgSlug}`))

    const userId = session.user.id
    const supabase = await createClient()

    const { data: org } = await supabase
        .from('orgs')
        .select('id, name, slug, logo_url, type')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    const { data: userRow } = await supabase
        .from('users')
        .select('name, email, avatar_url')
        .eq('id', userId)
        .single()

    const shellUser = {
        name: userRow?.name ?? session.user.name ?? 'Account',
        email: userRow?.email ?? session.user.email ?? '',
        avatarUrl: userRow?.avatar_url ?? undefined,
    }

    return (
        <OrgShell org={org} user={shellUser} orgSlug={orgSlug}>
            {children}
        </OrgShell>
    )
}