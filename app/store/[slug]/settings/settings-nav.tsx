'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import '@material/web/menu/menu.js'
import '@material/web/menu/menu-item.js'
import '@material/web/divider/divider.js'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { TabId } from './settings-shell'
import { usePathname, useRouter } from 'next/navigation'
import { Store } from '@/src/themes/types'

// ─── Material Web JSX declarations ───────────────────────────────────────────

declare global {
    namespace JSX {
        interface IntrinsicElements {
            'md-menu': React.HTMLAttributes<HTMLElement> & {
                anchor?: string
                open?: boolean
                positioning?: string
                'anchor-corner'?: string
                'menu-corner'?: string
            }
            'md-menu-item': React.HTMLAttributes<HTMLElement> & {
                href?: string
                target?: string
            }
            'md-divider': React.HTMLAttributes<HTMLElement>
        }
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SubTab = { readonly id: string; readonly label: string }

type Tab = {
    readonly id: string
    readonly label: string
    readonly icon: string           // Material Symbols name e.g. "home"
    readonly beta?: boolean
    readonly subTabs?: readonly SubTab[]
}

type NavSection = {
    readonly id: string
    readonly label: string          // e.g. "STORE", "ACCOUNTING", "SYSTEM"
    readonly tabs: readonly Tab[]
}

type NavUser = {
    name: string
    email: string
    avatarUrl?: string
    accountHref?: string
    onSignOut?: () => void
}

type NavStore = {
    name: string
    slug: string
    logo_url?: string
    role?: string
    custom_domain?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── CollapseToggle ───────────────────────────────────────────────────────────

function CollapseToggle({
    label,
    collapsed,
    onToggle,
    railMode,
}: {
    label: string
    collapsed: boolean
    onToggle: () => void
    railMode: boolean
}) {
    if (railMode) {
        // In rail mode just render a divider between sections
        return <div className="mx-2 my-1 h-px bg-[--md-sys-color-outline-variant]" />
    }

    return (
        <button
            onClick={onToggle}
            className="flex items-center justify-between w-full px-3 py-1.5 group"
        >
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[--md-sys-color-on-surface-variant] opacity-60">
                {label}
            </span>
            <span className={cn(
                'material-symbols-outlined text-[14px] text-[--md-sys-color-on-surface-variant] opacity-40',
                'transition-transform duration-150',
                collapsed && '-rotate-90'
            )}>
                remove
            </span>
        </button>
    )
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
    tab,
    activeTab,
    activeSubTab,
    onSelect,
    onSelectSubTab,
    slug,
    railMode,
}: {
    tab: Tab
    activeTab: string
    activeSubTab: string
    onSelect: (id: TabId) => void
    onSelectSubTab: (id: string) => void
    slug: string
    railMode: boolean
}) {
    const router = useRouter()
    const basePath = process.env.NODE_ENV === 'development'
        ? `/store/${slug}/settings`
        : `/settings`

    const hasSubTabs = !!tab.subTabs?.filter(s => s.id && s.label).length
    const isActive = activeTab === tab.id
    const [open, setOpen] = useState(isActive && hasSubTabs)

    const handleClick = () => {
        if (tab.id === 'home') {
            router.push(
                process.env.NODE_ENV === 'development'
                    ? `/store/${slug}/settings`
                    : `/settings`
            )
        } else if (hasSubTabs) {
            setOpen(v => !v)
        } else {
            onSelect(tab.id as TabId)
        }
    }

    return (
        <li className="list-none">
            <button
                onClick={handleClick}
                title={railMode ? tab.label : undefined}
                className={cn(
                    'flex items-center gap-2.5 w-full transition-colors duration-100 rounded-md',
                    // Sizing — full row in expanded, icon-only in rail
                    railMode
                        ? 'justify-center w-10 h-10 mx-auto'
                        : 'h-8 px-3',
                    // Active state — filled green pill
                    isActive && !hasSubTabs
                        ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] font-medium'
                        : isActive && hasSubTabs
                            ? 'text-[hsl(var(--brand))] font-medium hover:bg-[hsl(var(--muted-foreground))]'
                            : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background))] hover:text-[--md-sys-color-on-surface]'
                )}
            >
                <span className={cn(
                    'material-symbols-outlined shrink-0',
                    railMode ? 'text-[20px]' : 'text-[18px]',
                    isActive
                        ? 'text-[hsl(var(--brand))]'
                        : 'text-[hsl(var(--foreground))]'
                )}>
                    {tab.icon}
                </span>

                {!railMode && (
                    <>
                        <span className="flex-1 text-left text-[13px] truncate">{tab.label}</span>
                        {tab.beta && (
                            <span className={cn(
                                'nav-badge',
                                isActive ? 'nav-badge-active' : 'nav-badge-default'
                            )}>
                                NEW
                            </span>
                        )}
                        {hasSubTabs && (
                            <span className={cn(
                                'material-symbols-outlined text-[16px] shrink-0 transition-transform duration-150',
                                isActive ? 'text-[--md-sys-color-primary]' : 'text-[--md-sys-color-on-surface-variant]',
                                open && 'rotate-180'
                            )}>
                                expand_more
                            </span>
                        )}
                    </>
                )}
            </button>

            {/* Subtabs — only in expanded mode */}
            {hasSubTabs && open && !railMode && (
                <ul className="mt-0.5 ml-3 pl-2.5 space-y-0.5 list-none">
                    {tab.subTabs!.filter(s => s.id && s.label).map((sub) => {
                        const isSubActive = activeSubTab === sub.id
                        return (
                            <li key={sub.id}>
                                <button
                                    onClick={() => {
                                        router.push(`${basePath}/${tab.id}/${sub.id}`)
                                        onSelectSubTab(sub.id)
                                    }}
                                    className={cn(
                                        'flex items-center w-full h-7 px-2 rounded-md text-[12px] transition-colors duration-100',
                                        isSubActive
                                            ? 'bg-[--md-sys-color-primary-container] text-[--md-sys-color-on-primary-container] font-medium'
                                            : 'text-[--md-sys-color-on-surface-variant] hover:bg-[--md-sys-color-surface-variant] hover:text-[--md-sys-color-on-surface]'
                                    )}
                                >
                                    {sub.label}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </li>
    )
}

// ─── NavSection ───────────────────────────────────────────────────────────────

function NavSectionGroup({
    section,
    activeTab,
    activeSubTab,
    onSelect,
    onSelectSubTab,
    slug,
    railMode,
}: {
    section: NavSection
    activeTab: string
    activeSubTab: string
    onSelect: (id: TabId) => void
    onSelectSubTab: (id: string) => void
    slug: string
    railMode: boolean
}) {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <div className="mb-1">
            <CollapseToggle
                label={section.label}
                collapsed={collapsed}
                onToggle={() => setCollapsed(v => !v)}
                railMode={railMode}
            />
            {!collapsed && (
                <ul className={cn('space-y-0.5 list-none p-0', !railMode && 'px-1')}>
                    {section.tabs.map((tab) => (
                        <NavItem
                            key={tab.id}
                            tab={tab}
                            activeTab={activeTab}
                            activeSubTab={activeSubTab}
                            onSelect={onSelect}
                            onSelectSubTab={onSelectSubTab}
                            slug={slug}
                            railMode={railMode}
                        />
                    ))}
                </ul>
            )}
        </div>
    )
}

// ─── StoreSwitcher ────────────────────────────────────────────────────────────

function StoreSwitcher({
    store,
    allStores,
    railMode,
}: {
    store: NavStore
    allStores: NavStore[]
    railMode: boolean
}) {
    const anchorId = 'store-switcher-anchor'
    const [open, setOpen] = useState(false)
    const hasMultiple = allStores.length > 1

    if (railMode) {
        return (
            <div className="flex justify-center py-2">
                <button
                    id={anchorId}
                    onClick={() => hasMultiple && setOpen(v => !v)}
                    title={store.name}
                    className="store-avatar-fallback flex w-8 h-8 items-center justify-center rounded-md text-[11px] font-bold overflow-hidden"
                >
                    {store.logo_url
                        ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                        : getInitials(store.name)
                    }
                </button>
                {hasMultiple && renderMenu()}
            </div>
        )
    }

    function renderMenu() {
        return (
            // @ts-ignore
            <md-menu
                anchor={anchorId}
                open={open || undefined}
                positioning="popover"
                anchor-corner="end-start"
                menu-corner="start-start"
                onClosed={() => setOpen(false)}
                style={{ '--md-menu-container-color': 'var(--md-sys-color-surface)', minWidth: '240px' }}
            >
                <div className="px-3 py-2">
                    <p className="text-[11px] font-semibold text-[--md-sys-color-on-surface-variant] uppercase tracking-wider">
                        Your stores
                    </p>
                </div>
                {/* @ts-ignore */}
                <md-divider />
                {allStores.map((s) => (
                    // @ts-ignore
                    <md-menu-item
                        key={s.slug}
                        href={`https://${s.slug}.menengai.cloud/settings`}
                        onClick={() => setOpen(false)}
                    >
                        <div slot="start" className="store-avatar-fallback flex w-5 h-5 items-center justify-center rounded text-[10px] font-bold overflow-hidden">
                            {s.logo_url
                                ? <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover rounded" />
                                : getInitials(s.name)
                            }
                        </div>
                        <div slot="headline" className="flex items-center gap-2">
                            <span className="text-[13px] font-medium">{s.name}</span>
                            {s.slug === store.slug && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[--md-sys-color-primary]" />
                            )}
                        </div>
                        <span slot="supporting-text" className="capitalize text-[11px]">{s.role}</span>
                        {/* @ts-ignore */}
                    </md-menu-item>
                ))}
                {/* @ts-ignore */}
            </md-menu>
        )
    }

    return (
        <div className="relative px-1 py-2.5">
            <button
                id={anchorId}
                onClick={() => hasMultiple && setOpen(v => !v)}
                className={cn(
                    'flex items-center gap-2 w-full rounded-md px-2 py-1.5 transition-colors duration-100 bg-[hsl(var(--background))]',
                    hasMultiple && 'hover:bg-[--md-sys-color-surface-variant] cursor-pointer'
                )}
            >
                <div className="flex w-8 h-8 shrink-0 items-center justify-center rounded text-[10px] font-bold overflow-hidden">
                    {store.logo_url
                        ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                        : getInitials(store.name)
                    }
                </div>
                <div className="flex flex-col min-w-0 flex-1 text-left">
                    <span className="text-[12px] font-semibold text-[--md-sys-color-on-surface] truncate leading-tight">
                        {store.name}
                    </span>
                    <span className="text-[10px] text-[--md-sys-color-on-surface-variant] truncate leading-tight">
                        {store.custom_domain ? `www.${store.custom_domain}` : `${store.slug}.menengai.cloud`}
                    </span>
                </div>
                {hasMultiple && (
                    <span className="material-symbols-outlined text-[16px] text-[--md-sys-color-on-surface-variant]">
                        unfold_more
                    </span>
                )}
            </button>
            {hasMultiple && renderMenu()}
        </div>
    )
}

// ─── UtilityItems ─────────────────────────────────────────────────────────────
// Notifications + Support — pinned above user footer

function UtilityItems({
    railMode,
    notificationCount = 0,
    store
}: {
    railMode: boolean
    notificationCount?: number
    store: NavStore
}) {
    const items = [
        { icon: 'notifications', label: 'Notifications', badge: notificationCount, href: `/store/${store.slug}/settings/notifications` },
        { icon: 'help_outline', label: 'Support', href: `/support` },
    ]
    const router = useRouter();

    return (
        <ul className={cn('space-y-0.5 list-none p-0 mb-2', !railMode && 'px-1')}>
            {items.map((item) => (
                <li key={item.label}>
                    <button
                        onClick={() => router.push(item.href)}
                        title={railMode ? item.label : undefined}
                        className={cn(
                            'flex items-center gap-2.5 w-full rounded-md transition-colors duration-100',
                            'text-[--md-sys-color-on-surface-variant] hover:bg-[--md-sys-color-surface-variant] hover:text-[--md-sys-color-on-surface]',
                            railMode
                                ? 'justify-center w-10 h-10 mx-auto relative'
                                : 'h-8 px-3'
                        )}
                    >
                        <span className="material-symbols-outlined text-[18px] shrink-0 relative">
                            {item.icon}
                            {item.badge != null && item.badge > 0 && (
                                <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-[--md-sys-color-error] text-[--md-sys-color-on-error] text-[9px] font-bold leading-none">
                                    {item.badge > 9 ? '9+' : item.badge}
                                </span>
                            )}
                        </span>
                        {!railMode && (
                            <>
                                <span className="flex-1 text-left text-[13px]">{item.label}</span>
                                {item.badge != null && item.badge > 0 && (
                                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[--md-sys-color-error] text-[--md-sys-color-on-error] text-[10px] font-bold">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                            </>
                        )}
                    </button>
                </li>
            ))}
        </ul>
    )
}

// ─── AccountFooter ────────────────────────────────────────────────────────────

function AccountFooter({ user, railMode }: { user: NavUser; railMode: boolean }) {
    const anchorId = 'account-footer-anchor'
    const [open, setOpen] = useState(false)

    const menuItems = [
        ...(user.accountHref ? [{ href: user.accountHref, icon: 'manage_accounts', label: 'Account settings' }] : []),
        { href: '#billing', icon: 'credit_card', label: 'Billing' },
        { href: '#misc', icon: 'tune', label: 'Misc' },
    ]

    return (
        <div className="relative px-2 py-2.5">
            <button
                id={anchorId}
                onClick={() => setOpen(v => !v)}
                title={railMode ? user.name : undefined}
                className={cn(
                    'flex items-center gap-2.5 rounded-md transition-colors duration-100 outline-none',
                    'hover:bg-[--md-sys-color-surface-variant]',
                    railMode
                        ? 'justify-center w-10 h-10 mx-auto'
                        : 'w-full px-2 py-1.5'
                )}
            >
                <div className="store-avatar-fallback w-7 h-7 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                    {user.avatarUrl
                        ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                        : getInitials(user.name)
                    }
                </div>
                {!railMode && (
                    <>
                        <div className="flex flex-col min-w-0 flex-1 text-left">
                            <span className="text-[12px] font-medium text-[--md-sys-color-on-surface] truncate leading-tight">
                                {user.name}
                            </span>
                            <span className="text-[11px] text-[--md-sys-color-on-surface-variant] truncate leading-tight">
                                {user.email}
                            </span>
                        </div>
                        <span className={cn(
                            'material-symbols-outlined text-[18px] text-[--md-sys-color-on-surface-variant] transition-transform duration-150',
                            open && 'rotate-180'
                        )}>
                            expand_more
                        </span>
                    </>
                )}
            </button>

            {/* @ts-ignore */}
            <md-menu
                anchor={anchorId}
                open={open || undefined}
                positioning="popover"
                anchor-corner="start-start"
                menu-corner="end-start"
                onClosed={() => setOpen(false)}
                style={{ '--md-menu-container-color': 'var(--md-sys-color-surface)', minWidth: '216px' }}
            >
                <div className="flex items-center gap-2.5 px-3 py-2">
                    <div className="store-avatar-fallback w-7 h-7 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                        {user.avatarUrl
                            ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-md" />
                            : getInitials(user.name)
                        }
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-medium text-[--md-sys-color-on-surface] truncate">{user.name}</span>
                        <span className="text-[11px] text-[--md-sys-color-on-surface-variant] truncate">{user.email}</span>
                    </div>
                </div>
                {/* @ts-ignore */}
                <md-divider />
                {menuItems.map((item) => (
                    // @ts-ignore
                    <md-menu-item key={item.label} href={item.href} onClick={() => setOpen(false)}>
                        <span slot="start" className="material-symbols-outlined text-[18px] text-[--md-sys-color-on-surface-variant]">
                            {item.icon}
                        </span>
                        <span slot="headline">{item.label}</span>
                        {/* @ts-ignore */}
                    </md-menu-item>
                ))}
                {user.onSignOut && (
                    <>
                        {/* @ts-ignore */}
                        <md-divider />
                        {/* @ts-ignore */}
                        <md-menu-item
                            onClick={() => { setOpen(false); user.onSignOut?.() }}
                            style={{ '--md-menu-item-label-text-color': 'var(--md-sys-color-error)' }}
                        >
                            <span slot="start" className="material-symbols-outlined text-[18px] text-[--md-sys-color-error]">
                                logout
                            </span>
                            <span slot="headline">Sign out</span>
                            {/* @ts-ignore */}
                        </md-menu-item>
                    </>
                )}
                {/* @ts-ignore */}
            </md-menu>
        </div>
    )
}

// ─── RailToggle ───────────────────────────────────────────────────────────────

function RailToggle({ railMode, onToggle }: { railMode: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            title={railMode ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-md text-[--md-sys-color-on-surface-variant] hover:bg-[--md-sys-color-surface-variant] transition-colors"
        >
            <span className="material-symbols-outlined text-[18px]">
                {railMode ? 'menu_open' : 'menu'}
            </span>
        </button>
    )
}

// ─── SidebarShell ─────────────────────────────────────────────────────────────

function SidebarShell({
    railMode,
    onToggleRail,
    store,
    allStores,
    user,
    activeTab,
    activeSubTab,
    onSelect,
    onSelectSubTab,
    SECTIONS,
    notificationCount,
}: {
    railMode: boolean
    onToggleRail: () => void
    store: NavStore
    allStores: NavStore[]
    user: NavUser
    activeTab: string
    activeSubTab: string
    onSelect: (id: TabId) => void
    onSelectSubTab: (id: string) => void
    SECTIONS: readonly NavSection[]
    notificationCount?: number
}) {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const src = !mounted || resolvedTheme === 'light' ? '/logo-dark.svg' : '/logo-light.svg'

    return (
        <aside className={cn(
            'flex flex-col h-[90vh] md:h-[98vh] my-auto ml-2 rounded-md',
            'bg-brand-container dark:bg-brand-container/1',
            'transition-all duration-200 ease-out',
            railMode ? 'w-[56px]' : 'w-[220px]'
        )}>
            {/* Logo + rail toggle */}
            <div className={cn(
                'flex items-center',
                railMode ? 'justify-center py-3 px-2' : 'justify-between px-4 py-3'
            )}>
                {!railMode && (
                    <div className="flex items-center gap-2 min-w-0">
                        {/* Menengai Cloud logo mark */}
                        <Link href="/" className="flex items-center shrink-0">
                            <img src={src} alt="Logo" className="w-auto h-5" />
                        </Link>
                    </div>
                )}
                <div className='flex items-center'>
                    <RailToggle railMode={railMode} onToggle={onToggleRail} />
                </div>
            </div>

            {/* Store switcher */}
            <StoreSwitcher store={store} allStores={allStores} railMode={railMode} />

            {/* Nav sections — scrollable */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
                {SECTIONS.map((section) => (
                    <NavSectionGroup
                        key={section.id}
                        section={section}
                        activeTab={activeTab}
                        activeSubTab={activeSubTab}
                        onSelect={onSelect}
                        onSelectSubTab={onSelectSubTab}
                        slug={store.slug}
                        railMode={railMode}
                    />
                ))}
            </nav>

            {/* Utility items */}
            <UtilityItems railMode={railMode} notificationCount={notificationCount} store={store} />

            {/* User footer */}
            <AccountFooter user={user} railMode={railMode} />
        </aside>
    )
}

// ─── SettingsNav (desktop) ────────────────────────────────────────────────────

export function SettingsNav({
    activeTab,
    activeSubTab,
    onSelect,
    onSelectSubTab,
    SECTIONS,
    user,
    store,
    allStores,
    notificationCount,
}: {
    activeTab: string
    activeSubTab: string
    onSelect: (id: TabId) => void
    onSelectSubTab: (id: string) => void
    SECTIONS: readonly NavSection[]
    user: NavUser
    store: NavStore
    allStores: NavStore[]
    notificationCount?: number
}) {
    const [railMode, setRailMode] = useState(false)

    return (
        <div className="hidden md:flex">
            <SidebarShell
                railMode={railMode}
                onToggleRail={() => setRailMode(v => !v)}
                store={store}
                allStores={allStores}
                user={user}
                activeTab={activeTab}
                activeSubTab={activeSubTab}
                onSelect={onSelect}
                onSelectSubTab={onSelectSubTab}
                SECTIONS={SECTIONS}
                notificationCount={notificationCount}
            />
        </div>
    )
}

// ─── MobileSettingsNav ────────────────────────────────────────────────────────

export function MobileSettingsNav({
    activeTab,
    activeSubTab,
    onSelect,
    onSelectSubTab,
    SECTIONS,
    user,
    store,
    allStores,
    open,
    onClose,
    notificationCount,
}: {
    activeTab: string
    activeSubTab: string
    onSelect: (id: TabId) => void
    onSelectSubTab: (id: string) => void
    SECTIONS: readonly NavSection[]
    user: NavUser
    store: NavStore
    allStores: NavStore[]
    open: boolean
    onClose: () => void
    notificationCount?: number
}) {
    const handleSelect = (id: TabId) => { onSelect(id); onClose() }
    const handleSubSelect = (id: string) => { onSelectSubTab(id); onClose() }
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Gesture state
    const touchStartX = useRef<number | null>(null)
    const touchStartY = useRef<number | null>(null)
    const dragging = useRef(false)
    const [dragX, setDragX] = useState(0)

    useEffect(() => setMounted(true), [])

    // ── Swipe-to-open: listen on document when closed ──────────────────────────
    useEffect(() => {
        if (open) return // panel handles swipe-to-close internally

        const EDGE_THRESHOLD = 20   // px from left edge to start listening
        const OPEN_THRESHOLD = 60  // px of horizontal drag to trigger open

        const onTouchStart = (e: TouchEvent) => {
            const t = e.touches[0]
            if (t.clientX > EDGE_THRESHOLD) return
            touchStartX.current = t.clientX
            touchStartY.current = t.clientY
            dragging.current = true
            setDragX(0)
        }

        const onTouchMove = (e: TouchEvent) => {
            if (!dragging.current || touchStartX.current === null) return
            const t = e.touches[0]
            const dx = t.clientX - touchStartX.current
            const dy = Math.abs(t.clientY - (touchStartY.current ?? 0))
            // Abort if more vertical than horizontal
            if (dy > Math.abs(dx)) { dragging.current = false; setDragX(0); return }
            if (dx < 0) return
            setDragX(Math.min(dx, 240)) // cap at panel width
        }

        const onTouchEnd = (e: TouchEvent) => {
            if (!dragging.current) return
            const t = e.changedTouches[0]
            const dx = t.clientX - (touchStartX.current ?? 0)
            dragging.current = false
            setDragX(0)
            touchStartX.current = null
            touchStartY.current = null
            if (dx >= OPEN_THRESHOLD) {
                // Trigger open via parent — we call the same onSelect approach
                // but here we just signal open. Parent should expose an onOpen prop,
                // so we fire a custom event the parent can listen to, OR you pass
                // an `onOpen` prop (see note below).
                window.dispatchEvent(new CustomEvent('mobile-nav-open'))
            }
        }

        document.addEventListener('touchstart', onTouchStart, { passive: true })
        document.addEventListener('touchmove', onTouchMove, { passive: true })
        document.addEventListener('touchend', onTouchEnd, { passive: true })
        return () => {
            document.removeEventListener('touchstart', onTouchStart)
            document.removeEventListener('touchmove', onTouchMove)
            document.removeEventListener('touchend', onTouchEnd)
        }
    }, [open])

    // ── Swipe-to-close: track drag while open ─────────────────────────────────
    const CLOSE_THRESHOLD = 60

    const handlePanelTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
        dragging.current = true
    }

    const handlePanelTouchMove = (e: React.TouchEvent) => {
        if (!dragging.current || touchStartX.current === null) return
        const dx = e.touches[0].clientX - touchStartX.current
        const dy = Math.abs(e.touches[0].clientY - (touchStartY.current ?? 0))
        if (dy > Math.abs(dx)) { dragging.current = false; setDragX(0); return }
        setDragX(Math.min(0, dx)) // only track leftward drag when open
    }

    const handlePanelTouchEnd = (e: React.TouchEvent) => {
        if (!dragging.current) return
        const dx = e.changedTouches[0].clientX - (touchStartX.current ?? 0)
        dragging.current = false
        setDragX(0)
        touchStartX.current = null
        touchStartY.current = null
        if (dx <= -CLOSE_THRESHOLD) onClose()
    }

    const src = !mounted || resolvedTheme === 'light' ? '/logo-dark.svg' : '/logo-light.svg'

    // Panel translate: normal open/close + live drag offset
    const panelTranslate = open
        ? `translateX(${dragX}px)`           // open + possible swipe-to-close drag
        : dragX > 0
            ? `translateX(calc(-100% + ${dragX}px))`  // closed + swipe-to-open drag preview
            : undefined

    return (
        <>
            {/* Backdrop — only in DOM when open, pointer-events off so it takes no space when absent */}
            {open && (
                <div
                    className="md:hidden fixed inset-0 z-40"
                    onClick={onClose}
                />
            )}

            <div
                className={cn(
                    // Key change: `fixed` + fully off-screen when closed — zero layout impact
                    'md:hidden fixed inset-y-0 left-0 z-50 flex flex-col h-[80vh] w-[240px] my-auto ml-2 rounded-lg',
                    'bg-[hsl(var(--brand-container))] dark:bg-[#18191d] shadow-xl',
                    // Disable CSS transition while user is actively dragging for immediate feedback
                    dragging.current ? '' : 'transition-transform duration-200 ease-out',
                    open ? 'translate-x-0' : '-translate-x-[calc(100%+0.5rem)]', // +ml-2 so it fully exits
                )}
                style={panelTranslate ? { transform: panelTranslate } : undefined}
                onTouchStart={handlePanelTouchStart}
                onTouchMove={handlePanelTouchMove}
                onTouchEnd={handlePanelTouchEnd}
            >
                {/* Header with close */}
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center shrink-0">
                            <img src={src} alt="Logo" className="w-auto h-5" />
                        </Link>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close navigation"
                        className="p-1.5 rounded-full hover:bg-[--md-sys-color-surface-variant] transition-colors text-[--md-sys-color-on-surface-variant]"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <StoreSwitcher store={store} allStores={allStores} railMode={false} />

                <nav className="flex-1 overflow-y-auto py-2">
                    {SECTIONS.map((section) => (
                        <NavSectionGroup
                            key={section.id}
                            section={section}
                            activeTab={activeTab}
                            activeSubTab={activeSubTab}
                            onSelect={handleSelect}
                            onSelectSubTab={handleSubSelect}
                            slug={store.slug}
                            railMode={false}
                        />
                    ))}
                </nav>

                <UtilityItems railMode={false} notificationCount={notificationCount} store={store} />
                <AccountFooter user={user} railMode={false} />
            </div>
        </>
    )
}

// ─── Re-export NavSection type for use in settings-shell ─────────────────────
export type { NavSection, NavStore, NavUser, Tab, SubTab }