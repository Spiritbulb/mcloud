'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { AdminDesktopNav, AdminMobileNav, ADMIN_SECTIONS, getActiveId } from './admin-nav'
import type { AdminUser } from './admin-nav'

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

    const activeLabel = ADMIN_SECTIONS
        .flatMap(s => s.items)
        .find(i => i.id === activeId)?.label ?? 'Dashboard'

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
                <header className="shrink-0 h-[57px] bg-[var(--md-sys-color-surface)] z-40 flex items-center px-4 md:px-5 gap-3">
                    <button
                        onClick={() => setMobileNavOpen(true)}
                        className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors shrink-0"
                        aria-label="Open navigation"
                    >
                        <span className="material-symbols-outlined select-none leading-none text-[20px]">menu</span>
                    </button>

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-[13px] text-[var(--md-sys-color-on-surface-variant)]">Admin</span>
                        <span className="material-symbols-outlined select-none leading-none text-[16px] text-[var(--md-sys-color-on-surface-variant)] opacity-40">
                            chevron_right
                        </span>
                        <span className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)] truncate">
                            {activeLabel}
                        </span>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    {children}
                </main>
            </div>
        </div>
    )
}
