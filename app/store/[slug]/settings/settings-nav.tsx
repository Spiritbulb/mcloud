'use client'

import { useState } from 'react'
import { X, LogOut, Settings2, ChevronsUpDown } from 'lucide-react'
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
    useSidebar,
} from '@/components/ui/sidebar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
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
            <div className="flex aspect-square w-8 h-8 items-center justify-center rounded-md bg-[#f5f5f5] text-[#000] text-[11px] font-bold shrink-0">
                {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover rounded-md" />
                ) : (
                    getInitials(store.name)
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
                                    <div className="flex w-6 h-6 items-center justify-center rounded bg-[#f5f5f5] text-[#000] text-[10px] font-bold shrink-0">
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
                                    ? 'bg-[#425E7B] text-primary-foreground hover:bg-[#425E7B]/80 hover:text-primary-foreground'
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

// ─── AccountFooter ────────────────────────────────────────────────────────────

function AccountFooter({ user }: { user: NavUser }) {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="rounded-md hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent"
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
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        side="top"
                        align="start"
                        sideOffset={8}
                        className="w-56 backdrop-blur-sm"
                    >
                        <div className="px-3 py-2 border-b border-border mb-1">
                            <p className="text-[13px] font-medium text-foreground truncate">{user.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                        </div>

                        {user.accountHref && (
                            <DropdownMenuItem asChild>
                                <Link href={user.accountHref} className="cursor-pointer">
                                    <Settings2 className="w-4 h-4" />
                                    Account settings
                                </Link>
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {user.onSignOut && (
                            <DropdownMenuItem
                                onClick={user.onSignOut}
                                className="text-destructive focus:text-destructive cursor-pointer"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign out
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
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
    return (
        <Sidebar collapsible="none" className="hidden md:flex border-r border-border">
            <SidebarHeader className="border-b border-border px-3 py-3">
                <StoreSwitcher store={store} allStores={allStores} />
            </SidebarHeader>

            <SidebarContent className="px-3 py-3">
                <SidebarGroup className="p-0">
                    <SidebarGroupContent>
                        <NavList activeTab={activeTab} onSelect={onSelect} TABS={TABS} />
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-border px-3 py-3">
                <AccountFooter user={user} />
            </SidebarFooter>
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
}: {
    activeTab: string
    onSelect: (id: TabId) => void
    TABS: readonly Tab[]
    user: NavUser
    store: NavStore
    allStores: NavStore[]
}) {
    const { openMobile, setOpenMobile } = useSidebar()

    const handleSelect = (id: TabId) => {
        onSelect(id)
        setOpenMobile(false)
    }

    return (
        <>
            {/* Backdrop */}
            {openMobile && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-[#fff] dark:bg-[#000] backdrop-blur-sm"
                    onClick={() => setOpenMobile(false)}
                />
            )}

            {/* Drawer */}
            <div
                className={cn(
                    'md:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-full',
                    'bg-sidebar border-r border-border shadow-xl',
                    'transition-transform duration-200 ease-out',
                    openMobile ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 h-[72px] border-b border-border shrink-0">
                    <StoreSwitcher store={store} allStores={allStores} />
                    <button
                        onClick={() => setOpenMobile(false)}
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
                    <AccountFooter user={user} />
                </div>
            </div>
        </>
    )
}