'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Menu } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'

export function SettingsHeader({
    store,
    activeLabel,
}: {
    store: any
    activeLabel: string
}) {
    const { toggleSidebar } = useSidebar()
    const { openMobile } = useSidebar()

    if (openMobile) {
        return null
    }

    return (
        <header className="shrink-0 border-b border-light bg-background z-40">
            <div className="px-4 md:px-6 h-[72px] flex items-center justify-between gap-6">

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

            </div>
        </header>
    )
}