import { PageHeader } from "@/components/admin/page-header"
import { StatCard } from "@/components/admin/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, CreditCard, TrendingUp, Calendar } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"

export default async function BillingPage({
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

    // Get active subscription
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

    // Get payment methods
    const { data: paymentMethods } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .limit(1)

    const defaultPaymentMethod = paymentMethods?.[0]

    // Get invoices for this month and last month
    const now = new Date()
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

    const { data: thisMonthInvoices } = await supabase
        .from('invoices')
        .select('amount_due')
        .eq('user_id', user.id)
        .gte('created_at', firstDayThisMonth)

    const { data: lastMonthInvoices } = await supabase
        .from('invoices')
        .select('amount_due')
        .eq('user_id', user.id)
        .gte('created_at', firstDayLastMonth)
        .lte('created_at', lastDayLastMonth)

    const thisMonthTotal = thisMonthInvoices?.reduce((sum, inv) => sum + inv.amount_due, 0) || 0
    const lastMonthTotal = lastMonthInvoices?.reduce((sum, inv) => sum + inv.amount_due, 0) || 0

    const monthGrowth = lastMonthTotal
        ? (((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1)
        : '0'

    // Calculate available credit (total paid - total used)
    const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('amount_paid')
        .eq('user_id', user.id)
        .eq('status', 'paid')

    const totalPaid = paidInvoices?.reduce((sum, inv) => sum + inv.amount_paid, 0) || 0
    const availableCredit = totalPaid - thisMonthTotal

    // Get next payment date from subscription
    const nextPaymentDate = subscription?.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'N/A'

    const nextPaymentAmount = subscription?.subscription_plans?.price_monthly || 0

    // Format payment method
    const getPaymentMethodDisplay = () => {
        if (!defaultPaymentMethod) return 'No method'

        if (defaultPaymentMethod.type === 'card') {
            return `•••• ${defaultPaymentMethod.card_last4}`
        } else if (defaultPaymentMethod.type === 'mpesa') {
            return `M-Pesa ${defaultPaymentMethod.mpesa_phone?.slice(-4)}`
        }
        return defaultPaymentMethod.type
    }

    const getPaymentMethodSubtitle = () => {
        if (!defaultPaymentMethod) return 'Add payment method'

        if (defaultPaymentMethod.type === 'card') {
            return `${defaultPaymentMethod.card_brand} ending in ${defaultPaymentMethod.card_last4}`
        } else if (defaultPaymentMethod.type === 'mpesa') {
            return `M-Pesa ${defaultPaymentMethod.mpesa_phone}`
        }
        return defaultPaymentMethod.type
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0,
        }).format(amount / 100) // Assuming amounts are stored in cents
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Billing Overview"
                description="Manage your billing and subscription details"
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Current Balance"
                    value={formatCurrency(availableCredit)}
                    subtitle="Available credit"
                    icon={DollarSign}
                    colorClass="bg-surface-variant"
                />
                <StatCard
                    title="This Month"
                    value={formatCurrency(thisMonthTotal)}
                    subtitle={`${monthGrowth > '0' ? '+' : ''}${monthGrowth}% from last month`}
                    icon={TrendingUp}
                    colorClass="bg-surface-variant"
                />
                <StatCard
                    title="Next Payment"
                    value={nextPaymentDate}
                    subtitle={`${formatCurrency(nextPaymentAmount)} due`}
                    icon={Calendar}
                    colorClass="bg-surface-variant"
                />
                <StatCard
                    title="Payment Method"
                    value={getPaymentMethodDisplay()}
                    subtitle={getPaymentMethodSubtitle()}
                    icon={CreditCard}
                    colorClass="bg-surface-variant"
                />
            </div>

            <Card className="google-card border-outline bg-surface">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        Current Plan
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!subscription ? (
                        <div className="text-center py-8">
                            <h3 className="text-lg font-semibold text-on-surface mb-2">
                                No active subscription
                            </h3>
                            <p className="text-sm text-on-surface-variant mb-4">
                                Choose a plan to get started
                            </p>
                            <Link href={`/${slug}/billing/subscription`}>
                                <button className="google-button-primary py-2 px-4 text-sm">
                                    View Plans
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-on-surface mb-2">
                                    {subscription.subscription_plans?.name || 'Custom Plan'}
                                </h3>
                                <p className="text-on-surface-variant mb-4">
                                    {subscription.subscription_plans?.description || 'Your current subscription'}
                                </p>
                                <ul className="space-y-2 text-sm text-on-surface-variant">
                                    {(subscription.subscription_plans?.features || []).map((feature: string, index: number) => (
                                        <li key={index} className="flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold text-on-surface">
                                    {formatCurrency(subscription.subscription_plans?.price_monthly || 0)}
                                </p>
                                <p className="text-sm text-on-surface-variant">
                                    per {subscription.billing_cycle}
                                </p>
                                <Link href={`/${slug}/billing/subscription`}>
                                    <button className="google-button-secondary py-2 px-4 text-sm mt-4">
                                        Change Plan
                                    </button>
                                </Link>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
