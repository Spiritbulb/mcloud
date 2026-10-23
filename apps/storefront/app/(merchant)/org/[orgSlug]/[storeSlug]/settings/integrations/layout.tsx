'use client'

import { usePathname } from 'next/navigation'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Tabs } from '@mcloud/ui/kit/tabs'

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
    const settingsBase = pathname.replace(/\/integrations.*$/, '')
    const active = INTEGRATION_TABS.find((t) => pathname.includes(`/settings/integrations/${t.id}`))?.id ?? ''

    return (
        <div className="space-y-6">
            <PageHeader title="Integrations" description="Your store's social links, payment providers and notifications." />
            <Tabs
                label="Integrations"
                value={active}
                items={INTEGRATION_TABS.map((t) => ({ ...t, href: `${settingsBase}/integrations/${t.id}` }))}
            />
            <div>{children}</div>
        </div>
    )
}
