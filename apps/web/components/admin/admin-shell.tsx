'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { AppShell } from '@mcloud/ui/kit/app-shell'
import { buttonClass } from '@mcloud/ui/kit/button'
import { Icon } from '@mcloud/ui/kit/icon'
import { activeNavId } from '@mcloud/ui/kit/nav-logic'
import { ADMIN_SECTIONS, type AdminUser } from './admin-nav'

export default function AdminShell({
    user,
    platformHref = '/org/onboarding',
    children,
}: {
    user: AdminUser
    platformHref?: string
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { resolvedTheme, setTheme } = useTheme()
    const activeId = activeNavId(ADMIN_SECTIONS, pathname, 'dashboard')

    // "Admin › Platform › Users". The overview page has no section worth naming.
    const section = ADMIN_SECTIONS.find(s => s.items.some(i => i.id === activeId))
    const item = section?.items.find(i => i.id === activeId)
    const crumbs = [
        { label: 'Admin' },
        ...(section && section.id !== 'overview' && section.label ? [{ label: section.label }] : []),
        { label: item?.label ?? 'Dashboard' },
    ]

    return (
        <AppShell
            sections={ADMIN_SECTIONS}
            activeId={activeId}
            brandHref="/admin"
            brandTag="Admin"
            user={user}
            menuLinks={[{ label: 'Back to platform', href: platformHref, icon: 'arrow_back' }]}
            signOutHref="/auth/logout"
            crumbs={crumbs}
            actions={
                <Link href={platformHref} className={buttonClass('ghost', 'sm')}>
                    <Icon name="arrow_back" size={14} />
                    <span className="hidden sm:inline">Back to platform</span>
                </Link>
            }
            // Admin pages manage their own scroll container and padding.
            content="bare"
            onToggleTheme={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
            {children}
        </AppShell>
    )
}
