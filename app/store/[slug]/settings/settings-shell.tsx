'use client'

// components/settings-shell.tsx
// Added: wizardOpen state, GettingStartedDrawer, passes onOpenWizard to SettingsHeader

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Store, Palette, Globe, Link2, CreditCard, Bell, Package, ShoppingBag, FileText, User } from 'lucide-react'
import { SettingsNav, MobileSettingsNav } from './settings-nav'
import { SettingsHeader } from './settings-header'
import { GettingStartedDrawer } from './getting-started-drawer'

export const TABS = [
    { id: 'general', label: 'General', icon: <Store className="w-[15px] h-[15px]" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-[15px] h-[15px]" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-[15px] h-[15px]" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingBag className="w-[15px] h-[15px]" /> },
    { id: 'customers', label: 'Customers', icon: <User className="w-[15px] h-[15px]" />, beta: true },
    { id: 'blog', label: 'Blog', icon: <FileText className="w-[15px] h-[15px]" /> },
    { id: 'domain', label: 'Domain', icon: <Globe className="w-[15px] h-[15px]" />, beta: true },
    { id: 'integrations', label: 'Integrations', icon: <Link2 className="w-[15px] h-[15px]" />, beta: true },
] as const

export type TabId = (typeof TABS)[number]['id']

type ErrorType = 'unauthenticated' | 'forbidden' | 'unknown' | null

export default function SettingsShell({
    children,
    slug,
}: {
    children: React.ReactNode
    slug: string
}) {
    const pathname = usePathname()
    const router = useRouter()

    const activeId = (TABS.find((t) => pathname.match(new RegExp(`/settings/${t.id}(/|$)`)))?.id ?? 'general') as TabId
    const activeLabel = TABS.find((t) => t.id === activeId)?.label ?? 'General'

    const [user, setUser] = useState<{ name: string; email: string; avatarUrl?: string } | null>(null)
    const [store, setStore] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<ErrorType>(null)

    // ── Wizard state ──────────────────────────────────────────────────────────
    const [wizardOpen, setWizardOpen] = useState(false)

    // ── Mobile nav state ──────────────────────────────────────────────────────
    const [mobileNavOpen, setMobileNavOpen] = useState(false)

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`/api/store/${slug}`)
                if (res.status === 401) { setError('unauthenticated'); return }
                if (res.status === 403 || res.status === 404) { setError('forbidden'); return }
                if (!res.ok) { setError('unknown'); return }

                const data = await res.json()
                setStore(data)
                setUser({
                    name: data.user?.name ?? 'Account',
                    email: data.user?.email ?? '',
                    avatarUrl: data.user?.avatar_url ?? undefined,
                })
            } catch (e) {
                console.error('[SettingsShell]', e)
                setError('unknown')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [slug])

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-background">
            <div className="w-5 h-5 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
        </div>
    )

    // ── Error ─────────────────────────────────────────────────────────────────
    if (error || !store) return (
        <div className="h-screen flex flex-col items-center justify-center gap-2 text-center px-6">
            <p className="text-[15px] font-medium text-foreground">
                {error === 'unauthenticated' && 'You need to be signed in.'}
                {error === 'forbidden' && "You don't have access to this store."}
                {error === 'unknown' && 'Something went wrong loading your store.'}
                {!error && 'Store not found.'}
            </p>
            <p className="text-sm text-muted-foreground">
                {error === 'unauthenticated'
                    ? <a href="/auth/login" className="underline underline-offset-4">Sign in</a>
                    : <a href="/auth/logout" className="underline underline-offset-4">Sign out and try again</a>
                }
            </p>
        </div>
    )

    // ── Derived props ─────────────────────────────────────────────────────────
    const navUser = {
        name: user?.name ?? '…',
        email: user?.email ?? '',
        avatarUrl: user?.avatarUrl,
        accountHref: '/account',
        onSignOut: () => { window.location.href = '/auth/logout' },
    }

    const navStore = {
        name: store.name,
        slug: store.slug,
        logoUrl: store.logo_url,
    }

    const navigate = (id: TabId) => router.push(`${process.env.NODE_ENV === 'development' ? `http://localhost:3000/store/${slug}` : `https://${slug}.menengai.cloud`}/settings/${id}`)

    // ── Shell ─────────────────────────────────────────────────────────────────
    return (
        <SidebarProvider
            defaultOpen={false}
            style={{
                display: 'contents',
                '--sidebar-width': '15rem',
                '--sidebar-background': 'hsl(var(--background))',
                '--sidebar-foreground': 'hsl(var(--foreground))',
                '--sidebar-border': 'hsl(var(--border))',
                '--sidebar-accent': 'hsl(var(--accent))',
                '--sidebar-accent-foreground': 'hsl(var(--accent-foreground))',
            } as React.CSSProperties}
        >
            <div data-settings-shell className="h-screen overflow-hidden flex bg-background">

                {/* Desktop sidebar */}
                <SettingsNav
                    activeTab={activeId}
                    onSelect={navigate}
                    TABS={TABS}
                    user={navUser}
                    store={navStore}
                    allStores={store.allStores}
                />

                {/* Mobile drawer — open/onClose owned here, triggered by hamburger in SettingsHeader */}
                <MobileSettingsNav
                    activeTab={activeId}
                    onSelect={navigate}
                    TABS={TABS}
                    user={navUser}
                    store={navStore}
                    allStores={store.allStores}
                    open={mobileNavOpen}
                    onClose={() => setMobileNavOpen(false)}
                />

                {/* Main content */}
                <div className="flex flex-col flex-1 min-w-0 min-h-0">
                    <SettingsHeader
                        store={navStore}
                        activeLabel={activeLabel}
                        wizardStore={store}
                        onOpenWizard={() => setWizardOpen(true)}
                        onOpenMobileNav={() => setMobileNavOpen(true)}
                    />
                    <main className="flex-1 overflow-y-auto px-6 md:px-10 py-8">
                        {children}
                    </main>
                </div>
            </div>

            <GettingStartedDrawer
                open={wizardOpen}
                onClose={() => setWizardOpen(false)}
                store={store}
                onNavigate={navigate}
            />
        </SidebarProvider>
    )
}