'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type TraderApp = {
    id: string
    slug: string
    brand_name: string
    logo_url: string | null
    custom_domain: string | null
    primary_color: string | null
    is_active: boolean
}

export type TraderTabId =
    | 'general'
    | 'branding'
    | 'deriv'
    | 'domain'
    | 'affiliates'
    | 'support'
    | 'apps'

type Tab = { id: TraderTabId; label: string; icon: string }

const TABS: Tab[] = [
    { id: 'general',   label: 'General',     icon: 'settings' },
    { id: 'branding',  label: 'Branding',    icon: 'palette' },
    { id: 'deriv',     label: 'Deriv OAuth', icon: 'vpn_key' },
    { id: 'domain',    label: 'Domain',      icon: 'language' },
    { id: 'affiliates',label: 'Affiliates',  icon: 'people' },
    { id: 'support',   label: 'Support',     icon: 'support_agent' },
    { id: 'apps',      label: 'Enabled Apps',icon: 'apps' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function traderPath(orgSlug: string, traderSlug: string, tab?: TraderTabId) {
    const base = `/org/${orgSlug}/trading/${traderSlug}`
    return tab ? `${base}/${tab}` : base
}

function getActiveTab(pathname: string, orgSlug: string, traderSlug: string): TraderTabId {
    const base = `/org/${orgSlug}/trading/${traderSlug}/`
    const segment = pathname.startsWith(base) ? pathname.slice(base.length).split('/')[0] : ''
    return (TABS.find(t => t.id === segment)?.id ?? 'general') as TraderTabId
}

// ─── RailToggle ───────────────────────────────────────────────────────────────

function RailToggle({ railMode, onToggle }: { railMode: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            title={railMode ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-md text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
        >
            <span className="material-symbols-outlined select-none leading-none text-[20px]">
                {railMode ? 'menu_open' : 'menu'}
            </span>
        </button>
    )
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ tab, activeTab, orgSlug, traderSlug, railMode, onClose }: {
    tab: Tab
    activeTab: TraderTabId
    orgSlug: string
    traderSlug: string
    railMode: boolean
    onClose?: () => void
}) {
    const router = useRouter()
    const isActive = activeTab === tab.id

    return (
        <li className="list-none">
            <button
                onClick={() => { router.push(traderPath(orgSlug, traderSlug, tab.id)); onClose?.() }}
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
                    'material-symbols-outlined select-none leading-none shrink-0',
                    railMode ? 'text-[20px]' : 'text-[18px]',
                    isActive ? 'text-[rgb(var(--brand))]' : 'text-[rgb(var(--foreground))]'
                )}>
                    {tab.icon}
                </span>
                {!railMode && <span className="flex-1 text-left text-[13px] truncate">{tab.label}</span>}
            </button>
        </li>
    )
}

// ─── SidebarShell ─────────────────────────────────────────────────────────────

