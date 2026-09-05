// apps/web/app/org/[orgSlug]/servers/page.tsx
import { redirect, notFound } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { createClient } from '@mcloud/db/server'
import Link from 'next/link'
import OrgShell from '../org-shell'
import { getOrgRole, listOrgServerUuids, syncServerCache } from '@/lib/servers-db'
import { listServers } from '@/lib/upcloud'
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
        .select('id, name, slug, logo_url, type')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    const role = await getOrgRole(org.id, userId)
    if (!role) notFound()

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

    const canManage = role === 'owner' || role === 'admin'

    let servers: Awaited<ReturnType<typeof listServers>> = []
    let error: string | null = null
    try {
        const uuids = await listOrgServerUuids(org.id)
        if (uuids.length > 0) {
            const all = await listServers()
            servers = all.filter((s) => uuids.includes(s.uuid))
            await syncServerCache(servers)
        }
    } catch (e) {
        error = e instanceof Error ? e.message : 'Failed to load servers'
    }

    return (
        <>
            <div className="max-w-6xl mx-auto space-y-6 mb-6">
        {/* Hero — provisioning is the headline action now */}
            <section className="relative overflow-hidden ">
                <div className="relative flex flex-col sm:flex-row items-center">
                    <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left">
                        <p className="text-[12px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-primary)]">
                            {org.name}
                        </p>
                        <h1 className="text-[1.75rem] sm:text-[2rem] font-bold leading-tight text-[var(--md-sys-color-on-surface)]">
                            Manage your servers
                        </h1>
                        <p className="text-[14px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)] max-w-md mx-auto sm:mx-0">
                            New servers might take a few minutes to be accessible. You can check the status on the table below or by clicking on the server name to view the details page.
                        </p>
                    </div>
                    <img
                        src="/digital-warehouse.svg"
                        alt=""
                        aria-hidden="true"
                        className="w-80 sm:w-72 h-auto shrink-0 select-none"
                    />
                </div>
            </section>
            </div>

        
        <div className="max-w-6xl mx-auto space-y-6">
            {!error && servers.length !== 0 && (
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-[var(--md-sys-color-on-surface)]">Servers</h1>
                {canManage && (
                    <Link
                        href={`/org/${orgSlug}/servers/new`}
                        className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--md-sys-color-primary)] px-4 text-[13px] font-semibold text-[var(--md-sys-color-on-primary)] hover:opacity-90 transition-opacity"
                    >
                        Create a server
                    </Link>
                )}
            </div>
            )}

            {error && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            {!error && servers.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-6 p-8 text-sm text-[var(--md-sys-color-on-surface-variant)]">
                    {canManage
                        ? 'No servers yet. Use the button below to create your first server.'
                        : 'No servers yet. If you need access to create servers, please contact your organisation administrator.'}
                    {canManage && (
                    <Link
                        href={`/org/${orgSlug}/servers/new`}
                        className="flex h-9 w-auto items-center gap-2 rounded-full bg-[var(--md-sys-color-primary)] px-4 text-[13px] font-semibold text-[var(--md-sys-color-on-primary)] hover:opacity-90 transition-opacity"
                    >
                        Create your first server
                    </Link>
                )}
                </div>
            )}

            {servers.length > 0 && (
                <ServersTable orgSlug={orgSlug} servers={servers} canManage={canManage} />
            )}
        </div>
        </>
    )
}