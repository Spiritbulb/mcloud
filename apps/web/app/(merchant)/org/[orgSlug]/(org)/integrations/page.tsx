import { redirect, notFound } from 'next/navigation'
import { getSession } from '@mcloud/auth/server'
import { loginUrlWithReturn } from '@mcloud/auth/routes'
import { createClient } from '@mcloud/db/server'
import { Badge } from '@mcloud/ui/kit/badge'
import { Button } from '@mcloud/ui/kit/button'
import { Icon } from '@mcloud/ui/kit/icon'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'

// Placeholder: nothing here can be configured yet, so the page is not linked from the org nav.

const INTEGRATIONS = [
    {
        id: 'paystack',
        name: 'Paystack',
        description: 'Accept payments via Paystack across all stores in this organization.',
        icon: 'payments',
        category: 'Payments',
        href: null,
        comingSoon: false,
    },
    {
        id: 'stripe',
        name: 'Stripe',
        description: 'Process international payments with Stripe.',
        icon: 'credit_card',
        category: 'Payments',
        href: null,
        comingSoon: true,
    },
    {
        id: 'resend',
        name: 'Resend',
        description: 'Transactional email delivery for order confirmations and notifications.',
        icon: 'mail',
        category: 'Email',
        href: null,
        comingSoon: false,
    },
    {
        id: 'slack',
        name: 'Slack',
        description: 'Receive order and member activity notifications in your Slack workspace.',
        icon: 'chat',
        category: 'Notifications',
        href: null,
        comingSoon: true,
    },
    {
        id: 'analytics',
        name: 'Google Analytics',
        description: 'Connect GA4 to track storefront traffic and conversions.',
        icon: 'analytics',
        category: 'Analytics',
        href: null,
        comingSoon: true,
    },
    {
        id: 'zapier',
        name: 'Zapier',
        description: 'Automate workflows by connecting Menengai Cloud to thousands of apps.',
        icon: 'bolt',
        category: 'Automation',
        href: null,
        comingSoon: true,
    },
]

const CATEGORIES = [...new Set(INTEGRATIONS.map(i => i.category))]

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
    const { orgSlug } = await params
    const session = await getSession()
    if (!session?.user) redirect(loginUrlWithReturn(`/org/${orgSlug}/integrations`))

    const supabase = await createClient()
    const { data: org } = await supabase
        .from('orgs')
        .select('id')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    const { data: membership } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', org.id)
        .eq('user_id', session.user.id)
        .maybeSingle()

    if (!membership) notFound()

    // The layout already renders the org shell; this page is only its content.
    return (
        <div className="space-y-6">
            <PageHeader title="Integrations" description="Connect third-party services to your organization." />

            {CATEGORIES.map(category => (
                <Panel key={category} title={category} flush>
                    <ul className="divide-y divide-border">
                        {INTEGRATIONS.filter(i => i.category === category).map(integration => (
                            <li key={integration.id} className="flex items-start gap-3 px-4 py-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                                    <Icon name={integration.icon} size={17} className="text-muted-foreground" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                        <span className="text-[13px] font-medium text-foreground">{integration.name}</span>
                                        {integration.comingSoon && <Badge>Soon</Badge>}
                                    </span>
                                    <span className="mt-0.5 block text-[12px] text-muted-foreground">{integration.description}</span>
                                </span>
                                {!integration.comingSoon && <Button size="sm" disabled>Configure</Button>}
                            </li>
                        ))}
                    </ul>
                </Panel>
            ))}
        </div>
    )
}
