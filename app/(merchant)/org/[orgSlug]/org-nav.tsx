'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrgNavTab = {
    id: string
    label: string
    icon: string
}

export const ORG_TABS: readonly OrgNavTab[] = [
    { id: 'home',         label: 'Overview',     icon: 'home' },
    { id: 'stores',       label: 'Stores',        icon: 'storefront' },
    { id: 'members',      label: 'Members',       icon: 'group' },
    { id: 'integrations', label: 'Integrations',  icon: 'link' },
    { id: 'settings',     label: 'Settings',      icon: 'settings' },
] as const

export type OrgTabId = (typeof ORG_TABS)[number]['id']

type NavOrg = {
    name: string
    slug: string
    logo_url?: string | null
}

type NavUser = {
    name: string
    email: string
    avatarUrl?: string
    onSignOut?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function orgPath(orgSlug: string, ...segments: string[]) {
    const base = `/org/${orgSlug}`
    return segments.length ? `${base}/${segments.join('/')}` : base
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

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
    tab,
    activeTab,
    orgSlug,
    railMode,
}: {
    tab: OrgNavTab
    activeTab: OrgTabId
    orgSlug: string
    railMode: boolean
}) {
    const router = useRouter()
    const isActive = activeTab === tab.id

    const href = tab.id === 'home'
        ? orgPath(orgSlug)
        : orgPath(orgSlug, tab.id)

    return (
        <li className="list-none">
            <button
                onClick={() => router.push(href)}
                title={railMode ? tab.label : undefined}
                className={cn(
                    'flex items-center gap-2.5 w-full transition-colors duration-100 rounded-md',
                    railMode ? 'justify-center w-10 h-10 mx-auto' : 'h-8 px-3',
                    isActive
                        ? 'bg-brand-container text-[rgb(var(--foreground))] font-medium'
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
                    <span className="flex-1 text-left text-[13px] truncate">{tab.label}</span>
                )}
            </button>
        </li>
    )
}

// ─── AccountFooter ────────────────────────────────────────────────────────────

