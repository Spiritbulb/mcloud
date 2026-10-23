'use client'

import { usePathname } from 'next/navigation'
import { AppShell, ContextSwitcher } from '@mcloud/ui/kit/app-shell'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { findNavItem } from '@mcloud/ui/kit/nav-logic'
import { getVertical, sectionsFor } from '@mcloud/verticals'
import type { TabId } from '@mcloud/verticals'
import { storefrontDisplayUrl, storefrontUrl } from '@mcloud/merchant/storefront-url'
import { useOrgContext } from '@mcloud/merchant/org-context'
import { webUrl } from '@/lib/host'
import { SettingsHeaderActions } from './settings-header'
import { BARE_TABS, UNLISTED_LABELS, settingsPath, settingsSections, tabFromPath } from './settings-nav-logic'

// The nav model lives in @mcloud/verticals (it is data about the vertical, not about React).
// Re-exported here so existing consumers keep their import.
export type { TabId }

export default function SettingsShell({
    children,
    orgSlug,
    slug,
    initialStore,
    initialError,
}: {
    children: React.ReactNode
    orgSlug: string
    slug: string
    initialStore: any
    initialError: 'unauthenticated' | 'forbidden' | 'unknown' | null
}) {
    const store = initialStore
    const error = initialError
    const { stores: pickerStores, orgSlug: ctxOrgSlug } = useOrgContext()
    const pathname = usePathname()

    if (error || !store) {
        return (
            <div className="flex h-[100dvh] items-center justify-center bg-background px-6">
                <EmptyState
                    icon={error === 'unauthenticated' ? 'lock' : 'error'}
                    title={
                        error === 'unauthenticated' ? 'You need to be signed in.'
                            : error === 'forbidden' ? "You don't have access to this store."
                                : error === 'unknown' ? 'Something went wrong loading your store.'
                                    : 'Store not found.'
                    }
                    description={
                        error === 'unauthenticated'
                            ? <a href={webUrl('/auth/login')} className="underline underline-offset-4">Sign in</a>
                            : <a href={webUrl('/auth/logout')} className="underline underline-offset-4">Sign out and try again</a>
                    }
                />
            </div>
        )
    }

    // The nav is a function of the vertical: an NGO has no catalog or customer accounts, but does
    // have Donations. store.type comes through because getStoreSettingsData selects stores.*.
    // store.is_pro is recomputed from the subscription rows there, not the legacy column.
    const isPaid = !!store.is_pro
    const sections = settingsSections(sectionsFor(getVertical(store.type)), orgSlug, slug, isPaid)
    const tab = tabFromPath(pathname)
    const active = findNavItem(sections, tab)
    const activeId = active?.id

    const user = {
        name: store.user?.name ?? 'Account',
        email: store.user?.email ?? '',
        avatarUrl: store.user?.avatar_url ?? undefined,
    }

    const context = (
        <ContextSwitcher
            name={store.name}
            detail={storefrontDisplayUrl(store.slug, store.custom_domain)}
            logo={store.logo_url}
            menuLabel="Switch store"
            options={pickerStores.map((s) => ({
                key: s.slug,
                name: s.name,
                logo: s.logo_url,
                href: settingsPath(ctxOrgSlug ?? orgSlug, s.slug),
            }))}
            links={[
                { label: 'View site', href: storefrontUrl(store.slug, store.custom_domain), icon: 'open_in_new', external: true },
                { label: 'All stores', href: webUrl(`/org/${orgSlug}/stores`), icon: 'storefront' },
            ]}
        />
    )

    return (
        <AppShell
            sections={sections}
            activeId={activeId}
            brandHref={webUrl(`/org/${orgSlug}`)}
            context={context}
            user={user}
            menuLinks={[
                { label: 'Account settings', href: settingsPath(orgSlug, slug, 'account'), icon: 'manage_accounts' },
                { label: 'Billing', href: webUrl(`/org/${orgSlug}/billing`), icon: 'credit_card' },
                { label: 'Contact', href: 'https://mcloud.co.ke/contact', icon: 'call', external: true },
                { label: 'Support', href: 'https://mcloud.co.ke/support', icon: 'help', external: true },
            ]}
            signOutHref={webUrl('/auth/logout')}
            crumbs={[
                ...(store.org ? [{ label: store.org.name as string, href: webUrl(`/org/${orgSlug}`) }] : []),
                { label: store.name as string, href: settingsPath(orgSlug, slug) },
                { label: active?.label ?? UNLISTED_LABELS[tab] ?? 'Settings' },
            ]}
            actions={<SettingsHeaderActions isPro={isPaid} orgSlug={orgSlug} />}
            content={BARE_TABS.has(tab) ? 'bare' : 'page'}
        >
            {children}
        </AppShell>
    )
}
