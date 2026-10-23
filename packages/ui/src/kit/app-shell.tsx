'use client'

import { useRef, useState, type ReactNode, type TouchEvent } from 'react'
import Link from 'next/link'
import { cn } from '../utils'
import { ThemedLogo } from '../themed-logo'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../dropdown-menu'
import { Avatar } from './avatar'
import { Icon } from './icon'
import type { ShellNavItem, ShellNavSection } from './nav-logic'

// The one app frame for the admin, the org hub and store settings: a flush sidebar (collapsible
// to a rail on desktop, a swipeable drawer on phones), a 48px header with breadcrumbs, and the
// page. What differs between the three is data: the nav model, the context block under the logo
// (org or store), the header actions and the account menu.

export type ShellUser = { name: string; email: string; avatarUrl?: string | null }
export type ShellCrumb = { label: string; href?: string }
export type ShellMenuLink = { label: string; href: string; icon: string; external?: boolean }

const ICON_BUTTON =
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'

/** Absolute URLs (the other app, docs) are plain anchors; app paths use client navigation. */
function AnyLink({ href, external, className, children, onClick, title }: {
    href: string
    external?: boolean
    className?: string
    children: ReactNode
    onClick?: () => void
    title?: string
}) {
    if (external || /^https?:\/\//.test(href)) {
        return (
            <a href={href} className={className} onClick={onClick} title={title} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {children}
            </a>
        )
    }
    return <Link href={href} className={className} onClick={onClick} title={title}>{children}</Link>
}

// ─── Sidebar pieces ───────────────────────────────────────────────────────────

