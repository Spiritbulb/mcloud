'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { TabId } from './settings-shell'
import { useRouter } from 'next/navigation'


// ─── Types ────────────────────────────────────────────────────────────────────

type SubTab = { readonly id: string; readonly label: string }

type Tab = {
    readonly id: string
    readonly label: string
    readonly icon: string
    readonly beta?: boolean
    readonly pro?: boolean
    readonly subTabs?: readonly SubTab[]
}

type NavSection = {
    readonly id: string
    readonly label: string
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
    is_pro?: boolean
    org_slug?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function settingsPath(orgSlug: string, storeSlug: string, ...segments: string[]) {
    const base = `/org/${orgSlug}/${storeSlug}/settings`
    
    return segments.length ? `${base}/${segments.join('/')}` : base
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
        return <div className="mx-2 my-1 h-px bg-[var(--md-sys-color-outline-variant)]" />
    }

    return (
        <button
            onClick={onToggle}
            className="flex items-center justify-between w-full px-3 py-1.5 group"
        >
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--md-sys-color-on-surface-variant)] opacity-60">
                {label}
            </span>
            <span className={cn(
                'material-symbols-outlined text-[14px] text-[var(--md-sys-color-on-surface-variant)] opacity-40',
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
    store,
    tab,
    activeTab,
    activeSubTab,
    onSelect,
    onSelectSubTab,
    slug,
    orgSlug,
    railMode,
}: {
    store: NavStore
    tab: Tab
    activeTab: string
    activeSubTab: string
    onSelect: (id: TabId) => void
    onSelectSubTab: (id: string) => void
    slug: string
    orgSlug: string
    railMode: boolean
}) {
    const router = useRouter()
    const hasSubTabs = !!tab.subTabs?.filter(s => s.id && s.label).length
    const isActive = activeTab === tab.id
    const [open, setOpen] = useState(isActive && hasSubTabs)

    const handleClick = () => {
        if (tab.id === 'home') {
            router.push(settingsPath(orgSlug, slug))
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
                    railMode ? 'justify-center w-10 h-10 mx-auto' : 'h-8 px-3',
                    isActive && !hasSubTabs
                        ? 'bg-brand-container text-[rgb(var(--foreground))] font-medium'
                        : isActive && hasSubTabs
                            ? 'text-[rgb(var(--brand))] font-medium hover:bg-[rgb(var(--muted-foreground))]'
                            : 'text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--background))] hover:text-[var(--md-sys-color-on-surface)]'
                )}
            >
                <span className={cn(
                    'material-symbols-outlined shrink-0',
                    railMode ? 'text-[20px]' : 'text-[18px]',
                    isActive ? 'text-[rgb(var(--brand))]' : 'text-[rgb(var(--foreground))]'
                )}>
                    {tab.icon}
                </span>

                {!railMode && (
                    <>
                        <span className="flex-1 text-left text-[13px] truncate">{tab.label}</span>
                        {tab.beta && (
                            <span className={cn('nav-badge', isActive ? 'nav-badge-active' : 'nav-badge-default')}>
                                NEW
                            </span>
                        )}
                        {tab.pro && !store.is_pro && (
                            <span className="nav-badge nav-badge-pro">PRO</span>
                        )}
                        {hasSubTabs && (
                            <span className={cn(
                                'material-symbols-outlined text-[16px] shrink-0 transition-transform duration-150',
                                isActive ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)]',
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
                                        router.push(settingsPath(orgSlug, slug, tab.id, sub.id))
                                        onSelectSubTab(sub.id)
                                    }}
                                    className={cn(
                                        'flex items-center w-full h-7 px-2 rounded-md text-[12px] transition-colors duration-100',
                                        isSubActive
                                            ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-medium'
                                            : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
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

// ─── NavSectionGroup ──────────────────────────────────────────────────────────

function NavSectionGroup({
    section,
    activeTab,
    activeSubTab,
    onSelect,
    onSelectSubTab,
    slug,
    orgSlug,
    railMode,
    store,
}: {
    section: NavSection
    activeTab: string
    activeSubTab: string
    onSelect: (id: TabId) => void
    onSelectSubTab: (id: string) => void
    slug: string
    orgSlug: string
    railMode: boolean
    store: NavStore
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
                            orgSlug={orgSlug}
                            railMode={railMode}
                            store={store}
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
    orgSlug,
}: {
    store: NavStore
    allStores: NavStore[]
    railMode: boolean
    orgSlug: string
}) {
    const [open, setOpen] = useState(false)
    const hasMultiple = allStores.length > 1
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        function handleOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleOutside)
        return () => document.removeEventListener('mousedown', handleOutside)
    }, [open])

    function switchStore(s: NavStore) {
        document.cookie = `mng_active_store=${s.slug}; path=/; max-age=2592000; SameSite=Lax`
        window.location.href = settingsPath(s.org_slug ?? orgSlug, s.slug)
    }

    function renderMenu() {
        return (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-lg py-1 min-w-[240px]">
                <div className="px-3 py-2">
                    <p className="text-[11px] font-semibold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider">
                        Your stores
                    </p>
                </div>
                <div className="mx-2 my-1 h-px bg-[rgb(var(--border))]" />
                {allStores.map((s) => (
                    <button
                        key={s.slug}
                        onClick={() => { setOpen(false); switchStore(s) }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                    >
                        <div className="store-avatar-fallback flex w-5 h-5 shrink-0 items-center justify-center rounded text-[10px] font-bold overflow-hidden">
                            {s.logo_url
                                ? <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover rounded" />
                                : getInitials(s.name)
                            }
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)] truncate">{s.name}</span>
                                {s.slug === store.slug && (
                                    <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-[var(--md-sys-color-primary)]" />
                                )}
                            </div>
                            <span className="capitalize text-[11px] text-[var(--md-sys-color-on-surface-variant)]">{s.role}</span>
                        </div>
                    </button>
                ))}
            </div>
        )
    }

    if (railMode) {
        return (
            <div ref={containerRef} className="relative flex justify-center py-2">
                <button
                    onClick={() => hasMultiple && setOpen(v => !v)}
                    title={store.name}
                    className="store-avatar-fallback flex w-8 h-8 items-center justify-center rounded-md text-[11px] font-bold overflow-hidden"
                >
                    {store.logo_url
                        ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                        : getInitials(store.name)
                    }
                </button>
                {hasMultiple && open && renderMenu()}
            </div>
        )
    }

    return (
        <div ref={containerRef} className="relative px-1 py-2.5">
            <button
                onClick={() => hasMultiple && setOpen(v => !v)}
                className={cn(
                    'flex items-center gap-2 w-full rounded-md px-2 py-1.5 transition-colors duration-100 bg-[rgb(var(--background))]',
                    hasMultiple && 'hover:bg-[var(--md-sys-color-surface-variant)] cursor-pointer'
                )}
            >
                <div className="flex w-8 h-8 shrink-0 items-center justify-center rounded text-[10px] font-bold overflow-hidden">
                    {store.logo_url
                        ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                        : getInitials(store.name)
                    }
                </div>
                <div className="flex flex-col min-w-0 flex-1 text-left">
                    <span className="text-[12px] font-semibold text-[var(--md-sys-color-on-surface)] truncate leading-tight">
                        {store.name}
                    </span>
                    <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] truncate leading-tight">
                        {store.custom_domain ? `www.${store.custom_domain}` : `menengai.cloud/s/${store.slug}`}
                    </span>
                </div>
                {hasMultiple && (
                    <span className="material-symbols-outlined text-[16px] text-[var(--md-sys-color-on-surface-variant)]">
                        unfold_more
                    </span>
                )}
            </button>
            {hasMultiple && open && renderMenu()}
        </div>
    )
}

