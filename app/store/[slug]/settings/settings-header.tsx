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
} from '@/components/ui/dropdown-menu'

// ─── MSO ─────────────────────────────────────────────────────────────────────

function MSO({ icon, className }: { icon: string; className?: string }) {
    return (
        <span
            className={`material-symbols-outlined select-none leading-none ${className ?? ''}`}
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
        >
            {icon}
        </span>
    )
}

// ─── ThemeToggle ──────────────────────────────────────────────────────────────

function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Avoid hydration mismatch — don't render until mounted
    useEffect(() => setMounted(true), [])
    if (!mounted) return <div className="w-8 h-8" />

    const isDark = theme === 'dark'

    return (
        <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center justify-center w-8 h-8 rounded-md text-[--md-sys-color-on-surface-variant] hover:bg-[--md-sys-color-surface-variant] transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
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
    return (
        <header className="shrink-0 h-[57px] border-b border-[--md-sys-color-outline-variant] bg-[--md-sys-color-surface] z-40 flex items-center px-4 md:px-5 gap-3">

            {/* Mobile menu button */}
            <button
                onClick={onOpenMobileNav}
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-[--md-sys-color-on-surface-variant] hover:bg-[--md-sys-color-surface-variant] transition-colors shrink-0"
                aria-label="Open navigation"
            >
                <MSO icon={mobileOpen ? 'close' : 'menu'} className="text-[20px]" />
            </button>

            {/* Page label — breadcrumb */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[13px] text-[--md-sys-color-on-surface-variant]">Settings</span>
                <MSO icon="chevron_right" className="text-[16px] text-[--md-sys-color-on-surface-variant] opacity-40 shrink-0" />
                <span className="text-[13px] font-medium text-[--md-sys-color-on-surface] truncate">
                    {activeLabel}
                </span>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1 shrink-0">

                {/* Theme toggle */}
                <ThemeToggle />

                {/* Support — desktop only */}
                <Link
                    href="https://menengai.cloud/support"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Support"
                    className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-[--md-sys-color-on-surface-variant] hover:bg-[--md-sys-color-surface-variant] transition-colors"
                >
                    <MSO icon="help_outline" className="text-[18px]" />
                </Link>

                {/* More dropdown — desktop only */}
                <div className="hidden md:block">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center justify-center w-8 h-8 rounded-md text-[--md-sys-color-on-surface-variant] hover:bg-[--md-sys-color-surface-variant] transition-colors">
                                <MSO icon="more_horiz" className="text-[18px]" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-48 bg-[--md-sys-color-surface] border border-[--md-sys-color-outline-variant] shadow-lg rounded-xl p-1"
                        >
                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-[13px]">
                                <Link
                                    href="https://menengai.cloud/docs"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5"
                                >
                                    <MSO icon="menu_book" className="text-[16px] text-[--md-sys-color-on-surface-variant]" />
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
                                    <MSO icon="new_releases" className="text-[16px] text-[--md-sys-color-on-surface-variant]" />
                                    Changelog
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-[--md-sys-color-outline-variant]" />
                            <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-[13px]">
                                <Link
                                    href="https://status.menengai.cloud"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[--md-sys-color-primary] shrink-0" />
                                    System Status
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

            </div>
        </header>
    )
}