function NavLink({ item, active, rail, onNavigate }: { item: ShellNavItem; active: boolean; rail: boolean; onNavigate?: () => void }) {
    return (
        <li className="list-none">
            <AnyLink
                href={item.href}
                external={item.external}
                title={rail ? item.label : undefined}
                onClick={onNavigate}
                className={cn(
                    'flex w-full items-center gap-2.5 rounded-md transition-colors duration-100',
                    rail ? 'mx-auto h-9 w-9 justify-center' : 'h-8 px-2.5',
                    active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
            >
                {item.image ? (
                    // A partner's mark, at the glyph's size. Plain <img>: the kit does not depend on next/image.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" width={rail ? 20 : 18} height={rail ? 20 : 18} className="shrink-0 rounded-[4px]" />
                ) : (
                    <Icon name={item.icon} size={rail ? 20 : 18} className={active ? 'text-foreground' : undefined} />
                )}
                {!rail && (
                    <>
                        <span className="flex-1 truncate text-left text-[13px]" aria-current={active ? 'page' : undefined}>{item.label}</span>
                        {item.badge && (
                            <span className="rounded border border-border px-1 py-px text-[10px] font-medium leading-3 text-muted-foreground">{item.badge}</span>
                        )}
                        {item.external && <Icon name="open_in_new" size={13} className="text-muted-foreground/70" />}
                    </>
                )}
            </AnyLink>
        </li>
    )
}

function ThemeToggle({ rail, onToggle }: { rail: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            title="Toggle theme"
            className={cn(
                'flex w-full items-center gap-2.5 rounded-md text-muted-foreground transition-colors duration-100 hover:bg-muted/60 hover:text-foreground',
                rail ? 'mx-auto h-9 w-9 justify-center' : 'h-8 px-2.5',
            )}
        >
            {/* Both are rendered; the .dark class decides which shows, so server and client agree.
                Wrappers do the hiding: the icon font's own CSS would override `hidden` on the glyph. */}
            <span className="inline-flex dark:hidden"><Icon name="dark_mode" size={rail ? 20 : 18} /></span>
            <span className="hidden dark:inline-flex"><Icon name="light_mode" size={rail ? 20 : 18} /></span>
            {!rail && (
                <span className="text-[13px]">
                    <span className="dark:hidden">Dark mode</span>
                    <span className="hidden dark:inline">Light mode</span>
                </span>
            )}
        </button>
    )
}

function AccountMenu({ user, links, signOutHref, rail }: { user: ShellUser; links: ShellMenuLink[]; signOutHref: string; rail: boolean }) {
    return (
        <div className="border-t border-border px-2 py-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        title={rail ? user.name : undefined}
                        className={cn(
                            'flex w-full items-center gap-2.5 rounded-md outline-none transition-colors duration-100 hover:bg-muted',
                            rail ? 'mx-auto h-9 w-9 justify-center' : 'px-2 py-1.5',
                        )}
                    >
                        <Avatar name={user.name} src={user.avatarUrl} shape="circle" />
                        {!rail && (
                            <>
                                <span className="flex min-w-0 flex-1 flex-col text-left">
                                    <span className="truncate text-[12px] font-medium leading-tight text-foreground">{user.name}</span>
                                    <span className="truncate text-[11px] leading-tight text-muted-foreground">{user.email}</span>
                                </span>
                                <Icon name="unfold_more" size={16} className="text-muted-foreground" />
                            </>
                        )}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side={rail ? 'right' : 'top'} align="start" className="w-56 rounded-lg border border-border bg-popover p-1 shadow-lg">
                    <div className="mb-1 flex items-center gap-2 px-2 py-1.5">
                        <Avatar name={user.name} src={user.avatarUrl} shape="circle" />
                        <span className="flex min-w-0 flex-col">
                            <span className="truncate text-[12px] font-medium text-foreground">{user.name}</span>
                            <span className="truncate text-[11px] text-muted-foreground">{user.email}</span>
                        </span>
                    </div>
                    {links.length > 0 && <DropdownMenuSeparator />}
                    {links.map((l) => (
                        <DropdownMenuItem key={l.label} asChild className="cursor-pointer gap-2 rounded-md text-[13px]">
                            <AnyLink href={l.href} external={l.external}>
                                <Icon name={l.icon} size={16} className="text-muted-foreground" />
                                {l.label}
                            </AnyLink>
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-md text-[13px] text-destructive focus:text-destructive">
                        {/* A real link: sign-out is a route, and needs no client-side navigation. */}
                        <a href={signOutHref}>
                            <Icon name="logout" size={16} />
                            Sign out
                        </a>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

type SidebarProps = {
    sections: ShellNavSection[]
    activeId: string | undefined
    brandHref: string
    brandTag?: string
    context?: ReactNode
    user: ShellUser
    menuLinks: ShellMenuLink[]
    signOutHref: string
    onToggleTheme?: () => void
}

function Sidebar({
    rail,
    onToggleRail,
    onClose,
    ...p
}: SidebarProps & { rail: boolean; onToggleRail?: () => void; onClose?: () => void }) {
    return (
        // In the phone drawer (onClose) the sidebar fills the panel; a fixed width there left a strip
        // of empty sheet beyond the nav's border.
        <aside
            className={cn(
                'flex h-full flex-col bg-background',
                onClose ? 'w-full' : cn('border-r border-border transition-[width] duration-200 ease-out', rail ? 'w-[56px]' : 'w-[232px]'),
            )}
        >
            <div className={cn('flex h-12 shrink-0 items-center border-b border-border', rail ? 'justify-center px-2' : 'justify-between px-4')}>
                {!rail && (
                    <AnyLink href={p.brandHref} className="flex shrink-0 items-center gap-2">
                        <ThemedLogo className="h-5 w-auto" />
                        {p.brandTag && (
                            <span className="rounded border border-border px-1.5 py-px text-[10px] font-medium text-muted-foreground">{p.brandTag}</span>
                        )}
                    </AnyLink>
                )}
                {onClose ? (
                    <button type="button" onClick={onClose} aria-label="Close navigation" className={ICON_BUTTON}>
                        <Icon name="close" size={18} />
                    </button>
                ) : onToggleRail ? (
                    <button
                        type="button"
                        onClick={onToggleRail}
                        title={rail ? 'Expand sidebar' : 'Collapse sidebar'}
                        aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
                        className={ICON_BUTTON}
                    >
                        <Icon name={rail ? 'left_panel_open' : 'left_panel_close'} size={18} />
                    </button>
                ) : null}
            </div>

            {p.context && !rail && <div className="shrink-0 border-b border-border p-2">{p.context}</div>}

            <nav aria-label="Main" className="flex-1 overflow-y-auto overflow-x-hidden pb-2">
                {p.sections.map((section, i) => (
                    <div key={section.id}>
                        {rail ? (
                            i > 0 && <div className="mx-2 my-2 h-px bg-border" />
                        ) : section.label ? (
                            <div className="px-3.5 pb-1 pt-3"><span className="text-[11px] font-medium text-muted-foreground">{section.label}</span></div>
                        ) : (
                            <div className="pt-2" />
                        )}
                        <ul className={cn('list-none space-y-0.5 p-0', !rail && 'px-2', rail && i === 0 && 'pt-2')}>
                            {section.items.map((item) => (
                                <NavLink key={item.id} item={item} active={p.activeId === item.id} rail={rail} onNavigate={onClose} />
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>

            {p.onToggleTheme && (
                <div className={cn('pb-1', !rail && 'px-2')}>
                    <ThemeToggle rail={rail} onToggle={p.onToggleTheme} />
                </div>
            )}
            <AccountMenu user={p.user} links={p.menuLinks} signOutHref={p.signOutHref} rail={rail} />
        </aside>
    )
}

/** Phone drawer: slides in from the left; swipe left on it to close, or pull the edge tab to open. */
function MobileDrawer({ open, onOpen, onClose, children }: { open: boolean; onOpen: () => void; onClose: () => void; children: ReactNode }) {
    const start = useRef<{ x: number; y: number } | null>(null)
    const dragging = useRef(false)
    const [dragX, setDragX] = useState(0)
    const tabStart = useRef<number | null>(null)
    const [tabDragX, setTabDragX] = useState(0)

    const panelTouchStart = (e: TouchEvent) => {
        start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        dragging.current = false
        setDragX(0)
    }
    const panelTouchMove = (e: TouchEvent) => {
        if (!start.current) return
        const dx = e.touches[0].clientX - start.current.x
        const dy = Math.abs(e.touches[0].clientY - start.current.y)
        if (!dragging.current && dy > 10) { start.current = null; return }
        if (dx < 0) { dragging.current = true; setDragX(dx) }
    }
    const panelTouchEnd = () => {
        if (dragX < -60) onClose()
        setDragX(0)
        dragging.current = false
        start.current = null
    }

    const transform = open
        ? dragX < 0 ? `translateX(${dragX}px)` : undefined
        : tabDragX > 0 ? `translateX(calc(-100% + ${tabDragX}px))` : undefined

    return (
        <>
            {open && <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={onClose} aria-hidden />}
            {!open && (
                <div
                    className="fixed left-0 top-1/2 z-50 md:hidden"
                    style={{ transform: `translateY(-50%) translateX(${Math.min(tabDragX, 240)}px)` }}
                    onTouchStart={(e) => { tabStart.current = e.touches[0].clientX; setTabDragX(0) }}
                    onTouchMove={(e) => {
                        if (tabStart.current === null) return
                        const dx = e.touches[0].clientX - tabStart.current
                        if (dx >= 0) setTabDragX(Math.min(dx, 240))
                    }}
                    onTouchEnd={() => { if (tabDragX >= 60) onOpen(); setTabDragX(0); tabStart.current = null }}
                >
                    <button type="button" onClick={onOpen} aria-label="Open navigation" className="flex h-14 w-5 items-center justify-center rounded-r-md border border-l-0 border-border bg-card shadow-sm">
                        <Icon name="chevron_right" size={14} className="text-muted-foreground" />
                    </button>
                </div>
            )}
            <div
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex h-dvh w-[280px] max-w-[85vw] flex-col border-r border-border bg-background shadow-xl md:hidden',
                    // No transition while a finger is moving the panel, so it tracks the touch.
                    dragX === 0 && tabDragX === 0 && 'transition-transform duration-200 ease-out',
                    open ? 'translate-x-0' : '-translate-x-full',
                )}
                style={transform ? { transform } : undefined}
                onTouchStart={panelTouchStart}
                onTouchMove={panelTouchMove}
                onTouchEnd={panelTouchEnd}
            >
                {children}
            </div>
        </>
    )
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export function AppShell({
    sections,
    activeId,
    brandHref,
    brandTag,
    context,
    user,
    menuLinks = [],
    signOutHref,
    crumbs,
    actions,
    banner,
    content = 'page',
    onToggleTheme,
    children,
}: {
    sections: ShellNavSection[]
    activeId: string | undefined
    /** Where the logo goes. */
    brandHref: string
    /** Quiet tag beside the logo, e.g. "Admin". */
    brandTag?: string
    /** Under the logo: the org or store this nav belongs to (see ContextSwitcher). Hidden in rail mode. */
    context?: ReactNode
    user: ShellUser
    /** Account menu entries above "Sign out". */
    menuLinks?: ShellMenuLink[]
    signOutHref: string
    crumbs: ShellCrumb[]
    /** Header, right-hand side (wallet balance, help, overflow menu). */
    actions?: ReactNode
    /** Full-width strip above the header (announcements). */
    banner?: ReactNode
    /**
     * `page` (default): the shell scrolls the page and gives it the standard width and padding.
     * `bare`: the page manages its own scrolling and edges (editors, previews, legacy screens).
     */
    content?: 'page' | 'bare'
    /** Theme switch. Passed in so the kit does not pick a theme library; omit to hide the toggle. */
    onToggleTheme?: () => void
    children: ReactNode
}) {
    const [rail, setRail] = useState(false)
    const [drawer, setDrawer] = useState(false)
    const sidebar: SidebarProps = { sections, activeId, brandHref, brandTag, context, user, menuLinks, signOutHref, onToggleTheme }

    return (
        <div className="flex h-[100dvh] overflow-hidden bg-background">
            <div className="hidden h-full shrink-0 md:flex">
                <Sidebar {...sidebar} rail={rail} onToggleRail={() => setRail((r) => !r)} />
            </div>
            <MobileDrawer open={drawer} onOpen={() => setDrawer(true)} onClose={() => setDrawer(false)}>
                <Sidebar {...sidebar} rail={false} onClose={() => setDrawer(false)} />
            </MobileDrawer>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {banner}
                <header className="z-30 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
                    <button type="button" onClick={() => setDrawer(true)} aria-label="Open navigation" className={cn(ICON_BUTTON, 'h-8 w-8 md:hidden')}>
                        <Icon name="menu" size={20} />
                    </button>
                    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]">
                        {crumbs.map((c, i) => {
                            const last = i === crumbs.length - 1
                            return (
                                <span key={`${c.label}-${i}`} className={cn('flex min-w-0 items-center gap-1.5', !last && 'max-sm:hidden')}>
                                    {i > 0 && <Icon name="chevron_right" size={14} className="text-muted-foreground/50" />}
                                    {c.href && !last ? (
                                        <AnyLink href={c.href} className="truncate text-muted-foreground transition-colors hover:text-foreground">{c.label}</AnyLink>
                                    ) : (
                                        <span aria-current={last ? 'page' : undefined} className={last ? 'truncate font-medium text-foreground' : 'truncate text-muted-foreground'}>
                                            {c.label}
                                        </span>
                                    )}
                                </span>
                            )
                        })}
                    </nav>
                    {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
                </header>

                {content === 'page' ? (
                    <main className="min-h-0 flex-1 overflow-y-auto">
                        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
                    </main>
                ) : (
                    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
                )}
            </div>
        </div>
    )
}

// ─── ContextSwitcher ──────────────────────────────────────────────────────────

export type ContextOption = { key: string; name: string; detail?: string; logo?: string | null; href: string }

/**
 * The org or store this nav belongs to, shown under the logo. With `options`, it opens a menu to
 * switch to another one; `links` add actions at the bottom of that menu (e.g. "All stores").
 */
export function ContextSwitcher({
    name,
    detail,
    logo,
    options = [],
    links = [],
    menuLabel,
}: {
    name: string
    detail?: string
    logo?: string | null
    options?: ContextOption[]
    links?: ShellMenuLink[]
    /** Heading above the options, e.g. "Switch store". */
    menuLabel?: string
}) {
    const card = (
        <>
            <Avatar name={name} src={logo} />
            <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-[13px] font-medium leading-tight text-foreground">{name}</span>
                {detail && <span className="truncate text-[11px] leading-tight text-muted-foreground">{detail}</span>}
            </span>
        </>
    )
    if (options.length === 0 && links.length === 0) {
        return <div className="flex items-center gap-2.5 px-2 py-1.5">{card}</div>
    }
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button type="button" className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-muted">
                    {card}
                    <Icon name="unfold_more" size={16} className="text-muted-foreground" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[216px] rounded-lg border border-border bg-popover p-1 shadow-lg">
                {menuLabel && <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium text-muted-foreground">{menuLabel}</p>}
                {options.map((o) => (
                    <DropdownMenuItem key={o.key} asChild className="cursor-pointer gap-2 rounded-md text-[13px]">
                        {/* A full navigation: switching org or store reloads its whole context. */}
                        <a href={o.href}>
                            <Avatar name={o.name} src={o.logo} />
                            <span className="flex min-w-0 flex-col">
                                <span className={cn('truncate', o.name === name && 'font-medium')}>{o.name}</span>
                                {o.detail && <span className="truncate text-[11px] text-muted-foreground">{o.detail}</span>}
                            </span>
                            {o.name === name && <Icon name="check" size={15} className="ml-auto text-muted-foreground" />}
                        </a>
                    </DropdownMenuItem>
                ))}
                {links.length > 0 && options.length > 0 && <DropdownMenuSeparator />}
                {links.map((l) => (
                    <DropdownMenuItem key={l.label} asChild className="cursor-pointer gap-2 rounded-md text-[13px]">
                        <AnyLink href={l.href} external={l.external}>
                            <Icon name={l.icon} size={16} className="text-muted-foreground" />
                            {l.label}
                        </AnyLink>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
