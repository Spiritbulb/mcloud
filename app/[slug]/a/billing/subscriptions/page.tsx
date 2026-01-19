// /app/[slug]/manage/billing/subscription/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Check, CreditCard, Calendar, AlertCircle } from "lucide-react"
import Link from "next/link"

export default async function ManageBillingSubscriptionPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get current subscription
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

    const plans = [
        {
            name: 'Free',
            price: 0,
            interval: 'forever',
            features: [
                '1 Organization',
                '2 Apps',
                '5 Domains',
                '10,000 events/month',
                'Basic Analytics',
                'Community Support',
            ],
            current: subscription?.plan === 'free' || !subscription,
        },
        {
            name: 'Pro',
            price: 2000,
            interval: 'month',
            features: [
                'Unlimited Organizations',
                'Unlimited Apps',
                'Unlimited Domains',
                '1M events/month',
                'Advanced Analytics',
                'Priority Support',
                'Custom Branding',
                'API Access',
            ],
            current: subscription?.plan === 'pro',
            popular: true,
        },
        {
            name: 'Enterprise',
            price: 10000,
            interval: 'month',
            features: [
                'Everything in Pro',
                'Unlimited events',
                'Dedicated Support',
                'SLA Guarantee',
                'Custom Integrations',
                'Advanced Security',
                'Team Training',
                'White Label',
            ],
            current: subscription?.plan === 'enterprise',
        },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Subscription"
                description="Manage your subscription and billing"
            />

            {/* Current Subscription */}
            {subscription && (
                <Card className="google-card border-outline bg-surface">
                    <CardHeader>
                        <CardTitle className="text-headline-small text-on-surface">
                            Current Subscription
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div>
                                <p className="text-sm text-on-surface-variant mb-1">Plan</p>
                                <p className="text-2xl font-bold text-on-surface capitalize">{subscription.plan}</p>
                            </div>
                            <div>
                                <p className="text-sm text-on-surface-variant mb-1">Status</p>
                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${subscription.status === 'active'
                                        ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
                                        : subscription.status === 'canceled'
                                            ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                                            : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400'
                                    }`}>
                                    {subscription.status === 'active' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                    {subscription.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm text-on-surface-variant mb-1">Next Billing Date</p>
                                <p className="text-lg font-semibold text-on-surface flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {subscription.current_period_end
                                        ? new Date(subscription.current_period_end).toLocaleDateString()
                                        : 'N/A'
                                    }
                                </p>
                            </div>
                        </div>

                        {subscription.cancel_at_period_end && (
                            <div className="mt-6 p-4 rounded-lg bg-orange-100 dark:bg-orange-950 border border-orange-200 dark:border-orange-900">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-orange-900 dark:text-orange-200">
                                            Subscription Canceling
                                        </p>
                                        <p className="text-sm text-orange-800 dark:text-orange-300 mt-1">
                                            Your subscription will end on {new Date(subscription.current_period_end).toLocaleDateString()}.
                                            You'll still have access until then.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {subscription.payment_method && (
                            <div className="mt-6 pt-6 border-t border-outline">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="h-5 w-5 text-on-surface-variant" />
                                        <div>
                                            <p className="text-sm font-medium text-on-surface">Payment Method</p>
                                            <p className="text-sm text-on-surface-variant">
                                                •••• •••• •••• {subscription.payment_method.last4 || '****'}
                                            </p>
                                        </div>
                                    </div>
                                    <button className="google-button-secondary py-2 px-4 text-sm">
                                        Update
                                    </button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Available Plans */}
            <div>
                <h2 className="text-headline-medium text-on-surface mb-4">Available Plans</h2>
                <div className="grid gap-6 md:grid-cols-3">
                    {plans.map((plan) => (
                        <Card
                            key={plan.name}
                            className={`google-card border-outline bg-surface relative ${plan.popular ? 'ring-2 ring-primary' : ''
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-medium">
                                        Most Popular
                                    </span>
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle className="text-title-large text-on-surface">
                                    {plan.name}
                                </CardTitle>
                                <div className="mt-4">
                                    <span className="text-4xl font-bold text-on-surface">
                                        KES {plan.price.toLocaleString()}
                                    </span>
                                    <span className="text-on-surface-variant">/{plan.interval}</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3 mb-6">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-on-surface-variant">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {plan.current ? (
                                    <button className="w-full google-button-secondary py-3 text-body-medium" disabled>
                                        Current Plan
                                    </button>
                                ) : (
                                    <button className="w-full google-button-primary py-3 text-body-medium">
                                        {subscription ? 'Switch Plan' : 'Get Started'}
                                    </button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Billing Information */}
            <Card className="google-card border-outline bg-surface-variant">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="text-lg font-semibold text-on-surface mb-2">
                                Need help choosing?
                            </h3>
                            <p className="text-sm text-on-surface-variant mb-3">
                                Our team is here to help you find the perfect plan for your needs.
                            </p>
                            <Link href={`/${slug}/support/contact`}>
                                <button className="google-button-text text-sm">
                                    Contact Sales
                                </button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
