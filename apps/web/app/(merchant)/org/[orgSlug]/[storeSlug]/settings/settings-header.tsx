'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
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

const BETA_URL = 'https://menengai.cloud/beta'

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

// ─── ThemeToggle ──────────────────────────────────────────────────────────────

function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])
    if (!mounted) return <div className="w-8 h-8" />

    const isDark = theme === 'dark'

    return (
        <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center justify-center w-8 h-8 rounded-md text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
        >
            <MSO icon={isDark ? 'light_mode' : 'dark_mode'} className="text-[18px]" />
        </button>
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
        <header className="shrink-0 h-[57px] bg-[var(--md-sys-color-surface)] z-40 flex items-center px-4 md:px-5 gap-3">

            {/* Mobile menu button */}
            <button
                onClick={onOpenMobileNav}
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors shrink-0"
                aria-label="Open navigation"
            >
                <MSO icon={mobileOpen ? 'close' : 'menu'} className="text-[20px]" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {store?.org && (
                    <>
                        <span
                            className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)] max-w-[140px] truncate shrink-0"
                            title={`Org: ${store.org.name}`}
                        >
                            <MSO icon="domain" className="text-[12px]" />
                            <span className="truncate">{store.org.name}</span>
                        </span>
                        <MSO icon="chevron_right" className="text-[16px] text-[var(--md-sys-color-on-surface-variant)] opacity-40 shrink-0" />
                    </>
                )}
                <span className="text-[13px] text-[var(--md-sys-color-on-surface-variant)]">Settings</span>
                <MSO icon="chevron_right" className="text-[16px] text-[var(--md-sys-color-on-surface-variant)] opacity-40 shrink-0" />
                <span className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)] truncate">
                    {activeLabel}
                </span>

            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1 shrink-0">

                {/* Upgrade chip — free users only */}
                {!isPro && <UpgradeChip />}

                {/* Pro badge next to page title if this page is pro-gated */}
                {isPro && (
                    <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--md-sys-color-primary-container)]">
                        <MSO icon="workspace_premium" className="text-[13px] text-[var(--md-sys-color-primary)]" fill={1} />
                    </div>
                )}

                <ThemeToggle />

                {/* Support — desktop only */}
                <Link
                    href="https://menengai.cloud/support"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Support"
                    className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                >
                    <MSO icon="help_outline" className="text-[18px]" />
                </Link>

                {/* More dropdown — desktop only */}
                <div className="hidden md:block">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center justify-center w-8 h-8 rounded-md text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors">
                                <MSO icon="more_horiz" className="text-[18px]" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-48 bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)] shadow-lg rounded-xl p-1"
                        >
                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-[13px]">
                                <Link
                                    href="https://menengai.cloud/docs"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5"
                                >
                                    <MSO icon="menu_book" className="text-[16px] text-[var(--md-sys-color-on-surface-variant)]" />
                                    Documentation
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-[13px]">
                                <Link
                                    href="https://menengai.cloud/changelog"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5"
                                >
                                    <MSO icon="new_releases" className="text-[16px] text-[var(--md-sys-color-on-surface-variant)]" />
                                    Changelog
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-[var(--md-sys-color-outline-variant)]" />
                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-[13px]">
                                <Link
                                    href="https://status.menengai.cloud"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-sys-color-primary)] shrink-0" />
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
                                            <MSO icon="workspace_premium" className="text-[16px] text-[var(--md-sys-color-primary)]" fill={1} />
                                            <span className="text-[var(--md-sys-color-primary)] font-medium">Get Pro (mobile app)</span>
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