// components/pro/index.tsx
'use client'

import { useParams } from 'next/navigation'
import { planAllowsRequired, type Plan } from '@mcloud/merchant/plans'
import { buttonClass } from '@mcloud/ui/kit/button'
import { FeatureGate } from '@mcloud/ui/kit/feature-gate'
import { Icon } from '@mcloud/ui/kit/icon'
import { webUrl } from '@/lib/host'

// Plans are bought from the org wallet in org Billing on the platform site; there is no app-store
// or in-app purchase. Every upgrade prompt in store settings links there.
function usePlansHref(): string {
    const { orgSlug } = useParams<{ orgSlug?: string }>()
    return webUrl(orgSlug ? `/org/${orgSlug}/billing` : '/org')
}

const PLAN_NAME = { hobby: 'Hobby', pro: 'Pro' } as const

// ─── ProGateInline ────────────────────────────────────────────────────────────

/**
 * Renders `children` when the store's plan includes the feature; otherwise says which plan does
 * and links to org Billing. Pass `plan` (preferred) or the legacy `isPro`.
 */
export function ProGateInline({
    isPro, plan, requires = 'hobby', feature, description, children,
}: {
    isPro?: boolean
    plan?: Plan
    requires?: 'hobby' | 'pro'
    feature: string
    description?: string
    children?: React.ReactNode
}) {
    const plansHref = usePlansHref()
    const unlocked = plan !== undefined ? planAllowsRequired(plan, requires) : !!isPro
    if (unlocked) return <>{children}</>

    return (
        <FeatureGate
            icon="workspace_premium"
            title={feature}
            description={description ?? `Available on the ${PLAN_NAME[requires]} plan and higher.`}
            action={<a href={plansHref} className={buttonClass('primary', 'sm')}>See plans</a>}
        />
    )
}

// ─── UpgradeChip ──────────────────────────────────────────────────────────────

/** Compact header link to org Billing, for stores on the free plan. */
export function UpgradeChip() {
    const plansHref = usePlansHref()
    return (
        <a href={plansHref} title="Upgrade plan" className={buttonClass('secondary', 'sm')}>
            <Icon name="workspace_premium" size={15} className="text-primary" />
            <span className="hidden md:inline">Upgrade</span>
        </a>
    )
}
