'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { ThemedLogo } from '@mcloud/ui/themed-logo'
import { cn } from '@mcloud/ui/utils'
import { Icon } from './ui/icon'
import { Avatar } from './ui/avatar'
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
            { id: 'audit', label: 'Audit log', icon: 'history', href: '/admin/audit' },
            { id: 'webhooks', label: 'Webhook Logs', icon: 'webhook', href: '/admin/webhooks' },
            { id: 'handoff-recovery', label: 'Handoff recovery', icon: 'mark_email_unread', href: '/admin/handoff-recovery' },
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

// ─── RailToggle ───────────────────────────────────────────────────────────────

function RailToggle({ railMode, onToggle }: { railMode: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            title={railMode ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={railMode ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
            <Icon name={railMode ? 'left_panel_open' : 'left_panel_close'} size={18} />
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
                    railMode ? 'justify-center w-9 h-9 mx-auto' : 'h-8 px-2.5',
                    isActive
                        ? 'bg-muted text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    item.comingSoon && 'opacity-50 cursor-not-allowed'
                )}
            >
                <Icon name={item.icon} size={railMode ? 20 : 18} className={isActive ? 'text-foreground' : undefined} />
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
        <div>
            {railMode
                ? <div className="mx-2 my-2 h-px bg-border" />
                : (
                    <div className="px-3.5 pt-3 pb-1">
                        <span className="text-[11px] font-medium text-muted-foreground">
                            {section.label}
                        </span>
                    </div>
                )
            }
            <ul className={cn('space-y-0.5 list-none p-0', !railMode && 'px-2')}>
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
    const { resolvedTheme, setTheme } = useTheme()

    return (
        <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
            className={cn(
                'flex items-center gap-2.5 w-full rounded-md transition-colors duration-100',
                'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                railMode ? 'justify-center w-9 h-9 mx-auto' : 'h-8 px-2.5'
            )}
        >
            {/* Both are rendered; the .dark class decides which shows, so server and client agree.
                Wrappers do the hiding: the icon font's own CSS would override `hidden` on the glyph. */}
            <span className="inline-flex dark:hidden"><Icon name="dark_mode" size={railMode ? 20 : 18} /></span>
            <span className="hidden dark:inline-flex"><Icon name="light_mode" size={railMode ? 20 : 18} /></span>
            {!railMode && (
                <span className="text-[13px]">
                    <span className="dark:hidden">Dark mode</span>
                    <span className="hidden dark:inline">Light mode</span>
                </span>
            )}
        </button>
    )
}

// ─── AccountFooter ────────────────────────────────────────────────────────────

function AccountFooter({ user, railMode }: { user: AdminUser; railMode: boolean }) {
    return (
        <div className="border-t border-border px-2 py-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        title={railMode ? user.name : undefined}
                        className={cn(
                            'flex items-center gap-2.5 rounded-md transition-colors duration-100 outline-none w-full',
                            'hover:bg-muted',
                            railMode ? 'justify-center w-9 h-9 mx-auto' : 'px-2 py-1.5'
                        )}
                    >
                        <Avatar name={user.name} src={user.avatarUrl} shape="circle" />
                        {!railMode && (
                            <>
                                <div className="flex flex-col min-w-0 flex-1 text-left">
                                    <span className="text-[12px] font-medium text-foreground truncate leading-tight">
                                        {user.name}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground truncate leading-tight">
                                        {user.email}
                                    </span>
                                </div>
                                <Icon name="unfold_more" size={16} className="text-muted-foreground" />
                            </>
                        )}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    side={railMode ? 'right' : 'top'}
                    align="start"
                    className="w-52 bg-background border border-border shadow-lg rounded-xl p-1"
                >
                    <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                        <Avatar name={user.name} src={user.avatarUrl} shape="circle" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-medium text-foreground truncate">{user.name}</span>
                            <span className="text-[11px] text-muted-foreground truncate">{user.email}</span>
                        </div>
                    </div>
                    <DropdownMenuSeparator className="bg-[var(--md-sys-color-outline-variant)]" />
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-[13px] gap-2">
                        <Link href="/org">
                            <Icon name="arrow_back" size={16} className="text-muted-foreground" />
                            Back to platform
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[var(--md-sys-color-outline-variant)]" />
                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-[13px] gap-2 text-destructive focus:text-destructive">
                        {/* A real link: sign-out is a route, and this needs no client-side navigation. */}
                        <a href="/auth/logout">
                            <Icon name="logout" size={16} />
                            Sign out
                        </a>
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

    return (
        <aside className={cn(
            'flex flex-col h-full border-r border-border bg-background',
            'transition-[width] duration-200 ease-out',
            railMode ? 'w-[56px]' : 'w-[232px]'
        )}>
            {/* Logo + toggle. "Admin" is a quiet tag, not a banner. */}
            <div className={cn(
                'flex h-12 shrink-0 items-center border-b border-border',
                railMode ? 'justify-center px-2' : 'justify-between px-4'
            )}>
                {!railMode && (
                    <Link href="/admin" className="flex items-center gap-2 shrink-0">
                        <ThemedLogo className="w-auto h-5" />
                        <span className="rounded border border-border px-1.5 py-px text-[10px] font-medium text-muted-foreground">Admin</span>
                    </Link>
                )}
                {showClose ? (
                    <button
                        onClick={onClose}
                        aria-label="Close navigation"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <Icon name="close" size={18} />
                    </button>
                ) : onToggleRail && (
                    <RailToggle railMode={railMode} onToggle={onToggleRail} />
                )}
            </div>

            {/* Nav sections */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden pb-2">
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
            <div className={cn('pb-1', !railMode && 'px-2')}>
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
        <div className="hidden md:flex h-full shrink-0">
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
                        className="flex items-center justify-center w-6 h-14 rounded-r-xl bg-accent shadow-md active:bg-primary"
                    >
                        <Icon name="chevron_right" size={16} className="text-accent-foreground" />
                    </button>
                </div>
            )}

            <div
                className={cn(
                    'md:hidden fixed inset-y-0 left-0 z-50 flex h-dvh w-[280px] flex-col',
                    'bg-background shadow-xl',
                    dragging.current ? '' : 'transition-transform duration-200 ease-out',
                    open ? 'translate-x-0' : '-translate-x-full',
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
