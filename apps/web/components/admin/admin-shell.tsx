'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminDesktopNav, AdminMobileNav, ADMIN_SECTIONS, getActiveId } from './admin-nav'
import type { AdminUser } from './admin-nav'
import { Icon } from '@mcloud/ui/kit/icon'
import { buttonClass } from '@mcloud/ui/kit/button'

export default function AdminShell({
    user,
    children,
}: {
    user: AdminUser
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const activeId = getActiveId(pathname)
    const [mobileNavOpen, setMobileNavOpen] = useState(false)

    // "Admin › Platform › Users". The overview page has no section worth naming.
    const section = ADMIN_SECTIONS.find(s => s.items.some(i => i.id === activeId))
    const item = section?.items.find(i => i.id === activeId)
    const crumbs = [
        'Admin',
        ...(section && section.id !== 'overview' ? [section.label] : []),
        item?.label ?? 'Dashboard',
    ]

    return (
        <div className="h-[100dvh] overflow-hidden flex bg-background">

            {/* Desktop sidebar */}
            <AdminDesktopNav user={user} activeId={activeId} />

            {/* Mobile drawer */}
            <AdminMobileNav
                user={user}
                activeId={activeId}
                open={mobileNavOpen}
                onClose={() => setMobileNavOpen(false)}
                onOpen={() => setMobileNavOpen(true)}
            />

            {/* Main area */}
            <div className="flex flex-col flex-1 min-w-0 min-h-0">

                {/* Top header */}
                <header className="shrink-0 h-12 z-40 flex items-center gap-3 border-b border-border bg-background px-4 md:px-6">
                    <button
                        onClick={() => setMobileNavOpen(true)}
                        className="md:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Open navigation"
                    >
                        <Icon name="menu" size={20} />
                    </button>

                    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]">
                        {crumbs.map((c, i) => (
                            <span key={`${c}-${i}`} className="flex min-w-0 items-center gap-1.5">
                                {i > 0 && <Icon name="chevron_right" size={14} className="text-muted-foreground/50" />}
                                <span
                                    aria-current={i === crumbs.length - 1 ? 'page' : undefined}
                                    className={i === crumbs.length - 1 ? 'truncate font-medium text-foreground' : 'text-muted-foreground'}
                                >
                                    {c}
                                </span>
                            </span>
                        ))}
                    </nav>

                    <Link href="/org" className={buttonClass('ghost', 'sm')}>
                        <Icon name="arrow_back" size={14} />
                        <span className="hidden sm:inline">Back to platform</span>
                    </Link>
                </header>

                {/* Page content */}
                <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    {children}
                </main>
            </div>
        </div>
    )
}
