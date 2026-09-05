import { getPickerData } from '@/app/(merchant)/org/actions'
import { OrgContextProvider } from './org-context'
import OrgShell from './org-shell' // adjust path
import { getOrgRole } from '@/lib/servers-db'
import { createClient } from '@mcloud/db/server'
import { getSession } from '@mcloud/auth/server'
import { redirect, notFound } from 'next/navigation'
import { loginUrlWithReturn } from '@mcloud/auth/routes'

export default async function OrgLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ orgSlug: string }>
}) {
    const { orgSlug } = await params
    const { stores } = await getPickerData().catch(() => ({ stores: [], orgs: [], userName: null }))
        const session = await getSession()
        if (!session?.user) redirect(loginUrlWithReturn(`/org/${orgSlug}/servers/new`))
    
        const userId = session.user.id
        const supabase = await createClient()
    
        const { data: org } = await supabase
            .from('orgs')
            .select('id, name, slug, logo_url, type')
            .eq('slug', orgSlug)
            .single()
    
        if (!org) notFound()
    
        const role = await getOrgRole(org.id, userId)
        if (role !== 'owner' && role !== 'admin') {
            // Not authorized to provision — send back to the servers list.
            redirect(`/org/${orgSlug}/servers`)
        }
    
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
        <OrgContextProvider stores={stores} orgSlug={orgSlug}>
            <OrgShell org={org} user={shellUser} orgSlug={orgSlug}>
                {children}
            </OrgShell>
        </OrgContextProvider>
    )
}