import { redirect, notFound } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { createClient } from '@mcloud/db/server'
import OrgSettingsClient from './org-settings-client'

export default async function OrgSettingsPage({
    params,
}: {
    params: Promise<{ orgSlug: string }>
}) {
    const { orgSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect(loginUrlWithReturn(`/org/${orgSlug}/settings`))

    const userId = session.user.id
    const supabase = await createClient()

    const { data: org } = await supabase
        .from('orgs')
        .select('id, name, slug, logo_url, owner_id')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    const { data: membership } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', org.id)
        .eq('user_id', userId)
        .maybeSingle()

    const canManage = membership?.role === 'admin'
    const isOwner = membership?.role === 'owner'
    if (!canManage && !isOwner) notFound()

    const { count: storeCount } = await supabase
        .from('stores')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)

    return (
        <OrgSettingsClient
            org={org}
            isOwner={org.owner_id === userId}
            storeCount={storeCount ?? 0}
        />
    )
}
