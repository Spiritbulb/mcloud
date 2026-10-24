import { isPaidPlan } from '@mcloud/merchant/plans'
import { getStorePlans } from '@mcloud/merchant/plans-server'
import { storefrontDisplayUrl } from '@mcloud/merchant/storefront-url'
import { redirect, notFound } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { createClient } from '@mcloud/db/server'
import Link from 'next/link'
import { Avatar } from '@mcloud/ui/kit/avatar'
import { Badge } from '@mcloud/ui/kit/badge'
import { buttonClass } from '@mcloud/ui/kit/button'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Icon } from '@mcloud/ui/kit/icon'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Stat, StatStrip } from '@mcloud/ui/kit/stat-strip'
import { Table, Td, Tr } from '@mcloud/ui/kit/table'
import { PlanBadge } from './plan-badge'

// Resolve a store's actual org slug from the (array-or-object) nested relation.
function orgSlugOf(store: { org?: { slug?: string } | { slug?: string }[] | null }): string | null {
    const o = Array.isArray(store?.org) ? store.org[0] : store?.org
    return o?.slug ?? null
}

const ROLE_TONE = { owner: 'warning', admin: 'info' } as const

export default async function OrgHomePage({
    params,
}: {
    params: Promise<{ orgSlug: string }>
}) {
    const { orgSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect(loginUrlWithReturn(`/org/${orgSlug}`))

    const userId = session.user.id
    const supabase = await createClient()

    const { data: org } = await supabase
        .from('orgs')
        .select('id, name, slug, logo_url, type, owner_id, created_at')
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

    const role = membership.role

    const [
        { data: userRow },
        { data: stores },
        { data: members },
        { data: otherMemberships },
        { data: servers }
    ] = await Promise.all([
        supabase
            .from('users')
            .select('name')
            .eq('id', userId)
            .single(),
        supabase
            .from('stores')
            .select('id, name, slug, logo_url, icon_url, is_pro')
            .eq('org_id', org.id)
            .order('created_at', { ascending: false }),
        supabase
            .from('org_members')
            .select('id, role, user:users(name, email, avatar_url)')
            .eq('org_id', org.id)
            .order('created_at', { ascending: true }),
        supabase
            .from('store_members')
            .select('role, store:stores(id, name, slug, logo_url, icon_url, org_id, org:orgs(slug))')
            .eq('user_id', userId)
            .in('role', ['owner', 'admin']),
        supabase
            .from('servers')
            .select('id, org_id, state')
            .eq('org_id', org.id)
    ])

    const otherStores = (otherMemberships ?? [])
        .map(m => m.store as any)
        .filter(s => s && s.org_id !== org.id)

    // is_pro on the stores row is a legacy cache; the plan comes from the subscription rows.
    const rawStores = stores ?? []
    const storePlans = await getStorePlans(rawStores.map((s) => s.id))
    const storeList = rawStores.map((s) => {
        const plan = storePlans.get(s.id) ?? 'free'
        return { ...s, plan, is_pro: isPaidPlan(plan) }
    })
    const memberList = members ?? []
    const serverList = servers ?? []
    const running = serverList.filter((s) => s.state === 'started').length

    const allStores = [
        ...storeList.map((s) => ({ ...s, external: false as const, linkOrgSlug: orgSlug })),
        ...otherStores.map((s: any) => ({ ...s, plan: undefined, external: true as const, linkOrgSlug: orgSlugOf(s) ?? orgSlug })),
    ]

    const firstName = (userRow?.name || session.user.name || 'there').split(' ')[0]
    const canManage = role === 'owner' || role === 'admin'

    return (
        <div className="space-y-6">
            <PageHeader
                title={org.name}
                description={`Welcome back, ${firstName}.`}
                actions={canManage && (
                    <>
                        <Link href={`/org/${orgSlug}/servers/new`} className={buttonClass('secondary')}>
                            <Icon name="dns" size={15} />
                            Create server
                        </Link>
                        <Link href={`/org/${orgSlug}/stores?new=1`} className={buttonClass('primary')}>
                            <Icon name="add" size={16} />
                            New store
                        </Link>
                    </>
                )}
            />

            <StatStrip className="grid-cols-1 sm:grid-cols-3">
                <Stat label="Stores" value={String(storeList.length)} hint={<Link href={`/org/${orgSlug}/stores`} className="hover:text-foreground">View stores</Link>} />
                <Stat label="Servers" value={String(serverList.length)} hint={serverList.length > 0 ? `${running} running` : 'None yet'} />
                <Stat label="Members" value={String(memberList.length)} hint={<Link href={`/org/${orgSlug}/members`} className="hover:text-foreground">Manage members</Link>} />
            </StatStrip>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <Panel
                    title="Stores"
                    description={otherStores.length > 0 ? 'Including stores you manage in other organizations' : undefined}
                    action={<Link href={`/org/${orgSlug}/stores`} className="text-primary hover:underline">View all</Link>}
                    flush
                >
                    {allStores.length === 0 ? (
                        <EmptyState
                            icon="storefront"
                            title="No stores yet"
                            description="A store is a site with its own products, orders and domain."
                            action={canManage && <Link href={`/org/${orgSlug}/stores?new=1`} className={buttonClass('primary', 'sm')}>Create a store</Link>}
                        />
                    ) : (
                        <Table>
                            <tbody>
                                {allStores.slice(0, 8).map((store) => (
                                    <Tr key={store.id}>
                                        <Td>
                                            <Link href={`/org/${store.linkOrgSlug}/${store.slug}/settings`} className="flex items-center gap-3">
                                                <Avatar name={store.name} src={store.icon_url ?? store.logo_url} />
                                                <span className="min-w-0">
                                                    <span className="block truncate font-medium hover:underline">{store.name}</span>
                                                    <span className="block truncate text-[12px] text-muted-foreground">{storefrontDisplayUrl(store.slug)}</span>
                                                </span>
                                            </Link>
                                        </Td>
                                        <Td align="right" label="Plan">
                                            {store.external
                                                ? <Badge>Other org</Badge>
                                                : <PlanBadge plan={store.plan} />}
                                        </Td>
                                    </Tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Panel>

                <div className="space-y-6">
                    <Panel
                        title="Servers"
                        action={serverList.length > 0 ? <Link href={`/org/${orgSlug}/servers`} className="text-primary hover:underline">View all</Link> : undefined}
                        flush
                    >
                        {serverList.length === 0 ? (
                            <EmptyState
                                icon="dns"
                                title="No servers yet"
                                description="Provision a server for this organization in a few clicks. Stores do not need one."
                                action={canManage && <Link href={`/org/${orgSlug}/servers/new`} className={buttonClass('secondary', 'sm')}>Create a server</Link>}
                            />
                        ) : (
                            <p className="p-4 text-[13px] text-muted-foreground">
                                {running} of {serverList.length} {serverList.length === 1 ? 'server is' : 'servers are'} running.
                            </p>
                        )}
                    </Panel>

                    <Panel
                        title="Members"
                        action={<Link href={`/org/${orgSlug}/members`} className="text-primary hover:underline">Manage</Link>}
                        flush
                    >
                        <ul className="divide-y divide-border">
                            {memberList.slice(0, 5).map((m) => {
                                const u = m.user as any
                                return (
                                    <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                                        <Avatar name={u?.name ?? null} src={u?.avatar_url} shape="circle" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-medium text-foreground">{u?.name ?? 'Unknown'}</span>
                                            <span className="block truncate text-[12px] text-muted-foreground">{u?.email}</span>
                                        </span>
                                        <Badge tone={ROLE_TONE[m.role as keyof typeof ROLE_TONE] ?? 'neutral'}>{m.role ? m.role[0].toUpperCase() + m.role.slice(1) : 'Member'}</Badge>
                                    </li>
                                )
                            })}
                        </ul>
                    </Panel>
                </div>
            </div>
        </div>
    )
}
