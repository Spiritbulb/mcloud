'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { cn } from '@mcloud/ui/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@mcloud/ui/dropdown-menu'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminUser = {
    name: string
    email: string
    avatarUrl?: string
}

type NavItem = {
    id: string
    label: string
    icon: string
    href: string
    comingSoon?: boolean
}

type NavSection = {
    id: string
    label: string
    items: NavItem[]
}

// ─── Nav Config ───────────────────────────────────────────────────────────────

export const ADMIN_SECTIONS: NavSection[] = [
    {
        id: 'overview',
        label: 'Overview',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/admin' },
        ],
    },
    {
        id: 'platform',
        label: 'Platform',
        items: [
            { id: 'users', label: 'Users', icon: 'people', href: '/admin/users' },
            { id: 'stores', label: 'Stores', icon: 'storefront', href: '/admin/stores' },
        ],
    },
    {
        id: 'commerce',
        label: 'Commerce',
        items: [
            { id: 'subs', label: 'Subscriptions', icon: 'subscriptions', href: '/admin/subs' },
            { id: 'orders', label: 'Orders', icon: 'receipt_long', href: '/admin/orders' },
        ],
    },
    {
        id: 'content',
        label: 'Content',
        items: [
            { id: 'docs', label: 'Documentation', icon: 'article', href: '/admin/docs-editor' },
        ],
    },
    {
        id: 'system',
        label: 'System',
        items: [
            { id: 'webhooks', label: 'Webhook Logs', icon: 'webhook', href: '/admin/webhooks' },
        ],
    },
]

export function getActiveId(pathname: string): string {
    if (pathname === '/admin' || pathname === '/admin/') return 'dashboard'
    const all = ADMIN_SECTIONS.flatMap(s => s.items)
    const matched = all.find(item => item.id !== 'dashboard' && pathname.startsWith(item.href))
    return matched?.id ?? 'dashboard'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function MSO({ icon, className }: { icon: string; className?: string }) {
    return (
        <span className={cn('material-symbols-outlined select-none leading-none', className)}>
            {icon}
        </span>
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
            <MSO icon={railMode ? 'menu_open' : 'menu'} className="text-[20px]" />
        </button>
    )
}

// ─── NavItemButton ────────────────────────────────────────────────────────────

function NavItemButton({
    item,
    activeId,
    railMode,
    onClose,
}: {
    item: NavItem
    activeId: string
    railMode: boolean
    onClose?: () => void
}) {
    const isActive = activeId === item.id

    return (
        <li className="list-none">
            <Link
                href={item.comingSoon ? '#' : item.href}
                title={railMode ? item.label : undefined}
                onClick={e => {
                    if (item.comingSoon) { e.preventDefault(); return }
                    onClose?.()
                }}
                className={cn(
                    'flex items-center gap-2.5 w-full transition-colors duration-100 rounded-md',
                    railMode ? 'justify-center w-10 h-10 mx-auto' : 'h-8 px-3',
                    isActive
                        ? 'bg-brand-container text-[rgb(var(--foreground))] font-medium'
                        : 'text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--background))] hover:text-[var(--md-sys-color-on-surface)]',
                    item.comingSoon && 'opacity-50 cursor-not-allowed'
                )}
            >
                <MSO
                    icon={item.icon}
                    className={cn(
                        'shrink-0',
                        railMode ? 'text-[20px]' : 'text-[18px]',
                        isActive ? 'text-[rgb(var(--brand))]' : 'text-[rgb(var(--foreground))]'
                    )}
                />
                {!railMode && (
                    <>
                        <span className="flex-1 text-left text-[13px] truncate">{item.label}</span>
                        {item.comingSoon && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                soon
                            </span>
                        )}
                    </>
                )}
            </Link>
        </li>
    )
}

// ─── NavSectionGroup ──────────────────────────────────────────────────────────

function NavSectionGroup({
    section,
    activeId,
    railMode,
    onClose,
}: {
    section: NavSection
    activeId: string
    railMode: boolean
    onClose?: () => void
}) {
    return (
        <div className="mb-1">
            {railMode
                ? <div className="mx-2 my-1 h-px bg-[var(--md-sys-color-outline-variant)]" />
                : (
                    <div className="px-3 py-1.5">
                        <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--md-sys-color-on-surface-variant)] opacity-60">
                            {section.label}
                        </span>
                    </div>
                )
            }
            <ul className={cn('space-y-0.5 list-none p-0', !railMode && 'px-1')}>
                {section.items.map(item => (
                    <NavItemButton
                        key={item.id}
                        item={item}
                        activeId={activeId}
                        railMode={railMode}
                        onClose={onClose}
                    />
                ))}
            </ul>
        </div>
    )
}

// ─── ThemeToggle ──────────────────────────────────────────────────────────────

function ThemeToggle({ railMode }: { railMode: boolean }) {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    if (!mounted) return <div className={railMode ? 'w-10 h-10' : 'h-8'} />

    const isDark = theme === 'dark'

    return (
        <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? 'Light mode' : 'Dark mode'}
            className={cn(
                'flex items-center gap-2.5 w-full rounded-md transition-colors duration-100',
                'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)]',
                railMode ? 'justify-center w-10 h-10 mx-auto' : 'h-8 px-3'
            )}
        >
            <MSO icon={isDark ? 'light_mode' : 'dark_mode'} className={cn('shrink-0', railMode ? 'text-[20px]' : 'text-[18px]')} />
            {!railMode && <span className="text-[13px]">{isDark ? 'Light mode' : 'Dark mode'}</span>}
        </button>
    )
}

