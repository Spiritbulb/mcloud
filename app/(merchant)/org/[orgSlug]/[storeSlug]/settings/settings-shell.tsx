'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Store, Palette, Globe, Briefcase, Link2, CreditCard, Bell, Package, ShoppingBag, FileText, User, House, Users } from 'lucide-react'
import { SettingsNav, MobileSettingsNav } from './settings-nav'
import type { NavSection } from './settings-nav'
import { SettingsHeader } from './settings-header'
import { GettingStartedDrawer } from './notifications-drawer'
import { trackVisit } from '@/app/onboarding/actions'

// ─── Sections ────────────────────────────────────────────────────────────────

export const SECTIONS: readonly NavSection[] = [
    {
        id: 'store',
        label: 'Store',
        tabs: [
            { id: 'home', label: 'Overview', icon: 'home' },
            { id: 'general', label: 'General', icon: 'storefront' },
            { id: 'appearance', label: 'Appearance', icon: 'palette' },
        ],
    },
    {
        id: 'catalog',
        label: 'Catalog',
        tabs: [
            { id: 'products', label: 'Products', icon: 'inventory_2' },
            { id: 'services', label: 'Services', icon: 'home_repair_service' },
        ],
    },
    {
        id: 'commerce',
        label: 'Commerce',
        tabs: [
            { id: 'orders', label: 'Orders', icon: 'receipt_long' },
            { id: 'customers', label: 'Customers', icon: 'person', beta: true, pro: true },
            { id: 'blog', label: 'Blog', icon: 'article' },
        ],
    },
    {
        id: 'advanced',
        label: 'Advanced',
        tabs: [
            { id: 'members', label: 'Members', icon: 'group', pro: true },
            { id: 'domain', label: 'Domain', icon: 'language', pro: true },
            {
                id: 'integrations',
                label: 'Integrations',
                icon: 'link',
                pro: true,
                subTabs: [
                    { id: 'payments', label: 'Payments' },
                    { id: 'notifications', label: 'Notifications' },
                    { id: 'social', label: 'Socials' },
                ],
            },
        ],
    },
    {
        id: 'account',
        label: 'Account',
        tabs: [
            { id: 'billing', label: 'Billing', icon: 'credit_card' },
        ],
    },
] as const

const ALL_TABS = SECTIONS.flatMap((s) => s.tabs)

export type TabId = (typeof ALL_TABS)[number]['id']

// ─── Shell ────────────────────────────────────────────────────────────────────

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

    const user = store ? {
        name: store.user?.name ?? 'Account',
        email: store.user?.email ?? '',
        avatarUrl: store.user?.avatar_url ?? undefined,
    } : null
    const pathname = usePathname()
    const router = useRouter()

    const activeId = (() => {
        const isRoot = pathname === `/org/${orgSlug}/${slug}/settings` || pathname === `/settings`
        if (isRoot) return 'home' as TabId

        const matched = ALL_TABS.find((t) => {
            if (t.id === 'home') return false
            return pathname.includes(`/settings/${t.id}`)
        })
        return (matched?.id ?? 'home') as TabId
    })()

    const activeLabel = ALL_TABS.find((t) => t.id === activeId)?.label ?? 'Overview'

    const [activeSubTab, setActiveSubTab] = useState<string>('')
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    useEffect(() => {
        const handler = () => setMobileNavOpen(true)
        window.addEventListener('mobile-nav-open', handler)
        return () => window.removeEventListener('mobile-nav-open', handler)
    }, [])
    useEffect(() => {
        if (store) trackVisit(store.id)
    }, [store])

    if (error || !store) return (
        <div className="h-[100dvh] flex flex-col items-center justify-center gap-2 text-center px-6">
            <p className="text-[15px] font-medium text-foreground">
                {error === 'unauthenticated' && 'You need to be signed in.'}
                {error === 'forbidden' && "You don't have access to this store."}
                {error === 'unknown' && 'Something went wrong loading your store.'}
                {!error && 'Store not found.'}
            </p>
            <p className="text-sm text-muted-foreground">
                {error === 'unauthenticated'
                    ? <a href={`${process.env.APP_BASE_URL}/auth/login`} className="underline underline-offset-4">Sign in</a>
                    : <a href="/auth/logout" className="underline underline-offset-4">Sign out and try again</a>
                }
            </p>
        </div>
    )

    const navUser = {
        name: user?.name ?? '…',
        email: user?.email ?? '',
        avatarUrl: user?.avatarUrl,
        accountHref: process.env.NODE_ENV === 'development'
            ? `http://localhost:3000/org/${orgSlug}/${slug}/settings/account`
            : `https://admin.menengai.cloud/settings/account`,
        onSignOut: () => { window.location.href = '/auth/logout' },
    }

    const navStore = {
        name: store.name,
        slug: store.slug,
        logo_url: store.logo_url,
        custom_domain: store.custom_domain,
        is_pro: store.is_pro,
        org: store.org ?? null,
    }

    const navigate = (id: TabId) => router.push(
        process.env.NODE_ENV === 'development'
            ? `/org/${orgSlug}/${slug}/settings/${id}`
            : `/settings/${id}`
    )

    return (
        <SidebarProvider
            defaultOpen={false}
            style={{
                display: 'contents',
                '--sidebar-width': '15rem'
            } as React.CSSProperties}
        >
            <div data-settings-shell className="h-[100dvh] overflow-hidden flex bg-background">

                {/* Desktop sidebar */}
                <SettingsNav
                    activeTab={activeId}
                    activeSubTab={activeSubTab}
                    onSelectSubTab={setActiveSubTab}
                    onSelect={navigate}
                    SECTIONS={SECTIONS}
                    user={navUser}
                    store={navStore}
                    allStores={store.allStores ?? [navStore]}
                    orgSlug={orgSlug}
                />

                {/* Mobile drawer */}
                <MobileSettingsNav
                    activeTab={activeId}
                    activeSubTab={activeSubTab}
                    onSelectSubTab={setActiveSubTab}
                    onSelect={navigate}
                    SECTIONS={SECTIONS}
                    user={navUser}
                    store={navStore}
                    allStores={store.allStores ?? [navStore]}
                    open={mobileNavOpen}
                    onOpen={() => setMobileNavOpen(true)}
                    onClose={() => setMobileNavOpen(false)}
                    orgSlug={orgSlug}
                />

                {/* Main content */}
                <div className="flex flex-col flex-1 min-w-0 min-h-0">
                    <div className=''>
                        <SettingsHeader
                            store={navStore}
                            activeLabel={activeLabel}
                            onOpenMobileNav={() => setMobileNavOpen(true)}
                            mobileOpen={mobileNavOpen}
                        />
                    </div>
                    <main className="flex-1 overflow-y-auto px-6 md:px-10 py-8">
                        {children}

                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}