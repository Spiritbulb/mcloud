'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/client'
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
    slug: any
}) {
    const pathname = usePathname()
    const router = useRouter()

    const activeId = (TABS.find((t) => pathname.endsWith(`/settings/${t.id}`))?.id ?? 'general') as TabId
    const activeLabel = TABS.find((t) => t.id === activeId)?.label ?? 'General'

    const [user, setUser] = useState<{ name: string; email: string; avatarUrl?: string } | null>(null)
    const [store, setStore] = useState<any>(null)

    useEffect(() => {
        const supabase = createClient()

        supabase.auth.getUser().then(({ data }) => {
            if (!data.user) {
                window.location.href = `https://menengai.cloud/auth/login?redirect=${encodeURIComponent(window.location.href)}`
                return
            }
            const meta = data.user.user_metadata ?? {}
            setUser({
                name: meta.full_name ?? meta.name ?? data.user.email?.split('@')[0] ?? 'Account',
                email: data.user.email ?? '',
                avatarUrl: meta.avatar_url ?? meta.picture ?? undefined,
            })
        })

        supabase
            .from('stores')
            .select('*, theme:store_themes(*)')
            .eq('slug', slug)
            .single()
            .then(({ data }) => setStore(data))
    }, [slug])

    if (!store) return null

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = '/auth/login'
    }

    const navUser = user
        ? { ...user, accountHref: '/account', onSignOut: handleSignOut }
        : { name: '…', email: '', accountHref: '/account', onSignOut: handleSignOut }

    const navigate = (id: TabId) => router.push(`/store/${store.slug}/settings/${id}`)

    return (
        /*
         * SidebarProvider must be the outermost element so useSidebar() works
         * in SettingsHeader (for the mobile menu toggle). But its default styles
         * (display:flex, height:100%) fight our scroll containment, so we
         * override them inline to make it a transparent wrapper.
         */
        <SidebarProvider
            defaultOpen={false}
            style={{
                display: 'contents',          // ← renders no box of its own
                '--sidebar-background': 'var(--background)',
                '--sidebar-foreground': 'var(--foreground)',
                '--sidebar-border': 'var(--border)',
                '--sidebar-width': '16rem',
            } as React.CSSProperties}
        >
            {/*
             * THIS is the true viewport container.
             * h-screen + overflow-hidden = hard ceiling at 100vh.
             * flex-col so header + body stack vertically.
             */}
            <div data-settings-shell className="h-screen overflow-hidden flex flex-col bg-background">

                <SettingsHeader store={store} activeLabel={activeLabel} />

                {/*
                 * flex-1 = take all remaining height after the header.
                 * min-h-0 = critical. Without this, a flex child's min-height
                 * is `auto`, which lets it grow beyond the parent — causing the
                 * sidebar to scroll away with the content.
                 */}
                <div className="flex flex-1 min-h-0 ">

                    {/* Sidebar: h-full, scrolls only its own overflow */}
                    <SettingsNav activeTab={activeId} onSelect={navigate} TABS={TABS} user={navUser} />
                    <MobileSettingsNav activeTab={activeId} onSelect={navigate} TABS={TABS} user={navUser} />

                    {/*
                     * THE ONLY ELEMENT THAT SCROLLS.
                     * min-h-0 again — same reason as the row above.
                     * overflow-y-auto confines scrolling to this pane only.
                     */}
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