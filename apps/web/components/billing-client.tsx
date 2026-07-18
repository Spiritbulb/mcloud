// components/billing-client.tsx
'use client'

import type { Plan, PlanLimits } from '@/lib/plans'

const BETA_URL = 'https://menengai.cloud/beta'

function formatLimit(limit: number): string {
    return Number.isFinite(limit) ? String(limit) : 'Unlimited'
}

export default function BillingClient({
    store,
    subscription,
    plan,
    limits,
    overOrders,
}: {
    store: { id: string; name: string; is_pro: boolean }
    subscription: { status: string; amount: number; currency: string; created_at: string | null } | null
    plan: Plan
    limits: PlanLimits
    overOrders: boolean
}) {
    const isPro = store.is_pro
    const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)

    return (
        <div className="max-w-2xl space-y-6 mx-auto">

            {/* Plan summary + limits */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div>
                    <h2 className="text-base font-semibold text-foreground">
                        {planLabel} plan limits
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        What is included in your current plan.
                    </p>
                </div>

                <div className="h-px bg-border" />

                <dl className="grid grid-cols-3 gap-4">
                    <div>
                        <dt className="text-xs text-muted-foreground">Products</dt>
                        <dd className="text-sm font-medium text-foreground mt-0.5">
                            {formatLimit(limits.products)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-muted-foreground">Team members</dt>
                        <dd className="text-sm font-medium text-foreground mt-0.5">
                            {formatLimit(limits.members)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-muted-foreground">Monthly orders</dt>
                        <dd className="text-sm font-medium text-foreground mt-0.5">
                            {formatLimit(limits.monthlyOrders)}
                        </dd>
                    </div>
                </dl>
            </div>

            {overOrders && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-6">
                    <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                        You have passed your {plan} plan&apos;s {formatLimit(limits.monthlyOrders)} orders this month. Your store keeps taking orders. Upgrade for higher limits.
                    </p>
                </div>
            )}

            {/* Plan status */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">
                            {isPro ? 'Pro Plan' : 'Free Plan'}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {isPro
                                ? `Active since ${subscription && subscription.created_at ? new Date(subscription.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}`
                                : 'Subscribe to unlock all Pro features'
                            }
                        </p>
                    </div>
                    {isPro ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                            <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
                            Pro
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            Free
                        </span>
                    )}
                </div>

                <div className="h-px bg-border" />

                <p className="text-sm text-muted-foreground leading-relaxed">
                    {isPro
                        ? 'Manage your subscription in the Menengai Cloud mobile app.'
                        : 'Pro subscriptions are managed in the Menengai Cloud mobile app. Join the beta to get the app and subscribe.'
                    }
                </p>

                {!isPro && (
                    <a
                        href={BETA_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                        Join the beta
                    </a>
                )}
            </div>

        </div>
    )
}