// ─── UtilityItems ─────────────────────────────────────────────────────────────

function UtilityItems({
    railMode,
    notificationCount = 0,
    store,
    orgSlug,
}: {
    railMode: boolean
    notificationCount?: number
    store: NavStore
    orgSlug: string
}) {
    const router = useRouter()
    const items = [
        { icon: 'notifications', label: 'Notifications', badge: notificationCount, href: settingsPath(orgSlug, store.slug, 'notifications') },
        { icon: 'help_outline', label: 'Support', href: '/support' },
    ]

    return (
        <ul className={cn('space-y-0.5 list-none p-0 mb-2', !railMode && 'px-1')}>
            {items.map((item) => (
                <li key={item.label}>
                    <button
                        onClick={() => router.push(item.href)}
                        title={railMode ? item.label : undefined}
                        className={cn(
                            'flex items-center gap-2.5 w-full rounded-md transition-colors duration-100',
                            'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]',
                            railMode ? 'justify-center w-10 h-10 mx-auto relative' : 'h-8 px-3'
                        )}
                    >
                        <span className="material-symbols-outlined text-[18px] shrink-0 relative">
                            {item.icon}
                            {item.badge != null && item.badge > 0 && (
                                <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] text-[9px] font-bold leading-none">
                                    {item.badge > 9 ? '9+' : item.badge}
                                </span>
                            )}
                        </span>
                        {!railMode && (
                            <>
                                <span className="flex-1 text-left text-[13px]">{item.label}</span>
                                {item.badge != null && item.badge > 0 && (
                                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] text-[10px] font-bold">
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

function AccountFooter({
    user,
    railMode,
    slug,
    orgSlug,
}: {
    user: NavUser
    railMode: boolean
    slug: string
    orgSlug: string
}) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        function handleOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleOutside)
        return () => document.removeEventListener('mousedown', handleOutside)
    }, [open])

    const menuItems = [
        ...(user.accountHref ? [{ href: user.accountHref, icon: 'manage_accounts', label: 'Account settings' }] : []),
        { href: settingsPath(orgSlug, slug, 'billing'), icon: 'credit_card', label: 'Billing' },
    ]

    return (
        <div ref={containerRef} className="relative px-2 py-2.5">
            <button
                onClick={() => setOpen(v => !v)}
                title={railMode ? user.name : undefined}
                className={cn(
                    'flex items-center gap-2.5 rounded-md transition-colors duration-100 outline-none',
                    'hover:bg-[var(--md-sys-color-surface-variant)]',
                    railMode ? 'justify-center w-10 h-10 mx-auto' : 'w-full px-2 py-1.5'
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
                            <span className="text-[12px] font-medium text-[var(--md-sys-color-on-surface)] truncate leading-tight">
                                {user.name}
                            </span>
                            <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] truncate leading-tight">
                                {user.email}
                            </span>
                        </div>
                        <span className={cn(
                            'material-symbols-outlined text-[18px] text-[var(--md-sys-color-on-surface-variant)] transition-transform duration-150',
                            open && 'rotate-180'
                        )}>
                            expand_more
                        </span>
                    </>
                )}
            </button>

            {open && (
                <div className="absolute bottom-full left-0 right-0 z-50 mb-1 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-lg py-1 min-w-[216px]">
                    <div className="flex items-center gap-2.5 px-3 py-2">
                        <div className="store-avatar-fallback w-7 h-7 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                            {user.avatarUrl
                                ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-md" />
                                : getInitials(user.name)
                            }
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-medium text-[var(--md-sys-color-on-surface)] truncate">{user.name}</span>
                            <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] truncate">{user.email}</span>
                        </div>
                    </div>
                    <div className="mx-2 my-1 h-px bg-[rgb(var(--border))]" />
                    {menuItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px] text-[var(--md-sys-color-on-surface-variant)] shrink-0">
                                {item.icon}
                            </span>
                            {item.label}
                        </Link>
                    ))}
                    {user.onSignOut && (
                        <>
                            <div className="mx-2 my-1 h-px bg-[rgb(var(--border))]" />
                            <button
                                onClick={() => { setOpen(false); user.onSignOut?.() }}
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px] shrink-0">logout</span>
                                Sign out
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── RailToggle ───────────────────────────────────────────────────────────────

function RailToggle({ railMode, onToggle }: { railMode: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            title={railMode ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-md text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
        >
            <span className="material-symbols-outlined">
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
    orgSlug,
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
    orgSlug: string
}) {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const src = !mounted || resolvedTheme === 'light' ? '/logo-dark.svg' : '/logo-light.svg'

    return (
        <aside className={cn(
            'flex flex-col h-[90dvh] md:h-[98dvh] my-auto ml-2 rounded-md bg-card',
            'transition-all duration-200 ease-out',
            railMode ? 'w-[56px]' : 'w-[220px]'
        )}>
            {/* Logo + rail toggle */}
            <div className={cn(
                'flex items-center',
                railMode ? 'justify-center py-3 px-2' : 'justify-between px-4 py-3'
            )}>
                {!railMode && (
                    <Link href="/" className="flex items-center shrink-0">
                        <img src={src} alt="Logo" className="w-auto h-5" />
                    </Link>
                )}
                <div className="flex items-center">
                    <RailToggle railMode={railMode} onToggle={onToggleRail} />
                </div>
            </div>

            <StoreSwitcher store={store} allStores={allStores} railMode={railMode} orgSlug={orgSlug} />

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
                        orgSlug={orgSlug}
                        railMode={railMode}
                        store={store}
                    />
                ))}
            </nav>

            <UtilityItems railMode={railMode} notificationCount={notificationCount} store={store} orgSlug={orgSlug} />
            <AccountFooter user={user} railMode={railMode} slug={store.slug} orgSlug={orgSlug} />
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
    orgSlug,
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
    orgSlug: string
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
                orgSlug={orgSlug}
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
    onOpen,
    notificationCount,
    orgSlug,
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
    onOpen: () => void
    notificationCount?: number
    orgSlug: string
}) {
    const handleSelect = (id: TabId) => { onSelect(id); onClose() }
    const handleSubSelect = (id: string) => { onSelectSubTab(id); onClose() }
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Panel swipe-to-close gesture state
    const touchStartX = useRef<number | null>(null)
    const touchStartY = useRef<number | null>(null)
    const dragging = useRef(false)
    const [dragX, setDragX] = useState(0)

    // Chevron tab swipe-to-open gesture state
    const tabTouchStartX = useRef<number | null>(null)
    const [tabDragX, setTabDragX] = useState(0)

    useEffect(() => setMounted(true), [])

    const src = !mounted || resolvedTheme === 'light' ? '/logo-dark.svg' : '/logo-light.svg'

    // ── Chevron tab handlers (swipe right to open) ────────────────────────────
    const handleTabTouchStart = (e: React.TouchEvent) => {
        tabTouchStartX.current = e.touches[0].clientX
        setTabDragX(0)
    }
    const handleTabTouchMove = (e: React.TouchEvent) => {
        if (tabTouchStartX.current === null) return
        const dx = e.touches[0].clientX - tabTouchStartX.current
        if (dx < 0) return
        setTabDragX(Math.min(dx, 240))
    }
    const handleTabTouchEnd = () => {
        if (tabDragX >= 60) onOpen()
        setTabDragX(0)
        tabTouchStartX.current = null
    }

    // ── Panel handlers (swipe left to close) ─────────────────────────────────
    const handlePanelTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
        dragging.current = false
        setDragX(0)
    }
    const handlePanelTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return
        const dx = e.touches[0].clientX - touchStartX.current
        const dy = Math.abs(e.touches[0].clientY - (touchStartY.current ?? 0))
        // Ignore vertical scrolls
        if (!dragging.current && dy > 10) { touchStartX.current = null; return }
        // Only track leftward swipe
        if (dx < 0) {
            dragging.current = true
            setDragX(dx)
        }
    }
    const handlePanelTouchEnd = () => {
        if (dragX < -60) onClose()
        setDragX(0)
        dragging.current = false
        touchStartX.current = null
    }

    // Panel translate: open/close + live drag offset
    const panelTranslate = open
        ? dragX < 0 ? `translateX(${dragX}px)` : undefined
        : tabDragX > 0
            ? `translateX(calc(-100% + ${tabDragX}px))`
            : undefined

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="md:hidden fixed inset-0 z-40"
                    onClick={onClose}
                />
            )}

            {/* Chevron tab — visible when closed */}
            {!open && (
                <div
                    className="md:hidden fixed left-0 top-1/2 z-50"
                    style={{ transform: `translateY(-50%) translateX(${Math.min(tabDragX, 240)}px)` }}
                    onTouchStart={handleTabTouchStart}
                    onTouchMove={handleTabTouchMove}
                    onTouchEnd={handleTabTouchEnd}
                >
                    <button
                        onClick={onOpen}
                        aria-label="Open navigation"
                        className="flex items-center justify-center w-6 h-14 rounded-r-xl bg-[var(--md-sys-color-primary-container)] shadow-md active:bg-[var(--md-sys-color-primary)]"
                    >
                        <span className="material-symbols-outlined text-[16px] text-[var(--md-sys-color-on-primary-container)]">
                            chevron_right
                        </span>
                    </button>
                </div>
            )}

            {/* Panel */}
            <div
                className={cn(
                    'md:hidden fixed inset-y-0 left-0 z-50 flex flex-col h-[98dvh] w-[300px] my-auto ml-2 rounded-lg',
                    'bg-card shadow-xl',
                    dragging.current ? '' : 'transition-transform duration-200 ease-out',
                    open ? 'translate-x-0' : '-translate-x-[calc(100%+0.5rem)]',
                )}
                style={panelTranslate ? { transform: panelTranslate } : undefined}
                onTouchStart={handlePanelTouchStart}
                onTouchMove={handlePanelTouchMove}
                onTouchEnd={handlePanelTouchEnd}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                    <Link href="/" className="flex items-center shrink-0">
                        <img src={src} alt="Logo" className="w-auto h-5" />
                    </Link>
                    <button
                        onClick={onClose}
                        aria-label="Close navigation"
                        className="p-1.5 rounded-full hover:bg-[var(--md-sys-color-surface-variant)] transition-colors text-[var(--md-sys-color-on-surface-variant)]"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <StoreSwitcher store={store} allStores={allStores} railMode={false} orgSlug={orgSlug} />

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
                            orgSlug={orgSlug}
                            railMode={false}
                            store={store}
                        />
                    ))}
                </nav>

                <UtilityItems railMode={false} notificationCount={notificationCount} store={store} orgSlug={orgSlug} />
                <AccountFooter user={user} railMode={false} slug={store.slug} orgSlug={orgSlug} />
            </div>
        </>
    )
}

// ─── Re-export types ──────────────────────────────────────────────────────────
export type { NavSection, NavStore, NavUser, Tab, SubTab }