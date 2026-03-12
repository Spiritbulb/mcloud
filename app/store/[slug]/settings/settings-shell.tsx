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

    useEffect(() => {
        async function load() {
            try {
                const profileRes = await fetch('/auth/profile')
                if (!profileRes.ok) {
                    window.location.href = `/auth/login`
                    return
                }
                const profile = await profileRes.json()

                setUser({
                    name: profile.name ?? profile.email?.split('@')[0] ?? 'Account',
                    email: profile.email ?? '',
                    avatarUrl: profile.picture ?? undefined,
                })

                // ✅ No x-user-sub header — API gets identity from session cookie
                const storeRes = await fetch(`/api/store/${slug}`)

                if (storeRes.status === 401) {
                    window.location.href = `/auth/login`
                    return
                }
                if (storeRes.status === 403 || storeRes.status === 404) {
                    window.location.href = '/'
                    return
                }
                if (storeRes.ok) {
                    setStore(await storeRes.json())
                }
            } catch (e) {
                console.error('[SettingsShell]', e)
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

    if (!store) return null

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
