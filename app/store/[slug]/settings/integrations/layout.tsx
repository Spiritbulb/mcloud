'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SettingsSection } from '../settings-primitives' // Import from parent settings dir

const INTEGRATION_TABS = [
    { id: 'social', label: 'Social' },
    { id: 'payments', label: 'Payments' },
    { id: 'notifications', label: 'Notifications' },
]

export default function IntegrationsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex flex-col gap-1.5">
                <h2 className="text-3xl font-montserrat font-bold tracking-tight text-foreground">Integrations</h2>
                <p className="text-[14px] text-muted-foreground">
                    Manage your store's social links, payment providers, and notifications.
                </p>
            </div>

            <div>
                <nav className="flex flex-wrap gap-2" aria-label="Tabs">
                    {INTEGRATION_TABS.map((tab) => {
                        const isActive = pathname.includes(`/settings/integrations/${tab.id}`)
                        return (
                            <Link
                                key={tab.id}
                                href={`/settings/integrations/${tab.id}`}
                                className={cn(
                                    isActive
                                        ? 'bg-foreground text-background shadow-sm'
                                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                                    'px-4 py-2 rounded-full text-[13.5px] font-medium transition-all'
                                )}
                            >
                                {tab.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            <div className="pt-2">
                {children}
            </div>
        </div>
    )
}
