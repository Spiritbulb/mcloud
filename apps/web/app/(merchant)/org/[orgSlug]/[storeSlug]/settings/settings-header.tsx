'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@mcloud/ui/dropdown-menu'
import { UpgradeChip } from '@/components/pro'
import { cn } from '@mcloud/ui/utils'

const BETA_URL = 'https://mcloud.co.ke/beta'

// ─── MSO ─────────────────────────────────────────────────────────────────────

function MSO({ icon, className, fill = 0 }: { icon: string; className?: string; fill?: number }) {
    return (
        <span
            className={cn('material-symbols-outlined select-none leading-none', className)}
            style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}
        >
            {icon}
        </span>
    )
}


// ─── SettingsHeader ───────────────────────────────────────────────────────────

export function SettingsHeader({
    store,
    activeLabel,
    mobileOpen,
    onOpenMobileNav,
}: {
    store: any
    activeLabel: string
    mobileOpen: boolean
    onOpenMobileNav?: () => void
}) {
    const isPro = store?.is_pro ?? false

    return (
        <header className="shrink-0 h-[57px] border-b border-border z-40 flex items-center px-4 md:px-5 gap-3">

            {/* Mobile menu button */}
            <button
                onClick={onOpenMobileNav}
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted transition-colors shrink-0"
                aria-label="Open navigation"
            >
                <MSO icon={mobileOpen ? 'close' : 'menu'} className="text-[20px]" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {store?.org && (
                    <>
                    <Link href={`/org`}>
                        <span
                            className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground max-w-[140px] truncate shrink-0"
                        >
                            <MSO icon="arrow_left" className="text-[12px]" />
                            Go Back
                        </span>
                    </Link>
                    </>
                )}

            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1 shrink-0">

                {/* Upgrade chip — free users only */}
                {!isPro && <UpgradeChip />}

                {/* Pro badge next to page title if this page is pro-gated */}
                {isPro && (
                    <div className="flex items-center gap-1.5 p-1 rounded-full bg-accent">
                        <MSO icon="workspace_premium" className="text-[13px] text-primary" fill={1} />
                    </div>
                )}

                {/* Support — desktop only */}
                <Link
                    href="https://mcloud.co.ke/support"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Support"
                    className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                >
                    <MSO icon="help_outline" className="text-[18px]" />
                </Link>

                {/* More dropdown — desktop only */}
                <div className="hidden md:block">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-muted transition-colors">
                                <MSO icon="more_horiz" className="text-[18px]" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-48 bg-background border border-border shadow-lg rounded-xl p-1"
                        >
                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-[13px]">
                                <Link
                                    href="https://mcloud.co.ke/docs"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5"
                                >
                                    <MSO icon="menu_book" className="text-[16px] text-muted-foreground" />
                                    Documentation
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-[13px]">
                                <Link
                                    href="https://mcloud.co.ke/changelog"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5"
                                >
                                    <MSO icon="new_releases" className="text-[16px] text-muted-foreground" />
                                    Changelog
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-[var(--md-sys-color-outline-variant)]" />
                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-[13px]">
                                <Link
                                    href="https://status.mcloud.co.ke"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    System Status
                                </Link>
                            </DropdownMenuItem>

                            {/* Get Pro — only for free users. Subscriptions happen in the
                                mobile app; point merchants to the beta to get it. */}
                            {!isPro && (
                                <>
                                    <DropdownMenuSeparator className="my-1 bg-[var(--md-sys-color-outline-variant)]" />
                                    <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-[13px]">
                                        <Link
                                            href={BETA_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2.5"
                                        >
                                            <MSO icon="workspace_premium" className="text-[16px] text-primary" fill={1} />
                                            <span className="text-primary font-medium">Get Pro (mobile app)</span>
                                        </Link>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

            </div>
        </header>
    )
}