function SidebarShell({ app, orgSlug, activeTab, railMode, onToggleRail, showClose, onClose }: {
    app: TraderApp
    orgSlug: string
    activeTab: TraderTabId
    railMode: boolean
    onToggleRail?: () => void
    showClose?: boolean
    onClose?: () => void
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
            {/* Logo + toggle */}
            <div className={cn(
                'flex items-center shrink-0',
                railMode ? 'justify-center py-3 px-2' : 'justify-between px-4 py-3'
            )}>
                {!railMode && (
                    <Link href={`/org/${orgSlug}/trading`} className="flex items-center shrink-0">
                        <img src={src} alt="Logo" className="w-auto h-5" />
                    </Link>
                )}
                <div className="flex items-center">
                    {showClose ? (
                        <button onClick={onClose} aria-label="Close navigation"
                            className="p-1.5 rounded-full hover:bg-[var(--md-sys-color-surface-variant)] transition-colors text-[var(--md-sys-color-on-surface-variant)]">
                            <span className="material-symbols-outlined select-none leading-none text-[20px]">close</span>
                        </button>
                    ) : onToggleRail && <RailToggle railMode={railMode} onToggle={onToggleRail} />}
                </div>
            </div>

            {/* App identity */}
            <div className="px-1 py-2.5">
                <div className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 bg-[rgb(var(--background))]', railMode && 'justify-center')}>
                    <div
                        className="flex w-8 h-8 shrink-0 items-center justify-center rounded text-[10px] font-bold overflow-hidden"
                        style={{ background: app.primary_color ?? '#0051ff', color: '#fff' }}
                    >
                        {app.logo_url
                            ? <img src={app.logo_url} alt={app.brand_name} className="w-full h-full object-cover" />
                            : getInitials(app.brand_name)
                        }
                    </div>
                    {!railMode && (
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[12px] font-semibold text-[var(--md-sys-color-on-surface)] truncate leading-tight">
                                {app.brand_name}
                            </span>
                            <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] truncate leading-tight">
                                {app.custom_domain ?? app.slug}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1">
                <ul className="space-y-0.5 list-none p-0">
                    {TABS.map(tab => (
                        <NavItem
                            key={tab.id}
                            tab={tab}
                            activeTab={activeTab}
                            orgSlug={orgSlug}
                            traderSlug={app.slug}
                            railMode={railMode}
                            onClose={onClose}
                        />
                    ))}
                </ul>
            </nav>

            {/* Back link */}
            <div className={cn('pb-2', !railMode && 'px-1')}>
                <Link
                    href={`/org/${orgSlug}/trading`}
                    title={railMode ? 'All trading apps' : undefined}
                    className={cn(
                        'flex items-center gap-2.5 rounded-md transition-colors text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)]',
                        railMode ? 'justify-center w-10 h-10 mx-auto' : 'h-8 px-3'
                    )}
                >
                    <span className="material-symbols-outlined select-none leading-none text-[18px] shrink-0">arrow_back</span>
                    {!railMode && <span className="text-[13px]">All trading apps</span>}
                </Link>
            </div>
        </aside>
    )
}

// ─── TraderShell ──────────────────────────────────────────────────────────────

export default function TraderShell({ app, orgSlug, children }: {
    app: TraderApp
    orgSlug: string
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const activeTab = getActiveTab(pathname, orgSlug, app.slug)
    const activeLabel = TABS.find(t => t.id === activeTab)?.label ?? 'General'

    const [railMode, setRailMode] = useState(false)
    const [mobileNavOpen, setMobileNavOpen] = useState(false)

    // Swipe state
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
    const handleTabTouchEnd = () => { if (tabDragX >= 60) setMobileNavOpen(true); setTabDragX(0); tabTouchStartX.current = null }

    const handlePanelTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
        dragging.current = false; setDragX(0)
    }
    const handlePanelTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return
        const dx = e.touches[0].clientX - touchStartX.current
        const dy = Math.abs(e.touches[0].clientY - (touchStartY.current ?? 0))
        if (!dragging.current && dy > 10) { touchStartX.current = null; return }
        if (dx < 0) { dragging.current = true; setDragX(dx) }
    }
    const handlePanelTouchEnd = () => { if (dragX < -60) setMobileNavOpen(false); setDragX(0); dragging.current = false; touchStartX.current = null }

    const panelTranslate = mobileNavOpen
        ? dragX < 0 ? `translateX(${dragX}px)` : undefined
        : tabDragX > 0 ? `translateX(calc(-100% + ${tabDragX}px))` : undefined

    return (
        <div className="h-[100dvh] overflow-hidden flex bg-background">
            {/* Desktop sidebar */}
            <div className="hidden md:flex shrink-0">
                <SidebarShell
                    app={app}
                    orgSlug={orgSlug}
                    activeTab={activeTab}
                    railMode={railMode}
                    onToggleRail={() => setRailMode(v => !v)}
                />
            </div>

            {/* Mobile backdrop */}
            {mobileNavOpen && <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileNavOpen(false)} />}

            {/* Mobile chevron tab */}
            {!mobileNavOpen && (
                <div
                    className="md:hidden fixed left-0 top-1/2 z-50"
                    style={{ transform: `translateY(-50%) translateX(${Math.min(tabDragX, 240)}px)` }}
                    onTouchStart={handleTabTouchStart}
                    onTouchMove={handleTabTouchMove}
                    onTouchEnd={handleTabTouchEnd}
                >
                    <button
                        onClick={() => setMobileNavOpen(true)}
                        aria-label="Open navigation"
                        className="flex items-center justify-center w-6 h-14 rounded-r-xl bg-[var(--md-sys-color-primary-container)] shadow-md active:bg-[var(--md-sys-color-primary)]"
                    >
                        <span className="material-symbols-outlined select-none leading-none text-[16px] text-[var(--md-sys-color-on-primary-container)]">chevron_right</span>
                    </button>
                </div>
            )}

            {/* Mobile drawer */}
            <div
                className={cn(
                    'md:hidden fixed inset-y-0 left-0 z-50 flex flex-col h-[98dvh] w-[300px] my-auto ml-2 rounded-lg bg-card shadow-xl',
                    dragging.current ? '' : 'transition-transform duration-200 ease-out',
                    mobileNavOpen ? 'translate-x-0' : '-translate-x-[calc(100%+0.5rem)]',
                )}
                style={panelTranslate ? { transform: panelTranslate } : undefined}
                onTouchStart={handlePanelTouchStart}
                onTouchMove={handlePanelTouchMove}
                onTouchEnd={handlePanelTouchEnd}
            >
                <SidebarShell
                    app={app}
                    orgSlug={orgSlug}
                    activeTab={activeTab}
                    railMode={false}
                    showClose
                    onClose={() => setMobileNavOpen(false)}
                />
            </div>

            {/* Main area */}
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
                <header className="shrink-0 h-[57px] bg-[var(--md-sys-color-surface)] z-40 flex items-center px-4 md:px-5 gap-3 border-b border-[var(--md-sys-color-outline-variant)]/40">
                    <button
                        onClick={() => setMobileNavOpen(true)}
                        className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors shrink-0"
                        aria-label="Open navigation"
                    >
                        <span className="material-symbols-outlined select-none leading-none text-[20px]">menu</span>
                    </button>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[13px] text-[var(--md-sys-color-on-surface-variant)] truncate">{app.brand_name}</span>
                        <span className="material-symbols-outlined select-none leading-none text-[16px] text-[var(--md-sys-color-on-surface-variant)] opacity-40 shrink-0">chevron_right</span>
                        <span className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)] truncate">{activeLabel}</span>
                    </div>
                    {!app.is_active && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)] shrink-0">
                            inactive
                        </span>
                    )}
                </header>
                <main className="flex-1 min-h-0 overflow-y-auto px-6 md:px-10 py-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
