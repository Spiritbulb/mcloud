import { redirect, notFound } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { createClient } from '@mcloud/db/server'
import OrgShell from '../org-shell'
import StoresClient from './stores-client'
import { getOrgStores } from './actions'

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
    const { orgSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect(loginUrlWithReturn(`/org/${orgSlug}/stores`))

    const supabase = await createClient()
    const { data: org } = await supabase
        .from('orgs')
        .select('id, name, slug, logo_url, type, owner_id')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    const { data: userRow } = await supabase.from('users').select('name, email, avatar_url').eq('id', session.user.id).single()
    const shellUser = {
        name: userRow?.name ?? session.user.name ?? 'Account',
        email: userRow?.email ?? session.user.email ?? '',
        avatarUrl: userRow?.avatar_url ?? undefined,
    }

    const data = await getOrgStores(orgSlug)
    if (data.error === 'Not a member') notFound()

    return (
        <OrgShell org={org} user={shellUser} orgSlug={orgSlug}>
            <StoresClient orgId={data.orgId!} orgSlug={orgSlug} stores={data.stores.map(s => ({ ...s, created_at: s.created_at ?? '' }))} role={data.role} />
        </OrgShell>
    )
}
