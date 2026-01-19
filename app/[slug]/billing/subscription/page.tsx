// /app/[slug]/billing/subscription/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { SubscriptionActions } from "@/components/billing/subscription-actions"

export default async function SubscriptionPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    // Get all available plans
    const { data: plans } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true })

    // Get user's current subscription
    const { data: currentSubscription } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

    const currentPlanId = currentSubscription?.plan_id

    return (
        <div className="space-y-6">
            <PageHeader
                title="Subscription Plans"
                description="Choose the plan that's right for you"
            />

            {currentSubscription && (
                <Card className="google-card border-outline bg-surface-variant">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-on-surface-variant">Current Plan</p>
                                <p className="text-xl font-bold text-on-surface">
                                    {currentSubscription.subscription_plans?.name}
                                </p>
                                <p className="text-sm text-on-surface-variant mt-1">
                                    {currentSubscription.billing_cycle === 'monthly' ? 'Billed monthly' : 'Billed annually'}
                                    {currentSubscription.current_period_end &&
                                        ` • Renews ${new Date(currentSubscription.current_period_end).toLocaleDateString()}`
                                    }
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-on-surface">
                                    {new Intl.NumberFormat('en-KE', {
                                        style: 'currency',
                                        currency: 'KES',
                                        minimumFractionDigits: 0,
                                    }).format((currentSubscription.subscription_plans?.price_monthly || 0) / 100)}
                                </p>
                                <p className="text-sm text-on-surface-variant">per month</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-3">
                {plans?.map((plan) => {
                    const isCurrent = plan.id === currentPlanId
                    const isDowngrade = currentSubscription &&
                        plan.price_monthly < (currentSubscription.subscription_plans?.price_monthly || 0)

                    return (
                        <Card
                            key={plan.id}
                            className={`google-card border-outline bg-surface ${isCurrent ? "ring-2 ring-primary" : ""
                                }`}
                        >
                            <CardHeader>
                                <CardTitle className="text-headline-small text-on-surface">
                                    {plan.name}
                                </CardTitle>
                                <div className="mt-4">
                                    <span className="text-3xl font-bold text-on-surface">
                                        {plan.price_monthly === 0
                                            ? 'Free'
                                            : new Intl.NumberFormat('en-KE', {
                                                style: 'currency',
                                                currency: 'KES',
                                                minimumFractionDigits: 0,
                                            }).format(plan.price_monthly / 100)
                                        }
                                    </span>
                                    {plan.price_monthly !== 0 && (
                                        <span className="text-on-surface-variant">/month</span>
                                    )}
                                </div>
                                {plan.description && (
                                    <p className="text-sm text-on-surface-variant mt-2">
                                        {plan.description}
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3 mb-6">
                                    {(plan.features as string[])?.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-on-surface-variant">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <SubscriptionActions
                                    planId={plan.id}
                                    planName={plan.name}
                                    planPrice={plan.price_monthly}
                                    isCurrent={isCurrent}
                                    isDowngrade={isDowngrade}
                                    userId={user.id}
                                    currentSubscriptionId={currentSubscription?.id}
                                    slug={slug}
                                />
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {!plans || plans.length === 0 && (
                <Card className="google-card border-outline bg-surface">
                    <CardContent className="py-12 text-center">
                        <p className="text-on-surface-variant">No subscription plans available</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