// ─── AccountFooter ────────────────────────────────────────────────────────────

function AccountFooter({ user, railMode }: { user: AdminUser; railMode: boolean }) {
    return (
        <div className="px-2 py-2.5">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        title={railMode ? user.name : undefined}
                        className={cn(
                            'flex items-center gap-2.5 rounded-md transition-colors duration-100 outline-none w-full',
                            'hover:bg-[var(--md-sys-color-surface-variant)]',
                            railMode ? 'justify-center w-10 h-10 mx-auto' : 'px-2 py-1.5'
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
                                <MSO icon="expand_more" className="text-[18px] text-[var(--md-sys-color-on-surface-variant)]" />
                            </>
                        )}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    side={railMode ? 'right' : 'top'}
                    align="start"
                    className="w-52 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)] shadow-lg rounded-xl p-1"
                >
                    <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
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
                    <DropdownMenuSeparator className="bg-[var(--md-sys-color-outline-variant)]" />
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-[13px] gap-2">
                        <Link href="/org">
                            <MSO icon="arrow_back" className="text-[16px] text-[var(--md-sys-color-on-surface-variant)]" />
                            Back to platform
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[var(--md-sys-color-outline-variant)]" />
                    <DropdownMenuItem
                        className="rounded-lg cursor-pointer text-[13px] gap-2 text-[var(--md-sys-color-error)] focus:text-[var(--md-sys-color-error)]"
                        onSelect={() => { window.location.href = '/auth/logout' }}
                    >
                        <MSO icon="logout" className="text-[16px]" />
                        Sign out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

// ─── SidebarBody (shared between desktop + mobile) ────────────────────────────

export function SidebarBody({
    railMode,
    onToggleRail,
    user,
    activeId,
    showClose,
    onClose,
}: {
    railMode: boolean
    onToggleRail?: () => void
    user: AdminUser
    activeId: string
    showClose?: boolean
    onClose?: () => void
}) {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    const logoSrc = !mounted || resolvedTheme === 'light' ? '/logo-dark.svg' : '/logo-light.svg'

    return (
        <aside className={cn(
            'flex flex-col h-[90dvh] md:h-[98dvh] my-auto ml-2 rounded-md bg-card',
            'transition-all duration-200 ease-out',
            railMode ? 'w-[56px]' : 'w-[220px]'
        )}>
            {/* Logo + toggle */}
            <div className={cn(
                'flex items-center shrink-0',
                railMode ? 'justify-center py-3 px-2' : 'justify-between px-4 py-3'
            )}>
                {!railMode && (
                    <Link href="/admin" className="flex items-center shrink-0">
                        <img src={logoSrc} alt="Menengai Cloud" className="w-auto h-5" />
                    </Link>
                )}
                <div className="flex items-center">
                    {showClose ? (
                        <button
                            onClick={onClose}
                            aria-label="Close navigation"
                            className="p-1.5 rounded-full hover:bg-[var(--md-sys-color-surface-variant)] transition-colors text-[var(--md-sys-color-on-surface-variant)]"
                        >
                            <MSO icon="close" className="text-[20px]" />
                        </button>
                    ) : onToggleRail && (
                        <RailToggle railMode={railMode} onToggle={onToggleRail} />
                    )}
                </div>
            </div>

            {/* Admin badge */}
            {!railMode && (
                <div className="px-4 pb-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]">
                        <MSO icon="shield" className="text-[11px]" />
                        Admin Console
                    </span>
                </div>
            )}

            {/* Nav sections */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1">
                {ADMIN_SECTIONS.map(section => (
                    <NavSectionGroup
                        key={section.id}
                        section={section}
                        activeId={activeId}
                        railMode={railMode}
                        onClose={onClose}
                    />
                ))}
            </nav>

            {/* Theme toggle */}
            <div className={cn('pb-1', !railMode && 'px-1')}>
                <ThemeToggle railMode={railMode} />
            </div>

            <AccountFooter user={user} railMode={railMode} />
        </aside>
    )
}

// ─── AdminDesktopNav ──────────────────────────────────────────────────────────

export function AdminDesktopNav({ user, activeId }: { user: AdminUser; activeId: string }) {
    const [railMode, setRailMode] = useState(false)

    return (
        <div className="hidden md:flex shrink-0">
            <SidebarBody
                railMode={railMode}
                onToggleRail={() => setRailMode(v => !v)}
                user={user}
                activeId={activeId}
            />
        </div>
    )
}

// ─── AdminMobileNav ───────────────────────────────────────────────────────────

export function AdminMobileNav({
    user,
    activeId,
    open,
    onClose,
    onOpen,
}: {
    user: AdminUser
    activeId: string
    open: boolean
    onClose: () => void
    onOpen: () => void
}) {
    const touchStartX = useRef<number | null>(null)
    const touchStartY = useRef<number | null>(null)
    const dragging = useRef(false)
    const [dragX, setDragX] = useState(0)
    const tabTouchStartX = useRef<number | null>(null)
    const [tabDragX, setTabDragX] = useState(0)

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
    const handlePanelTouchEnd = () => {
        if (dragX < -60) onClose()
        setDragX(0)
        dragging.current = false
        touchStartX.current = null
    }

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
                        <span className="material-symbols-outlined text-[16px] text-[var(--md-sys-color-on-primary-container)]">
                            chevron_right
                        </span>
                    </button>
                </div>
            )}

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
                <SidebarBody
                    railMode={false}
                    user={user}
                    activeId={activeId}
                    showClose
                    onClose={onClose}
                />
            </div>
        </>
    )
}
