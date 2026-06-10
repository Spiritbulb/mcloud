'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@mcloud/ui/utils'
import { OrgNav, MobileOrgNav, ORG_TABS } from './org-nav'
import type { OrgTabId } from './org-nav'

type OrgShellOrg = {
    id: string
    name: string
    slug: string
    logo_url?: string | null
    type: string
}

type OrgShellUser = {
    name: string
    email: string
    avatarUrl?: string
}

export default function OrgShell({
    children,
    org,
    user,
    orgSlug,
}: {
    children: React.ReactNode
    org: OrgShellOrg
    user: OrgShellUser
    orgSlug: string
}) {
    const pathname = usePathname()
    const [mobileNavOpen, setMobileNavOpen] = useState(false)

    useEffect(() => {
        const handler = () => setMobileNavOpen(true)
        window.addEventListener('mobile-nav-open', handler)
        return () => window.removeEventListener('mobile-nav-open', handler)
    }, [])

    const activeId = (() => {
        const isRoot = pathname === `/org/${orgSlug}` || pathname === `/org/${orgSlug}/`
        if (isRoot) return 'home' as OrgTabId
        const matched = ORG_TABS.find((t) => {
            if (t.id === 'home') return false
            return pathname.includes(`/org/${orgSlug}/${t.id}`)
        })
        return (matched?.id ?? 'home') as OrgTabId
    })()

    const activeLabel = ORG_TABS.find((t) => t.id === activeId)?.label ?? 'Overview'

    const navOrg = {
        name: org.name,
        slug: org.slug,
        logo_url: org.logo_url,
    }

    const navUser = {
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        onSignOut: () => { window.location.href = '/auth/logout' },
    }

    return (
        <div data-org-shell className="h-[100dvh] overflow-hidden flex bg-background">
            {/* Desktop sidebar */}
            <OrgNav
                org={navOrg}
                user={navUser}
                activeTab={activeId}
                orgSlug={orgSlug}
            />

            {/* Mobile drawer */}
            <MobileOrgNav
                org={navOrg}
                user={navUser}
                activeTab={activeId}
                orgSlug={orgSlug}
                open={mobileNavOpen}
                onOpen={() => setMobileNavOpen(true)}
                onClose={() => setMobileNavOpen(false)}
            />

            {/* Main content */}
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
                {/* Header */}
                <header className="shrink-0 h-[57px] bg-[var(--md-sys-color-surface)] z-40 flex items-center px-4 md:px-5 gap-3 border-b border-[var(--md-sys-color-outline-variant)]/40">
                    <button
                        onClick={() => setMobileNavOpen(true)}
                        className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors shrink-0"
                        aria-label="Open navigation"
                    >
                        <span className="material-symbols-outlined text-[20px]">
                            {mobileNavOpen ? 'close' : 'menu'}
                        </span>
                    </button>

                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[13px] text-[var(--md-sys-color-on-surface-variant)]">{org.name}</span>
                        <span className="material-symbols-outlined text-[16px] text-[var(--md-sys-color-on-surface-variant)] opacity-40 shrink-0">chevron_right</span>
                        <span className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)] truncate">{activeLabel}</span>
                    </div>
                </header>

                <main className="flex-1 min-h-0 overflow-y-auto px-6 md:px-10 py-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
