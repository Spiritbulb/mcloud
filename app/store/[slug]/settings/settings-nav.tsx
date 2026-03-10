'use client'

import { useState } from 'react'
import { X, LogOut, Settings2, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    useSidebar,
} from '@/components/ui/sidebar'
import type { TabId } from './settings-shell'

type Tab = { id: string; label: string; icon: React.ReactNode; pro?: boolean }
type NavUser = {
    name: string
    email: string
    avatarUrl?: string
    accountHref?: string
    onSignOut?: () => void
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
        <SidebarMenu className="flex flex-col gap-0 p-0">
            {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                    <SidebarMenuItem
                        key={tab.id}
                        className="border-b border-light last:border-b-0 rounded-none m-0 list-none"
                    >
                        <SidebarMenuButton
                            onClick={() => onSelect(tab.id as TabId)}
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

function AccountSection({ user }: { user: NavUser }) {
    const [open, setOpen] = useState(false)

    const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    return (
        <div className="relative border-t border-light mt-auto shrink-0">
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute bottom-full left-0 right-0 z-20 bg-background border border-light shadow-lg">
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
                                onClick={() => { setOpen(false); user.onSignOut?.() }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-on-surface-muted hover:text-foreground hover:bg-[#425e7b]/10 transition-colors text-left"
                            >
                                <LogOut className="w-[14px] h-[14px] shrink-0" />
                                <span>Sign out</span>
                            </button>
                        )}
                    </div>
                </>
            )}

            <button
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left',
                    open ? 'bg-[#425e7b]/10' : 'hover:bg-[#425e7b]/10'
                )}
            >
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#425e7b] flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-[9px] font-bold text-white leading-none">{initials}</span>
                    )}
                </span>
                <span className="flex-1 min-w-0">
                    <span className="block text-[12px] font-medium text-foreground truncate leading-tight">{user.name}</span>
                    <span className="block text-[11px] text-on-surface-muted truncate leading-tight mt-0.5">{user.email}</span>
                </span>
                <ChevronUp className={cn(
                    'w-[13px] h-[13px] shrink-0 text-on-surface-muted transition-transform duration-150',
                    open ? 'rotate-0' : 'rotate-180'
                )} />
            </button>
        </div>
    )
}

// ─── SettingsNav (desktop) ────────────────────────────────────────────────────

export function SettingsNav({
    activeTab, onSelect, TABS, user,
}: {
    activeTab: string
    onSelect: (id: TabId) => void
    TABS: readonly Tab[]
    user: NavUser
}) {
    return (
        <nav className="hidden md:flex flex-col w-90 h-full overflow-y-auto shrink-0 border-r border-light">
            <div className="flex-1">
                <NavList activeTab={activeTab} onSelect={onSelect} TABS={TABS} />
            </div>
            <AccountSection user={user} />
        </nav>
    )
}

// ─── MobileSettingsNav ────────────────────────────────────────────────────────

export function MobileSettingsNav({
    activeTab, onSelect, TABS, user,
}: {
    activeTab: string
    onSelect: (id: TabId) => void
    TABS: readonly Tab[]
    user: NavUser
}) {
    const { openMobile, setOpenMobile } = useSidebar()

    const handleSelect = (id: TabId) => {
        onSelect(id)
        setOpenMobile(false)
    }

    return (
        <>
            {openMobile && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-[#fff]/80 dark:bg-[#000]/80 backdrop-blur-sm"
                    onClick={() => setOpenMobile(false)}
                />
            )}
            <div
                className="md:hidden fixed inset-y-0 left-0 z-50 flex flex-col min-w-[100vw] transition-transform duration-200 ease-out"
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