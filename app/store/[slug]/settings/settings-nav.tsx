'use client'

import { useState } from 'react'
import { X, LogOut, Settings2, ChevronsUpDown, CreditCard, SlidersHorizontal, ChevronDown } from 'lucide-react'
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
import { usePathname, useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type SubTab = { readonly id: string; readonly label: string }

type Tab = {
    readonly id: string
    readonly label: string
    readonly icon?: React.ReactNode
    readonly beta?: boolean
    readonly subTabs?: readonly SubTab[]
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── StoreSwitcher ────────────────────────────────────────────────────────────

function StoreSwitcher({ store, allStores }: { store: NavStore; allStores: NavStore[] }) {
    const hasMultiple = allStores.length > 1

    const trigger = (
        <SidebarMenuButton
            size="lg"
            className="rounded-md hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent"
        >
            <div className="flex aspect-square w-6 h-6 items-center justify-center rounded-md bg-secondary text-secondary-foreground text-[11px] font-bold shrink-0 overflow-hidden">
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
                <span className="text-[11px] text-muted-foreground truncate leading-tight">
                    {store.slug}.menengai.cloud
                </span>
            </div>
            {hasMultiple && <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
        </SidebarMenuButton>
    )

    if (!hasMultiple) {
        return <SidebarMenu><SidebarMenuItem>{trigger}</SidebarMenuItem></SidebarMenu>
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="start" sideOffset={8} className="w-64">
                        <div className="px-2 py-1.5 mb-1">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                Your stores
                            </p>
                        </div>
                        {allStores.map((s) => (
                            <DropdownMenuItem key={s.slug} asChild>
                                <Link
                                    href={`https://${s.slug}.menengai.cloud/settings`}
                                    className={cn('flex items-center gap-2.5 cursor-pointer', s.slug === store.slug && 'bg-accent')}
                                >
                                    <div className="flex w-5 h-5 items-center justify-center rounded bg-secondary text-secondary-foreground text-[10px] font-bold shrink-0">
                                        {s.logo_url ? (
                                            <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover rounded" />
                                        ) : getInitials(s.name)}
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

// ─── NavRow ───────────────────────────────────────────────────────────────────
// Handles a single tab — with or without subtabs.
// If subtabs exist: clicking the row toggles expand, subtabs render below.
// Active parent stays expanded automatically.

function NavRow({
    tab,
    activeTab,
    activeSubTab,
    onSelect,
    onSelectSubTab,
    slug
}: {
    tab: Tab
    activeTab: string
    activeSubTab: string
    onSelect: (id: TabId) => void
    onSelectSubTab: (id: string) => void
    slug: string
}) {
    const router = useRouter()
    const basePath = process.env.NODE_ENV === 'development'
        ? `/store/${slug}/settings`
        : `/settings`
    const hasSubTabs = !!tab.subTabs?.filter(s => s.id && s.label).length
    const isActive = activeTab === tab.id

    // Auto-expand the active parent; user can also manually toggle
    const [open, setOpen] = useState(isActive && hasSubTabs)

    const handleRowClick = () => {
        if (hasSubTabs) {
            setOpen((v) => !v)
        } else {
            onSelect(tab.id as TabId)
        }
    }

    return (
        <SidebarMenuItem>
            {/* Parent row */}
            <SidebarMenuButton
                onClick={handleRowClick}
                isActive={isActive && !hasSubTabs}
                className={cn(
                    'rounded-md h-8 text-[13px] transition-colors',
                    isActive
                        ? hasSubTabs
                            ? 'text-foreground font-medium hover:bg-secondary/60'  // active parent: no fill, just bold
                            : 'bg-secondary text-foreground font-medium hover:bg-secondary/80' // active leaf: filled
                        : 'font-normal text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer'
                )}
            >
                {tab.icon && <span className="shrink-0 text-muted-foreground">{tab.icon}</span>}
                <span className="flex-1 truncate">{tab.label}</span>
                {tab.beta && (
                    <span className={cn(
                        'text-[9px] font-bold tracking-widest uppercase px-1.5 py-[3px] rounded-sm',
                        isActive ? 'bg-foreground/10 text-foreground/50' : 'bg-muted text-muted-foreground'
                    )}>
                        NEW
                    </span>
                )}
                {hasSubTabs && (
                    <ChevronDown className={cn(
                        'w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-150',
                        open && 'rotate-180'
                    )} />
                )}
            </SidebarMenuButton>

            {/* Subtabs — only rendered when expanded */}
            {hasSubTabs && open && (
                <div className="mt-0.5 ml-3 pl-2.5 border-l border-border space-y-0.5">
                    {tab.subTabs!.filter(s => s.id && s.label).map((sub) => {
                        const isSubActive = activeSubTab === sub.id
                        return (
                            <button
                                key={sub.id}
                                onClick={() => {
                                    router.push(`${basePath}/${tab.id}/${sub.id}`)
                                    onSelectSubTab(sub.id)
                                }}
                                className={cn(
                                    'w-full text-left px-2 h-7 rounded-md text-[12px] transition-colors',
                                    isSubActive
                                        ? 'bg-secondary text-foreground font-medium'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer'
                                )}
                            >
                                {sub.label}
                            </button>
                        )
                    })}
                </div>
            )}
        </SidebarMenuItem>
    )
}

// ─── NavList ──────────────────────────────────────────────────────────────────

function NavList({
    activeTab,
    activeSubTab,
    onSelect,
    onSelectSubTab,
    TABS,
    slug,
}: {
    activeTab: string
    activeSubTab: string
    onSelect: (id: TabId) => void
    onSelectSubTab: (id: string) => void
    TABS: readonly Tab[]
    slug: string
}) {
    const router = useRouter()
    const pathname = usePathname()
    const basePath = process.env.NODE_ENV === 'development'
        ? `/store/${slug}/settings`
        : `/settings`

    const handleSelect = (id: TabId) => {
        if (id === 'home') {
            router.push(basePath)
        } else {
            onSelect(id)
        }
    }

    return (
        <SidebarMenu className="space-y-0.5">
            {TABS.map((tab) => {
                const resolvedActive = tab.id === 'home'
                    ? pathname === basePath ? 'home' : activeTab
                    : activeTab
                return (
                    <NavRow
                        key={tab.id}
                        tab={tab}
                        activeTab={tab.id === 'home' && pathname === basePath ? 'home' : resolvedActive}
                        activeSubTab={activeSubTab}
                        onSelect={handleSelect}
                        onSelectSubTab={onSelectSubTab}
                        slug={slug}
                    />
                )
            })}
        </SidebarMenu>
    )
}

// ─── AccountFooter ────────────────────────────────────────────────────────────

function AccountFooter({ user }: { user: NavUser }) {
    const menuItems = [
        ...(user.accountHref ? [{ href: user.accountHref, icon: Settings2, label: 'Account settings' }] : []),
        { href: '#billing', icon: CreditCard, label: 'Billing' },
        { href: '#misc', icon: SlidersHorizontal, label: 'Misc' },
    ]

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 w-full px-2 py-2 rounded-md hover:bg-sidebar-accent transition-colors group outline-none">
                    <Avatar className="w-7 h-7 rounded-md shrink-0">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="rounded-md bg-primary text-primary-foreground text-[10px] font-bold">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1 text-left">
                        <span className="text-[12px] font-medium text-sidebar-foreground truncate leading-tight">{user.name}</span>
                        <span className="text-[11px] text-muted-foreground truncate leading-tight">{user.email}</span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-56 p-1">
                <div className="flex items-center gap-2.5 px-2 py-2 mb-1 border-b border-border">
                    <Avatar className="w-7 h-7 rounded-md shrink-0">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="rounded-md bg-primary text-primary-foreground text-[10px] font-bold">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-medium text-foreground truncate leading-tight">{user.name}</span>
                        <span className="text-[11px] text-muted-foreground truncate leading-tight">{user.email}</span>
                    </div>
                </div>
                {menuItems.map((item) => (
                    <DropdownMenuItem key={item.label} asChild>
                        <Link href={item.href} className="flex items-center gap-2 cursor-pointer text-[13px]">
                            <item.icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                            {item.label}
                        </Link>
                    </DropdownMenuItem>
                ))}
                {user.onSignOut && (
                    <>
                        <div className="my-1 border-t border-border" />
                        <DropdownMenuItem
                            onClick={user.onSignOut}
                            className="flex items-center gap-2 text-[13px] text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5 shrink-0" />
                            Sign out
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// ─── SettingsNav (desktop) ────────────────────────────────────────────────────

export function SettingsNav({
    activeTab,
    activeSubTab,
    onSelect,
    onSelectSubTab,
    TABS,
    user,
    store,
    allStores,
}: {
    activeTab: string
    activeSubTab: string
    onSelect: (id: TabId) => void
    onSelectSubTab: (id: string) => void
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
                        <NavList
                            activeTab={activeTab}
                            activeSubTab={activeSubTab}
                            onSelect={onSelect}
                            onSelectSubTab={onSelectSubTab}
                            TABS={TABS}
                            slug={store.slug}
                        />
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
    activeSubTab,
    onSelect,
    onSelectSubTab,
    TABS,
    user,
    store,
    allStores,
    open,
    onClose,
}: {
    activeTab: string
    activeSubTab: string
    onSelect: (id: TabId) => void
    onSelectSubTab: (id: string) => void
    TABS: readonly Tab[]
    user: NavUser
    store: NavStore
    allStores: NavStore[]
    open: boolean
    onClose: () => void
}) {
    const handleSelect = (id: TabId) => { onSelect(id); onClose() }
    const handleSubSelect = (id: string) => { onSelectSubTab(id); onClose() }

    return (
        <>
            {open && (
                <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            )}
            <div className={cn(
                'md:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-72',
                'bg-sidebar border-r border-border shadow-xl',
                'transition-transform duration-200 ease-out',
                open ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="flex items-center justify-between px-3 h-[57px] border-b border-border shrink-0">
                    <StoreSwitcher store={store} allStores={allStores} />
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3">
                    <NavList
                        activeTab={activeTab}
                        activeSubTab={activeSubTab}
                        onSelect={handleSelect}
                        onSelectSubTab={handleSubSelect}
                        TABS={TABS}
                        slug={store.slug}
                    />
                </div>
                <div className="border-t border-border px-3 py-3 shrink-0">
                    <AccountFooter user={user} />
                </div>
            </div>
        </>
    )
}