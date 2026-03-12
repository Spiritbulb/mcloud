'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Store, Palette, Globe, Link2, CreditCard, Bell, Package, ShoppingBag } from 'lucide-react'
import { SettingsHeader } from './settings-header'
import { SettingsNav, MobileSettingsNav } from './settings-nav'

export const TABS = [
    { id: 'general', label: 'General', icon: <Store className="w-[15px] h-[15px]" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-[15px] h-[15px]" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-[15px] h-[15px]" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingBag className="w-[15px] h-[15px]" /> },
    { id: 'domain', label: 'Domain', icon: <Globe className="w-[15px] h-[15px]" />, pro: true },
    { id: 'social', label: 'Social', icon: <Link2 className="w-[15px] h-[15px]" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-[15px] h-[15px]" />, pro: true },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-[15px] h-[15px]" />, pro: true },
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

    const activeId = (TABS.find((t) => pathname.endsWith(`/settings/${t.id}`))?.id ?? 'general') as TabId
    const activeLabel = TABS.find((t) => t.id === activeId)?.label ?? 'General'

    const [user, setUser] = useState<{ name: string; email: string; avatarUrl?: string } | null>(null)
    const [store, setStore] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<ErrorType>(null)

    useEffect(() => {
        async function load() {
            try {
                const storeRes = await fetch(`/api/store/${slug}`)
                if (storeRes.status === 401) { setError('unauthenticated'); return }
                if (storeRes.status === 403 || storeRes.status === 404) { setError('forbidden'); return }
                if (!storeRes.ok) { setError('unknown'); return }

                const data = await storeRes.json()
                setStore(data)
                setUser({
                    name: data.owner_name ?? data.name ?? 'Account',
                    email: data.owner_email ?? '',
                    avatarUrl: data.owner_avatar ?? undefined,
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

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-background">
            <div className="w-6 h-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
        </div>
    )

    if (error || !store) return (
        <div className="h-screen flex items-center justify-center flex-col gap-3">
            <p className="text-foreground font-medium">
                {error === 'unauthenticated' && 'You need to be signed in to view this page.'}
                {error === 'forbidden' && 'You don\'t have access to this store.'}
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

    const handleSignOut = () => { window.location.href = '/auth/logout' }
    const navUser = user
        ? { ...user, accountHref: '/account', onSignOut: handleSignOut }
        : { name: '…', email: '', accountHref: '/account', onSignOut: handleSignOut }
    const navigate = (id: TabId) => router.push(`/settings/${id}`)

    return (
        <SidebarProvider
            defaultOpen={false}
            style={{
                display: 'contents',
                '--sidebar-background': 'var(--background)',
                '--sidebar-foreground': 'var(--foreground)',
                '--sidebar-border': 'var(--border)',
                '--sidebar-width': '16rem',
            } as React.CSSProperties}
        >
            <div data-settings-shell className="h-screen overflow-hidden flex flex-col bg-background">
                <SettingsHeader store={store} activeLabel={activeLabel} />
                <div className="flex flex-1 min-h-0">
                    <SettingsNav activeTab={activeId} onSelect={navigate} TABS={TABS} user={navUser} />
                    <MobileSettingsNav activeTab={activeId} onSelect={navigate} TABS={TABS} user={navUser} />
                    <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
                        <div className="flex items-center px-4 md:px-12 py-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b border-light mb-8">
                            <h1 className="text-[22px] font-semibold text-foreground tracking-tight">
                                {activeLabel}
                            </h1>
                        </div>
                        <div className="px-4 md:px-12 pb-16 space-y-4">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}
