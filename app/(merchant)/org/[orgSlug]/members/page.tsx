import { redirect, notFound } from 'next/navigation'
import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import OrgShell from '../org-shell'
import OrgMembersClient from './members-client'
import { getOrgMembers } from './actions'

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
    const { orgSlug } = await params
    const session = await auth0.getSession()
    if (!session?.user) redirect('/auth/login')

    const supabase = await createClient()
    const { data: org } = await supabase
        .from('orgs')
        .select('id, name, slug, logo_url, type, owner_id')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    const { data: userRow } = await supabase.from('users').select('name, email, avatar_url').eq('id', session.user.sub).single()
    const shellUser = {
        name: userRow?.name ?? session.user.name ?? 'Account',
        email: userRow?.email ?? session.user.email ?? '',
        avatarUrl: userRow?.avatar_url ?? undefined,
    }

    const data = await getOrgMembers(orgSlug)
    if (data.error === 'Org not found') notFound()
    if (!data.currentRole) redirect(`/org/${orgSlug}`)

    return (
        <OrgShell org={org} user={shellUser} orgSlug={orgSlug}>
            <OrgMembersClient
                orgId={data.orgId!}
                orgSlug={orgSlug}
                members={data.members}
                invites={data.invites}
                currentRole={data.currentRole}
            />
        </OrgShell>
    )
}