function AccountFooter({
    user,
    railMode,
}: {
    user: NavUser
    railMode: boolean
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
                    {user.onSignOut && (
                        <button
                            onClick={() => { setOpen(false); user.onSignOut?.() }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px] shrink-0">logout</span>
                            Sign out
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── SidebarShell ─────────────────────────────────────────────────────────────

function SidebarShell({
    org,
    user,
    activeTab,
    orgSlug,
    railMode,
    onToggleRail,
}: {
    org: NavOrg
    user: NavUser
    activeTab: OrgTabId
    orgSlug: string
    railMode: boolean
    onToggleRail: () => void
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
                    <Link href="/org/pick" className="flex items-center shrink-0">
                        <img src={src} alt="Logo" className="w-auto h-5" />
                    </Link>
                )}
                <div className="flex items-center">
                    <RailToggle railMode={railMode} onToggle={onToggleRail} />
                </div>
            </div>

            {/* Org identity */}
            <div className={cn('px-1 py-2.5')}>
                <div className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 bg-[rgb(var(--background))]',
                    railMode ? 'justify-center' : ''
                )}>
                    <div className="flex w-8 h-8 shrink-0 items-center justify-center rounded text-[10px] font-bold overflow-hidden store-avatar-fallback">
                        {org.logo_url
                            ? <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                            : getInitials(org.name)
                        }
                    </div>
                    {!railMode && (
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[12px] font-semibold text-[var(--md-sys-color-on-surface)] truncate leading-tight">
                                {org.name}
                            </span>
                            <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] truncate leading-tight">
                                Organization
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1">
                <ul className="space-y-0.5 list-none p-0">
                    {ORG_TABS.map((tab) => (
                        <NavItem
                            key={tab.id}
                            tab={tab}
                            activeTab={activeTab}
                            orgSlug={orgSlug}
                            railMode={railMode}
                        />
                    ))}
                </ul>
            </nav>

            <AccountFooter user={user} railMode={railMode} />
        </aside>
    )
}

// ─── OrgNav (desktop) ─────────────────────────────────────────────────────────

export function OrgNav({
    org,
    user,
    activeTab,
    orgSlug,
}: {
    org: NavOrg
    user: NavUser
    activeTab: OrgTabId
    orgSlug: string
}) {
    const [railMode, setRailMode] = useState(false)

    return (
        <div className="hidden md:flex">
            <SidebarShell
                org={org}
                user={user}
                activeTab={activeTab}
                orgSlug={orgSlug}
                railMode={railMode}
                onToggleRail={() => setRailMode(v => !v)}
            />
        </div>
    )
}

// ─── MobileOrgNav ─────────────────────────────────────────────────────────────

export function MobileOrgNav({
    org,
    user,
    activeTab,
    orgSlug,
    open,
    onOpen,
    onClose,
}: {
    org: NavOrg
    user: NavUser
    activeTab: OrgTabId
    orgSlug: string
    open: boolean
    onOpen: () => void
    onClose: () => void
}) {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const src = !mounted || resolvedTheme === 'light' ? '/logo-dark.svg' : '/logo-light.svg'

    const touchStartX = useRef<number | null>(null)
    const touchStartY = useRef<number | null>(null)
    const dragging = useRef(false)
    const [dragX, setDragX] = useState(0)

    const tabTouchStartX = useRef<number | null>(null)
    const [tabDragX, setTabDragX] = useState(0)

    const handleTabTouchStart = (e: React.TouchEvent) => { tabTouchStartX.current = e.touches[0].clientX; setTabDragX(0) }
    const handleTabTouchMove = (e: React.TouchEvent) => {
        if (tabTouchStartX.current === null) return
        const dx = e.touches[0].clientX - tabTouchStartX.current
        if (dx < 0) return
        setTabDragX(Math.min(dx, 240))
    }
    const handleTabTouchEnd = () => { if (tabDragX >= 60) onOpen(); setTabDragX(0); tabTouchStartX.current = null }

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
        if (!dragging.current && dy > 10) { touchStartX.current = null; return }
        if (dx < 0) { dragging.current = true; setDragX(dx) }
    }
    const handlePanelTouchEnd = () => { if (dragX < -60) onClose(); setDragX(0); dragging.current = false; touchStartX.current = null }

    const panelTranslate = open
        ? dragX < 0 ? `translateX(${dragX}px)` : undefined
        : tabDragX > 0 ? `translateX(calc(-100% + ${tabDragX}px))` : undefined

    return (
        <>
            {open && <div className="md:hidden fixed inset-0 z-40" onClick={onClose} />}

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
                        <span className="material-symbols-outlined text-[16px] text-[var(--md-sys-color-on-primary-container)]">chevron_right</span>
                    </button>
                </div>
            )}

            <div
                className={cn(
                    'md:hidden fixed inset-y-0 left-0 z-50 flex flex-col h-[98dvh] w-[300px] my-auto ml-2 rounded-lg bg-card shadow-xl',
                    dragging.current ? '' : 'transition-transform duration-200 ease-out',
                    open ? 'translate-x-0' : '-translate-x-[calc(100%+0.5rem)]',
                )}
                style={panelTranslate ? { transform: panelTranslate } : undefined}
                onTouchStart={handlePanelTouchStart}
                onTouchMove={handlePanelTouchMove}
                onTouchEnd={handlePanelTouchEnd}
            >
                <div className="flex items-center justify-between px-4 py-3">
                    <Link href="/org/pick" className="flex items-center shrink-0">
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

                {/* Org identity */}
                <div className="px-1 py-2.5">
                    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-[rgb(var(--background))]">
                        <div className="flex w-8 h-8 shrink-0 items-center justify-center rounded text-[10px] font-bold overflow-hidden store-avatar-fallback">
                            {org.logo_url
                                ? <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                                : getInitials(org.name)
                            }
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[12px] font-semibold text-[var(--md-sys-color-on-surface)] truncate leading-tight">{org.name}</span>
                            <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] truncate leading-tight">Organization</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-2 px-1">
                    <ul className="space-y-0.5 list-none p-0">
                        {ORG_TABS.map((tab) => (
                            <NavItem
                                key={tab.id}
                                tab={tab}
                                activeTab={activeTab}
                                orgSlug={orgSlug}
                                railMode={false}
                            />
                        ))}
                    </ul>
                </nav>

                <AccountFooter user={user} railMode={false} />
            </div>
        </>
    )
}
