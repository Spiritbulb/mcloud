'use client'

import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { AppShell, ContextSwitcher } from '@mcloud/ui/kit/app-shell'
import { activeNavId, findNavItem, normalizePath, type ShellNavSection } from '@mcloud/ui/kit/nav-logic'
import { WalletBalancePill } from '@/components/wallet-balance'
import { StorefrontMoveBanner } from './storefront-move-banner'

type OrgShellOrg = {
    id: string
    name: string
    slug: string
    logo_url?: string | null
    icon_url?: string | null
    type: string
}

type OrgShellUser = {
    name: string
    email: string
    avatarUrl?: string
}

/** The org hub's nav. Billing has its own entry, so its page is never shown as Overview. */
export function orgSections(orgSlug: string): ShellNavSection[] {
    const base = `/org/${orgSlug}`
    return [
        {
            id: 'org',
            items: [
                { id: 'home', label: 'Overview', icon: 'home', href: base },
                { id: 'stores', label: 'Stores', icon: 'storefront', href: `${base}/stores` },
                { id: 'servers', label: 'Servers', icon: 'dns', href: `${base}/servers` },
                { id: 'members', label: 'Members', icon: 'group', href: `${base}/members` },
            ],
        },
        {
            id: 'account',
            label: 'Account',
            items: [
                { id: 'billing', label: 'Billing', icon: 'credit_card', href: `${base}/billing` },
                // /integrations exists but is a placeholder (nothing can be configured yet), so it is not linked.
                { id: 'settings', label: 'Settings', icon: 'settings', href: `${base}/settings` },
            ],
        },
    ]
}

export default function OrgShell({
    children,
    org,
    user,
    orgSlug,
}: {
    children: React.ReactNode
    org: OrgShellOrg
    user: OrgShellUser
    orgSlug: string
}) {
    const pathname = usePathname()
    const { resolvedTheme, setTheme } = useTheme()
    const sections = orgSections(orgSlug)
    // Overview only on the org root itself; a page with no nav entry (e.g. /integrations)
    // highlights nothing rather than claiming to be Overview.
    const path = normalizePath(pathname)
    const matched = activeNavId(sections, path)
    const activeId = matched === 'home' && path !== `/org/${orgSlug}` ? undefined : matched
    const active = findNavItem(sections, activeId)
    const segment = path.split('/')[3] ?? ''
    const pageLabel = active?.label ?? (segment ? segment[0].toUpperCase() + segment.slice(1) : 'Overview')

    return (
        <AppShell
            sections={sections}
            activeId={activeId}
            brandHref={`/org/${orgSlug}`}
            context={<ContextSwitcher name={org.name} detail="Organization" logo={org.icon_url ?? org.logo_url} />}
            user={user}
            signOutHref="/auth/logout"
            crumbs={[{ label: org.name, href: `/org/${orgSlug}` }, { label: pageLabel }]}
            actions={<WalletBalancePill orgSlug={orgSlug} />}
            banner={<StorefrontMoveBanner />}
            onToggleTheme={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
            {children}
        </AppShell>
    )
}
