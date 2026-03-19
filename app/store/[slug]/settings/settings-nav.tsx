'use client'

import { useState } from 'react'
import { X, LogOut, Settings2, ChevronsUpDown, CreditCard, SlidersHorizontal, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { TabId } from './settings-shell'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = { id: string; label: string; icon?: React.ReactNode; beta?: boolean }

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

// ─── StoreSwitcher ────────────────────────────────────────────────────────────

function StoreSwitcher({ store, allStores }: { store: NavStore; allStores: NavStore[] }) {
    const hasMultiple = allStores.length > 1

    const trigger = (
        <SidebarMenuButton
            size="lg"
            className="rounded-md hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent"
        >
            <div className="flex aspect-square w-6 h-6 items-center justify-center rounded-md bg-[#f5f5f5] text-[#000] text-[11px] font-bold shrink-0 overflow-hidden">
                {allStores[0].logo_url ? (
                    <img src={allStores[0].logo_url} alt={allStores[0].name} className="w-full h-full object-cover rounded-md" />
                ) : (
                    getInitials(allStores[0].name)
                )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-semibold text-sidebar-foreground truncate leading-tight">
                    {store.name}
                </span>
                <span className="text-[11px] text-sidebar-foreground/50 truncate leading-tight">
                    {store.slug}.menengai.cloud
                </span>
            </div>
            {hasMultiple && <ChevronsUpDown className="w-4 h-4 text-sidebar-foreground/40 shrink-0" />}
        </SidebarMenuButton>
    )

    if (!hasMultiple) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>{trigger}</SidebarMenuItem>
            </SidebarMenu>
        )
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="start" sideOffset={8} className="w-64 backdrop-blur-sm">
                        <div className="px-2 py-1.5 mb-1">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                Your stores
                            </p>
                        </div>
                        {allStores.map((s) => (
                            <DropdownMenuItem key={s.slug} asChild>
                                <Link
                                    href={`https://${s.slug}.menengai.cloud/settings`}
                                    className={cn(
                                        'flex items-center gap-2.5 cursor-pointer',
                                        s.slug === store.slug && 'bg-accent'
                                    )}
                                >
                                    <div className="flex w-5 h-5 items-center justify-center rounded bg-[#f5f5f5] text-[#000] text-[10px] font-bold shrink-0">
                                        {s.logo_url ? (
                                            <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover rounded" />
                                        ) : (
                                            getInitials(s.name)
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-[13px] font-medium truncate">{s.name}</span>
                                        <span className="text-[11px] text-muted-foreground truncate capitalize">{s.role}</span>
                                    </div>
                                    {s.slug === store.slug && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    )}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}

// ─── NavList ──────────────────────────────────────────────────────────────────

function NavList({
    activeTab,
    onSelect,
    TABS,
}: {
    activeTab: string
    onSelect: (id: TabId) => void
    TABS: readonly Tab[]
}) {
    return (
        <SidebarMenu>
            {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                    <SidebarMenuItem key={tab.id}>
                        <SidebarMenuButton
                            onClick={() => onSelect(tab.id as TabId)}
                            isActive={isActive}
                            className={cn(
                                'rounded-md h-9 text-[13px] font-medium transition-colors',
                                isActive
                                    ? 'bg-[#425E7B] text-white hover:bg-[#425E7B]/80 hover:text-white'
                                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-[#425E7B]/80 cursor-pointer'
                            )}
                        >
                            <span className="flex-1">{tab.label}</span>
                            {tab.beta && (
                                <span className={cn(
                                    'text-[9px] font-bold tracking-widest uppercase px-1.5 py-[3px] rounded-sm',
                                    isActive
                                        ? 'bg-white/15 text-white/60'
                                        : 'bg-muted text-muted-foreground'
                                )}>
                                    BETA
                                </span>
                            )}
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )
            })}
        </SidebarMenu>
    )
}

// ─── AccountDrawerContent ─────────────────────────────────────────────────────
// Shared inner content, used by both desktop (absolute inset-0) and
// mobile (fixed inset-y-0 left-0 w-full) variants.

function AccountDrawerContent({ user, onClose }: { user: NavUser; onClose: () => void }) {
    const menuItems = [
        ...(user.accountHref
            ? [{ href: user.accountHref, icon: Settings2, label: 'Account settings' }]
            : []),
        { href: '#billing', icon: CreditCard, label: 'Billing' },
        { href: '#misc', icon: SlidersHorizontal, label: 'Misc' },
    ]

    return (
        <>
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-3 border-b border-border shrink-0">
                <button
                    onClick={onClose}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    aria-label="Back"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[13px] font-medium text-sidebar-foreground">Account</span>
            </div>

            {/* User identity */}
            <div className="px-3 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2.5">
                    <Avatar className="w-9 h-9 rounded-full shrink-0">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-medium text-sidebar-foreground truncate leading-tight">
                            {user.name}
                        </span>
                        <span className="text-[11px] text-sidebar-foreground/50 truncate leading-tight">
                            {user.email}
                        </span>
                    </div>
                </div>
            </div>

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                <SidebarMenu>
                    {menuItems.map((item) => (
                        <SidebarMenuItem key={item.label}>
                            <SidebarMenuButton
                                asChild
                                className="rounded-md h-9 text-[13px] font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-accent transition-colors"
                            >
                                <Link href={item.href} className="flex items-center gap-2.5">
                                    <item.icon className="w-4 h-4 shrink-0" />
                                    {item.label}
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </div>

            {/* Sign out — pinned to bottom */}
            {user.onSignOut && (
                <div className="px-2 py-2 border-t border-border shrink-0">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={user.onSignOut}
                                className="rounded-md h-9 text-[13px] font-medium text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            >
                                <LogOut className="w-4 h-4 shrink-0" />
                                Sign out
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>
            )}
        </>
    )
}

// Desktop variant — `absolute inset-0` works because Sidebar is a plain div
// with `relative overflow-hidden` as its containing block.
function DesktopAccountDrawer({ user, onClose }: { user: NavUser; onClose: () => void }) {
    return (
        <div className="absolute inset-0 z-20 flex flex-col bg-sidebar animate-in slide-in-from-bottom-2 duration-200 ease-out">
            <AccountDrawerContent user={user} onClose={onClose} />
        </div>
    )
}

// Mobile variant — `fixed` matches the mobile nav panel's own fixed positioning.
// Uses the same inset-y-0 left-0 w-full geometry as the parent nav wrapper,
// so it covers exactly the same area without escaping to the full viewport.
function MobileAccountDrawer({ user, onClose }: { user: NavUser; onClose: () => void }) {
    return (
        <div className="fixed inset-y-0 left-0 w-full z-[60] flex flex-col bg-[#fff] dark:bg-[#000] animate-in slide-in-from-bottom-2 duration-200 ease-out">
            <AccountDrawerContent user={user} onClose={onClose} />
        </div>
    )
}

// ─── AccountTrigger ───────────────────────────────────────────────────────────

function AccountTrigger({ user, onOpen }: { user: NavUser; onOpen: () => void }) {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    size="lg"
                    onClick={onOpen}
                    className="rounded-md hover:bg-sidebar-accent cursor-pointer"
                >
                    <Avatar className="w-8 h-8 rounded-full shrink-0">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[13px] font-medium text-sidebar-foreground truncate leading-tight">
                            {user.name}
                        </span>
                        <span className="text-[11px] text-sidebar-foreground/50 truncate leading-tight">
                            {user.email}
                        </span>
                    </div>
                    <ChevronsUpDown className="w-4 h-4 text-sidebar-foreground/40 shrink-0" />
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}

// ─── SettingsNav (desktop) ────────────────────────────────────────────────────

export function SettingsNav({
    activeTab,
    onSelect,
    TABS,
    user,
    store,
    allStores,
}: {
    activeTab: string
    onSelect: (id: TabId) => void
    TABS: readonly Tab[]
    user: NavUser
    store: NavStore
    allStores: NavStore[]
}) {
    const [accountOpen, setAccountOpen] = useState(false)

    return (
        // `relative` + `overflow-hidden` → valid containing block for DesktopAccountDrawer's `absolute inset-0`
        <Sidebar collapsible="none" className="hidden md:flex border-r border-border relative overflow-hidden">
            {accountOpen && (
                <DesktopAccountDrawer user={user} onClose={() => setAccountOpen(false)} />
            )}

            {!accountOpen && (
                <SidebarHeader className="border-b border-border px-3 py-3">
                    <StoreSwitcher store={store} allStores={allStores} />
                </SidebarHeader>
            )}

            {!accountOpen && (
                <SidebarContent className="px-3 py-3">
                    <SidebarGroup className="p-0">
                        <SidebarGroupContent>
                            <NavList activeTab={activeTab} onSelect={onSelect} TABS={TABS} />
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            )}

            {!accountOpen && (
                <SidebarFooter className="border-t border-border px-3 py-3">
                    <AccountTrigger user={user} onOpen={() => setAccountOpen(true)} />
                </SidebarFooter>
            )}
        </Sidebar>
    )
}

// ─── MobileSettingsNav ────────────────────────────────────────────────────────

export function MobileSettingsNav({
    activeTab,
    onSelect,
    TABS,
    user,
    store,
    allStores,
    open,
    onClose,
}: {
    activeTab: string
    onSelect: (id: TabId) => void
    TABS: readonly Tab[]
    user: NavUser
    store: NavStore
    allStores: NavStore[]
    open: boolean
    onClose: () => void
}) {
    const [accountOpen, setAccountOpen] = useState(false)

    const handleSelect = (id: TabId) => {
        onSelect(id)
        onClose()
    }

    const handleAccountClose = () => setAccountOpen(false)

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-[#425e7b]/80 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Mobile account drawer — fixed independently, sits above the nav panel (z-[60] > z-50) */}
            {open && accountOpen && (
                <MobileAccountDrawer user={user} onClose={handleAccountClose} />
            )}

            {/* Nav panel — fixed, no `relative` needed or wanted */}
            {!accountOpen && (
                <div
                    className={cn(
                        'md:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-full max-w-vw',
                        'bg-[#fff] dark:bg-[#000] border-r border-border shadow-xl',
                        'transition-transform duration-200 ease-out',
                        open ? 'translate-x-0' : '-translate-x-full'
                    )}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 h-[72px] border-b border-border shrink-0">
                        <StoreSwitcher store={store} allStores={allStores} />
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Nav */}
                    <div className="flex-1 overflow-y-auto px-3 py-3">
                        <NavList activeTab={activeTab} onSelect={handleSelect} TABS={TABS} />
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border px-3 py-3 shrink-0">
                        <AccountTrigger user={user} onOpen={() => setAccountOpen(true)} />
                    </div>
                </div>
            )}
        </>
    )
}