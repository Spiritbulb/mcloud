import { redirect, notFound } from 'next/navigation'
import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import OrgShell from '../org-shell'
import { cn } from '@/lib/utils'

function MSO({ icon, className, fill = 0 }: { icon: string; className?: string; fill?: number }) {
    return (
        <span className={cn('material-symbols-outlined select-none leading-none', className)}
            style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}>
            {icon}
        </span>
    )
}

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
    const session = await auth0.getSession()
    if (!session?.user) redirect('/auth/login')

    const supabase = await createClient()
    const { data: org } = await supabase
        .from('orgs')
        .select('id, name, slug, logo_url, type, owner_id')
        .eq('slug', orgSlug)
        .single()

    if (!org) notFound()

    const { data: membership } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', org.id)
        .eq('user_id', session.user.sub)
        .maybeSingle()

    if (!membership) notFound()

    const { data: userRow } = await supabase.from('users').select('name, email, avatar_url').eq('id', session.user.sub).single()
    const shellUser = {
        name: userRow?.name ?? session.user.name ?? 'Account',
        email: userRow?.email ?? session.user.email ?? '',
        avatarUrl: userRow?.avatar_url ?? undefined,
    }

    return (
        <OrgShell org={org} user={shellUser} orgSlug={orgSlug}>
            <div className="max-w-3xl mx-auto space-y-8">
                <div>
                    <h1 className="text-[16px] font-semibold text-[var(--md-sys-color-on-surface)]">Integrations</h1>
                    <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5">
                        Connect third-party services to your organization.
                    </p>
                </div>

                {CATEGORIES.map(category => (
                    <section key={category} className="space-y-3">
                        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)]">
                            {category}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {INTEGRATIONS.filter(i => i.category === category).map(integration => (
                                <div
                                    key={integration.id}
                                    className="relative flex items-start gap-4 rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-4"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-[var(--md-sys-color-primary-container)] flex items-center justify-center shrink-0">
                                        <MSO
                                            icon={integration.icon}
                                            className="text-[20px] text-[var(--md-sys-color-primary)]"
                                            fill={1}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[13px] font-medium text-[var(--md-sys-color-on-surface)]">
                                                {integration.name}
                                            </p>
                                            {integration.comingSoon && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)]">
                                                    Soon
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-0.5 leading-relaxed">
                                            {integration.description}
                                        </p>
                                    </div>
                                    {!integration.comingSoon && (
                                        <button
                                            className="shrink-0 h-7 px-3 rounded-full border border-[var(--md-sys-color-outline-variant)] text-[12px] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                                            disabled
                                        >
                                            Configure
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </OrgShell>
    )
}
