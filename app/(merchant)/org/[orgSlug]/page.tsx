import { redirect, notFound } from 'next/navigation'
import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import Link from 'next/link'
import { cn } from '@/lib/utils'
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

export default async function OrgHomePage({
    params,
}: {
    params: Promise<{ orgSlug: string }>
}) {
    const { orgSlug } = await params
    const session = await auth0.getSession()
    if (!session?.user) redirect('/auth/login')

    const userId = session.user.sub
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

    // Fetch stores in this org
    const { data: stores } = await supabase
        .from('stores')
        .select('id, name, slug, logo_url, is_pro')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })

    // Fetch members
    const { data: members } = await supabase
        .from('org_members')
        .select('id, role, user:users(name, email, avatar_url)')
        .eq('org_id', org.id)
        .order('created_at', { ascending: true })

    // Stores the user manages that are NOT in this org (personal or other orgs)
    const { data: otherMemberships } = await supabase
        .from('store_members')
        .select('role, store:stores(id, name, slug, logo_url, org_id)')
        .eq('user_id', userId)
        .in('role', ['owner', 'admin'])

    const otherStores = (otherMemberships ?? [])
        .map(m => m.store as any)
        .filter(s => s && s.org_id !== org.id)

    const storeList = stores ?? []
    const memberList = members ?? []

    return (
        <OrgShell org={org} user={shellUser} orgSlug={orgSlug}>
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                    { label: 'Stores', value: storeList.length, icon: 'storefront' },
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

            {/* Stores */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)]">Stores</h2>
                    <Link
                        href={`/org/${orgSlug}/stores`}
                        className="text-[12px] text-[var(--md-sys-color-primary)] hover:underline"
                    >
                        View all
                    </Link>
                </div>
                {storeList.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--md-sys-color-outline-variant)] p-8 text-center">
                        <MSO icon="storefront" className="text-[32px] text-[var(--md-sys-color-on-surface-variant)] opacity-40 mb-2" />
                        <p className="text-[13px] text-[var(--md-sys-color-on-surface-variant)]">No stores in this organization yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {storeList.slice(0, 6).map((store) => (
                            <Link
                                key={store.id}
                                href={`/org/${orgSlug}/${store.slug}/settings`}
                                className="flex items-center gap-3 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-4 py-3 hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                            >
                                <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold overflow-hidden store-avatar-fallback">
                                    {store.logo_url
                                        ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover rounded-lg" />
                                        : getInitials(store.name)
                                    }
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)] truncate">{store.name}</span>
                                    <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] truncate">{store.slug}.menengai.cloud</span>
                                </div>
                                {store.is_pro && (
                                    <MSO icon="workspace_premium" className="text-[16px] text-[var(--md-sys-color-primary)] shrink-0" fill={1} />
                                )}
                                <MSO icon="chevron_right" className="text-[18px] text-[var(--md-sys-color-on-surface-variant)] opacity-40 shrink-0" />
                            </Link>
                        ))}
                    </div>
                )}
            </section>

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

            {/* Other stores (admin on, not in this org) */}
            {otherStores.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)]">Your other stores</h2>
                            <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">Stores you manage outside this organisation</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {otherStores.map((store: any) => (
                            <Link
                                key={store.id}
                                href={`/store/${store.slug}/settings`}
                                className="flex items-center gap-3 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-4 py-3 hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                            >
                                <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold overflow-hidden store-avatar-fallback">
                                    {store.logo_url
                                        ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover rounded-lg" />
                                        : getInitials(store.name)
                                    }
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)] truncate">{store.name}</span>
                                    <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] truncate">
                                        {store.org_id ? 'Other organisation' : 'Personal'}
                                    </span>
                                </div>
                                <MSO icon="open_in_new" className="text-[16px] text-[var(--md-sys-color-on-surface-variant)] opacity-40 shrink-0" />
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Quick actions */}
            {(role === 'owner' || role === 'admin') && (
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
