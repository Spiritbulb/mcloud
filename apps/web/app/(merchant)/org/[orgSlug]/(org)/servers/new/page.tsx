// apps/web/app/org/[orgSlug]/servers/new/page.tsx
import { redirect, notFound } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { createClient } from '@mcloud/db/server'
import { getOrgRole } from '@/lib/servers-db'
import NewServerForm from './new-server-form'

export default async function NewServerPage({
    params,
}: {
    params: Promise<{ orgSlug: string }>
}) {
    const { orgSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect(loginUrlWithReturn(`/org/${orgSlug}/servers/new`))

    const supabase = await createClient()
    const { data: org } = await supabase
        .from('orgs')
        .select('id, name, slug')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    const role = await getOrgRole(org.id, session.user.id)
    if (role !== 'owner' && role !== 'admin') {
        // Not authorized to provision — send back to the servers list.
        redirect(`/org/${orgSlug}/servers`)
    }

    return <NewServerForm orgSlug={orgSlug} orgName={org.name} />
}
