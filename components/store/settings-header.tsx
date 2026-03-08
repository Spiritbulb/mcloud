'use client'

import { Menu, X, LogOut, Settings2, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useState } from 'react'
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    useSidebar,
} from '@/components/ui/sidebar'

// ─── Shared nav list ──────────────────────────────────────────────────────────

function NavList({
    activeTab,
    onSelect,
    TABS,
}: {
    activeTab: string
    onSelect: (id: string) => void
    TABS: any[]
}) {
    return (
        <SidebarMenu className="flex flex-col gap-0 p-0">
            {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                    <SidebarMenuItem
                        key={tab.id}
                        className="border-b border-light last:border-b-0 rounded-none m-0 list-none"
                    >
                        <SidebarMenuButton
                            onClick={() => onSelect(tab.id)}
                            isActive={isActive}
                            className={cn(
                                'w-full flex items-center gap-3 px-4 py-3.5 text-[13px] transition-colors text-left rounded-none h-auto',
                                isActive
                                    ? 'bg-[#425e7b] text-white font-medium hover:bg-[#425e7b] hover:text-white active:bg-[#425e7b]'
                                    : 'text-on-surface-muted hover:text-foreground hover:bg-[#425e7b]/40'
                            )}
                        >
                            <span className={cn(
                                'shrink-0 transition-colors w-[15px] h-[15px]',
                                isActive ? 'text-white' : 'text-on-surface-muted'
                            )}>
                                {tab.icon}
                            </span>
                            <span className="flex-1">{tab.label}</span>
                            {tab.pro && (
                                <span className={cn(
                                    'text-[9px] font-bold tracking-widest uppercase px-1.5 py-[3px] border',
                                    isActive
                                        ? 'border-outline-strong text-white/70'
                                        : 'border-outline text-on-surface-muted/60'
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

// ─── AccountSection ───────────────────────────────────────────────────────────
// Sits at the bottom of both sidebars. Shows avatar + name + email,
// with a popover menu for account settings and sign-out.

function AccountSection({
    user,
}: {
    user: {
        name: string
        email: string
        avatarUrl?: string
        accountHref?: string
        onSignOut?: () => void
    }
}) {
    const [open, setOpen] = useState(false)

    const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    return (
        <div className="relative border-t border-light mt-auto shrink-0">
            {/* Popover menu */}
            {open && (
                <>
                    {/* Dismiss layer */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpen(false)}
                    />
                    <div className="absolute bottom-full left-0 right-0 z-20 bg-[color:var(--background,#fff)] border border-light shadow-lg mb-0">
                        {user.accountHref && (
                            <Link
                                href={user.accountHref}
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-[13px] text-on-surface-muted hover:text-foreground hover:bg-[#425e7b]/10 transition-colors border-b border-light"
                            >
                                <Settings2 className="w-[14px] h-[14px] shrink-0" />
                                <span>Account settings</span>
                            </Link>
                        )}
                        {user.onSignOut && (
                            <button
                                onClick={() => {
                                    setOpen(false)
                                    user.onSignOut?.()
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-on-surface-muted hover:text-foreground hover:bg-[#425e7b]/10 transition-colors text-left"
                            >
                                <LogOut className="w-[14px] h-[14px] shrink-0" />
                                <span>Sign out</span>
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* Trigger row */}
            <button
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left',
                    open
                        ? 'bg-[#425e7b]/10'
                        : 'hover:bg-[#425e7b]/10'
                )}
            >
                {/* Avatar */}
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#425e7b] flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-[9px] font-bold text-white leading-none">
                            {initials}
                        </span>
                    )}
                </span>

                {/* Name + email */}
                <span className="flex-1 min-w-0">
                    <span className="block text-[12px] font-medium text-foreground truncate leading-tight">
                        {user.name}
                    </span>
                    <span className="block text-[11px] text-on-surface-muted truncate leading-tight mt-0.5">
                        {user.email}
                    </span>
                </span>

                {/* Chevron */}
                <ChevronUp
                    className={cn(
                        'w-[13px] h-[13px] shrink-0 text-on-surface-muted transition-transform duration-150',
                        open ? 'rotate-0' : 'rotate-180'
                    )}
                />
            </button>
        </div>
    )
}

// ─── SettingsHeader ───────────────────────────────────────────────────────────

export function SettingsHeader({
    store,
    handleSave,
    saving,
    activeTab,
    setActiveTab,
    activeLabel,
}: {
    store: any
    handleSave: () => void
    saving: boolean
    activeTab: string
    setActiveTab: (tab: string) => void
    activeLabel: string
}) {
    const { toggleSidebar } = useSidebar()

    return (
        <header className="sticky top-0 z-40 border-b border-light bg-[#fff] dark:bg-[#000]">
            <div className="mx-auto px-4 md:px-4 h-[52px] flex items-center justify-between gap-6 max-w-[1400px]">

                <div className="flex items-center gap-0 min-w-0">
                    <button
                        onClick={toggleSidebar}
                        className="md:hidden p-1 mr-3 text-on-surface-muted hover:text-foreground transition-colors shrink-0"
                        aria-label="Open navigation"
                    >
                        <Menu className="w-[18px] h-[18px]" />
                    </button>

                    <Link href="/" className="flex items-center shrink-0">
                        <img src="/favicon.ico" alt="Menengai Cloud" width={20} height={20} />
                    </Link>

                    <nav className="flex items-center text-[13px] min-w-0" aria-label="Breadcrumb">
                        <span className="text-on-surface-muted select-none px-2.5">/</span>
                        <Link
                            href={`/store/${store.slug}`}
                            className="text-on-surface-muted hover:text-foreground transition-colors whitespace-nowrap"
                        >
                            {store.name}
                        </Link>
                        <span className="text-on-surface-muted select-none px-2.5">/</span>
                        <button
                            onClick={() => setActiveTab('general')}
                            className="text-on-surface-muted hover:text-foreground transition-colors whitespace-nowrap"
                        >
                            Settings
                        </button>
                        <span className="text-on-surface-muted select-none px-2.5">/</span>
                        <span className="text-foreground font-semibold truncate">{activeLabel}</span>
                    </nav>
                </div>

            </div>
        </header>
    )
}

// ─── SettingsNav (desktop only) ───────────────────────────────────────────────

export function SettingsNav({
    activeTab,
    setActiveTab,
    TABS,
    user,
}: {
    activeTab: string
    setActiveTab: (tab: string) => void
    TABS: any[]
    user: {
        name: string
        email: string
        avatarUrl?: string
        accountHref?: string
        onSignOut?: () => void
    }
}) {
    return (
        <nav className="hidden md:flex flex-col w-64 shrink-0 border-r border-light h-[90vh]">
            <div className="flex-1 overflow-y-auto">
                <NavList activeTab={activeTab} onSelect={setActiveTab} TABS={TABS} />
            </div>
            <div className='bottom-0'>
                <AccountSection user={user} />
            </div>

        </nav>
    )
}

// ─── MobileSettingsNav ────────────────────────────────────────────────────────

export function MobileSettingsNav({
    activeTab,
    setActiveTab,
    TABS,
    user,
}: {
    activeTab: string
    setActiveTab: (tab: string) => void
    TABS: any[]
    user: {
        name: string
        email: string
        avatarUrl?: string
        accountHref?: string
        onSignOut?: () => void
    }
}) {
    const { openMobile, setOpenMobile } = useSidebar()

    const handleSelect = (id: string) => {
        setActiveTab(id)
        setOpenMobile(false)
    }

    return (
        <>
            {/* Solid overlay */}
            {openMobile && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-[#fff] dark:bg-[#000] backdrop-blur-sm"
                    onClick={() => setOpenMobile(false)}
                />
            )}

            {/* Drawer */}
            <div
                className="md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-200 ease-out min-w-[100vw]"
                style={{
                    backgroundColor: 'var(--background, #ffffff)',
                    transform: openMobile ? 'translateX(0)' : 'translateX(-100%)',
                    boxShadow: openMobile ? '0 25px 50px -12px rgba(0,0,0,0.25)' : 'none',
                }}
            >
                <div className="flex items-center justify-between px-5 h-[52px] border-b border-light shrink-0">
                    <span className="text-[13px] font-semibold text-foreground">Settings</span>
                    <button
                        onClick={() => setOpenMobile(false)}
                        className="p-1 text-on-surface-muted hover:text-foreground transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <NavList activeTab={activeTab} onSelect={handleSelect} TABS={TABS} />
                </div>

                <AccountSection user={user} />
            </div>
        </>
    )
}