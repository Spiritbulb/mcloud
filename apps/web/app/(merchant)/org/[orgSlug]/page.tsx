import { redirect, notFound } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { createClient } from '@mcloud/db/server'
import Link from 'next/link'
import { cn } from '@mcloud/ui/utils'
import OrgShell from './org-shell'

function MSO({ icon, className, fill = 0 }: { icon: string; className?: string; fill?: number }) {
    return (
        <span
            className={cn('material-symbols-outlined select-none leading-none', className)}
            style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}
        >
            {icon}
        </span>
    )
}

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

// Resolve a store's actual org slug from the (array-or-object) nested relation.
function orgSlugOf(store: { org?: { slug?: string } | { slug?: string }[] | null }): string | null {
    const o = Array.isArray(store?.org) ? store.org[0] : store?.org
    return o?.slug ?? null
}

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

    const isOwner = org.owner_id === userId
    const role = membership.role

    const [
        { data: userRow },
        { data: stores },
        { data: members },
        { data: otherMemberships },
    ] = await Promise.all([
        supabase
            .from('users')
            .select('name, email, avatar_url')
            .eq('id', userId)
            .single(),
        supabase
            .from('stores')
            .select('id, name, slug, logo_url, is_pro')
            .eq('org_id', org.id)
            .order('created_at', { ascending: false }),
        supabase
            .from('org_members')
            .select('id, role, user:users(name, email, avatar_url)')
            .eq('org_id', org.id)
            .order('created_at', { ascending: true }),
        supabase
            .from('store_members')
            .select('role, store:stores(id, name, slug, logo_url, org_id, org:orgs(slug))')
            .eq('user_id', userId)
            .in('role', ['owner', 'admin']),
    ])

    const shellUser = {
        name: userRow?.name ?? session.user.name ?? 'Account',
        email: userRow?.email ?? session.user.email ?? '',
        avatarUrl: userRow?.avatar_url ?? undefined,
    }

    const otherStores = (otherMemberships ?? [])
        .map(m => m.store as any)
        .filter(s => s && s.org_id !== org.id)

    const storeList = stores ?? []
    const memberList = members ?? []

    const allStores = [
        ...storeList.map((s) => ({ ...s, external: false as const, linkOrgSlug: orgSlug })),
        ...otherStores.map((s: any) => ({ ...s, external: true as const, linkOrgSlug: orgSlugOf(s) ?? orgSlug })),
    ]

    const firstName = (shellUser.name || 'there').split(' ')[0]
    const canManage = role === 'owner' || role === 'admin'

    return (
        <OrgShell org={org} user={shellUser} orgSlug={orgSlug}>
        <div className="max-w-4xl mx-auto space-y-8">

            {/* Stores belt — minimised, horizontally scrollable, sits above the hero.
                Kept for quick access / accessibility, but no longer the page's focus. */}
            {allStores.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:thin]">
                    <span className="shrink-0 text-[11px] font-medium text-[var(--md-sys-color-on-surface-variant)] pr-1">
                        Stores
                    </span>
                    {allStores.map((store) => (
                        <Link
                            key={store.id}
                            href={`/org/${store.linkOrgSlug}/${store.slug}/settings`}
                            title={store.name}
                            className="shrink-0 flex items-center gap-1.5 h-7 pl-1 pr-2.5 rounded-full border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] hover:border-[var(--md-sys-color-primary)] transition-colors"
                        >
                            <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold overflow-hidden store-avatar-fallback">
                                {store.logo_url
                                    ? <img src={store.logo_url} alt="" className="w-full h-full object-cover" />
                                    : getInitials(store.name)
                                }
                            </div>
                            <span className="text-[11px] font-medium text-[var(--md-sys-color-on-surface)] max-w-[8rem] truncate">
                                {store.name}
                            </span>
                            {store.external && (
                                <MSO icon="open_in_new" className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] opacity-50" />
                            )}
                        </Link>
                    ))}
                    {canManage && (
                        <Link
                            href={`/org/${orgSlug}/stores?new=1`}
                            className="shrink-0 flex items-center gap-1 h-7 px-2.5 rounded-full border border-dashed border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] hover:border-[var(--md-sys-color-primary)] transition-colors"
                        >
                            <MSO icon="add" className="text-[13px]" />
                            <span className="text-[11px] font-medium">New</span>
                        </Link>
                    )}
                </div>
            )}

            {/* Hero — provisioning is the headline action now */}
            <section className="relative overflow-hidden">
                <div className="relative flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left">
                        <p className="text-[12px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-primary)]">
                            {org.name}
                        </p>
                        <h1 className="text-[1.75rem] sm:text-[2rem] font-bold leading-tight text-[var(--md-sys-color-on-surface)]">
                            Spin up a server, {firstName}.
                        </h1>
                        <p className="text-[14px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)] max-w-md mx-auto sm:mx-0">
                            Provision infrastructure for {org.name} in a few clicks. Your stores keep running their own thing, this is just about the servers behind them.
                        </p>
                        {canManage && (
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                                <Link
                                    href={`/org/${orgSlug}/servers/new`}
                                    className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-[13px] font-semibold hover:opacity-90 transition-opacity"
                                >
                                    <MSO icon="dns" className="text-[18px]" />
                                    Create a server
                                </Link>
                                <Link
                                    href={`/org/${orgSlug}/servers`}
                                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-[var(--md-sys-color-outline-variant)] text-[13px] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                                >
                                    View servers
                                </Link>
                            </div>
                        )}
                    </div>
                    <img
                        src="/run-it-online.svg"
                        alt=""
                        aria-hidden="true"
                        className="w-80 sm:w-72 h-auto shrink-0 select-none"
                    />
                </div>
            </section>

            {/* Stats row — servers stat left out until the table exists */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                    { label: 'Sites', value: storeList.length, icon: 'storefront' },
                    { label: 'Members', value: memberList.length, icon: 'group' },
                    { label: 'Plan', value: org.type === 'pro' ? 'Pro' : 'Free', icon: 'workspace_premium' },
                ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[var(--md-sys-color-primary-container)] flex items-center justify-center shrink-0">
                            <MSO icon={stat.icon} className="text-[20px] text-[var(--md-sys-color-primary)]" fill={1} />
                        </div>
                        <div>
                            <p className="text-[22px] font-semibold text-[var(--md-sys-color-on-surface)] leading-tight">{stat.value}</p>
                            <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Members */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)]">Members</h2>
                    <Link
                        href={`/org/${orgSlug}/members`}
                        className="text-[12px] text-[var(--md-sys-color-primary)] hover:underline"
                    >
                        Manage
                    </Link>
                </div>
                <div className="rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] divide-y divide-[var(--md-sys-color-outline-variant)]/50 overflow-hidden">
                    {memberList.slice(0, 5).map((m) => {
                        const u = m.user as any
                        return (
                            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden store-avatar-fallback">
                                    {u?.avatar_url
                                        ? <img src={u.avatar_url} alt={u.name ?? ''} className="w-full h-full object-cover" />
                                        : getInitials(u?.name ?? '?')
                                    }
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)] truncate">{u?.name ?? 'Unknown'}</span>
                                    <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] truncate">{u?.email}</span>
                                </div>
                                <span className="text-[11px] capitalize px-2 py-0.5 rounded-full bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)]">
                                    {m.role}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Quick actions */}
            {canManage && (
                <section className="space-y-3">
                    <h2 className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)]">Quick actions</h2>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href={`/org/${orgSlug}/members`}
                            className="flex items-center gap-2 h-9 px-4 rounded-full border border-[var(--md-sys-color-outline-variant)] text-[13px] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                        >
                            <MSO icon="person_add" className="text-[16px]" />
                            Invite member
                        </Link>
                        <Link
                            href={`/org/${orgSlug}/settings`}
                            className="flex items-center gap-2 h-9 px-4 rounded-full border border-[var(--md-sys-color-outline-variant)] text-[13px] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                        >
                            <MSO icon="settings" className="text-[16px]" />
                            Org settings
                        </Link>
                    </div>
                </section>
            )}
        </div>
        </OrgShell>
    )
}