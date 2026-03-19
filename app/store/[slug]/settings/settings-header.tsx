'use client'

import Link from 'next/link'
import { Menu, HelpCircle, ExternalLink, Bell, ChevronDown } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function SettingsHeader({
    store,
    activeLabel,
}: {
    store: any
    activeLabel: string
}) {
    const { toggleSidebar, openMobile } = useSidebar()

    if (openMobile) {
        return null
    }

    return (
        <header className="shrink-0 border-b border-light bg-background z-40">
            <div className="px-4 md:px-6 h-[72px] flex items-center justify-between gap-6">

                {/* Left: breadcrumb */}
                <div className="flex items-center gap-0 min-w-0">
                    <button
                        onClick={toggleSidebar}
                        className="md:hidden p-1 mr-3 text-on-surface-muted hover:text-foreground transition-colors shrink-0"
                        aria-label="Open navigation"
                    >
                        <Menu className="w-[18px] h-[18px]" />
                    </button>

                    <Link href="/" className="flex items-center shrink-0">
                        <img src="/favicon.ico" alt="Logo" width={20} height={20} />
                    </Link>

                    <nav className="flex items-center text-[13px] min-w-0" aria-label="Breadcrumb">
                        <span className="text-on-surface-muted select-none px-2.5">/</span>
                        <Link
                            href={`/store/${store?.slug}`}
                            className="text-on-surface-muted hover:text-foreground transition-colors whitespace-nowrap"
                        >
                            {store?.name}
                        </Link>
                        <span className="text-on-surface-muted select-none px-2.5">/</span>
                        <Link
                            href={`/store/${store?.slug}/settings/general`}
                            className="text-on-surface-muted hover:text-foreground transition-colors whitespace-nowrap"
                        >
                            Settings
                        </Link>
                        <span className="text-on-surface-muted select-none px-2.5">/</span>
                        <span className="text-foreground font-semibold truncate">{activeLabel}</span>
                    </nav>
                </div>

                {/* Right: desktop actions */}
                <div className="hidden md:flex items-center gap-1 shrink-0">

                    {/* Notifications */}
                    <button
                        className="relative p-2 text-on-surface-muted hover:text-foreground hover:bg-surface-muted rounded-md transition-colors"
                        aria-label="Notifications"
                    >
                        <Bell className="w-[17px] h-[17px]" />
                        {/* Unread dot — remove if not needed */}
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
                    </button>

                    {/* Support button */}
                    <Link
                        href="https://menengai.cloud/support"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-on-surface-muted hover:text-foreground hover:bg-surface-muted rounded-md transition-colors"
                    >
                        <HelpCircle className="w-[15px] h-[15px]" />
                        <span>Support</span>
                    </Link>

                    {/* Misc dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1 px-2.5 py-1.5 text-[13px] text-on-surface-muted hover:text-foreground hover:bg-surface-muted rounded-md transition-colors">
                                <span>More</span>
                                <ChevronDown className="w-[13px] h-[13px]" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-[#425e7b]/80 backdrop-blur-sm text-white ">
                            <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href="https://menengai.cloud/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                    <ExternalLink className="w-[14px] h-[14px]" />
                                    Documentation
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href="https://menengai.cloud/changelog" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                    <ExternalLink className="w-[14px] h-[14px]" />
                                    Changelog
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href="https://status.menengai.cloud" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
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