// apps/web/app/org/[orgSlug]/servers/page.tsx
import { redirect, notFound } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { createClient } from '@mcloud/db/server'
import Link from 'next/link'
import { buttonClass } from '@mcloud/ui/kit/button'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Icon } from '@mcloud/ui/kit/icon'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { getOrgRole, listOrgServerUuids, syncServerCache } from '@/lib/servers-db'
import { listServers, getServerDetail } from '@/lib/upcloud'
import ServersTable from './servers-table'

export default async function ServersPage({
    params,
}: {
    params: Promise<{ orgSlug: string }>
}) {
    const { orgSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect(loginUrlWithReturn(`/org/${orgSlug}/servers`))

    const userId = session.user.id
    const supabase = await createClient()

    const { data: org } = await supabase
        .from('orgs')
        .select('id, name, slug')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    const role = await getOrgRole(org.id, userId)
    if (!role) notFound()

    const canManage = role === 'owner' || role === 'admin'

    let servers: Awaited<ReturnType<typeof getServerDetail>>[] = []
    let error: string | null = null
    try {
        const uuids = await listOrgServerUuids(org.id)
        if (uuids.length > 0) {
            const all = await listServers()
            const filtered = all.filter((s) => uuids.includes(s.uuid))
            servers = await Promise.all(filtered.map((s) => getServerDetail(s.uuid)))
            await syncServerCache(servers)
        }
    } catch (e) {
        error = e instanceof Error ? e.message : 'Failed to load servers'
    }

    const create = canManage && (
        <Link href={`/org/${orgSlug}/servers/new`} className={buttonClass('primary')}>
            <Icon name="add" size={16} />
            Create server
        </Link>
    )

    return (
        <div className="space-y-6">
            <PageHeader
                title="Servers"
                description="New servers can take a few minutes to become reachable. Open a server for its details."
                actions={create}
            />

            {error && <Notice tone="error">{error}</Notice>}

            {!error && (
                <Panel flush>
                    {servers.length === 0 ? (
                        <EmptyState
                            icon="dns"
                            title="No servers yet"
                            description={canManage
                                ? 'Create your first server to host apps and services for this organization.'
                                : 'Ask an organization owner or admin if you need a server created.'}
                            action={canManage && (
                                <Link href={`/org/${orgSlug}/servers/new`} className={buttonClass('primary', 'sm')}>
                                    Create your first server
                                </Link>
                            )}
                        />
                    ) : (
                        <ServersTable orgSlug={orgSlug} servers={servers} canManage={canManage} />
                    )}
                </Panel>
            )}
        </div>
    )
}
