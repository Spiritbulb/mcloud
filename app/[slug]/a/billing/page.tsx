// /app/[slug]/manage/billing/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { DollarSign, CreditCard, FileText, TrendingUp } from "lucide-react"
import Link from "next/link"

export default async function ManageBillingPage({
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

    // Get subscription
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

    // Get invoices
    const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

    const totalPaid = invoices
        ?.filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount_due, 0) || 0

    const openInvoices = invoices?.filter(inv => inv.status === 'open').length || 0

    return (
        <div className="space-y-6">
            <PageHeader
                title="Billing Overview"
                description="Manage your billing and subscription"
            />

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="google-card border-outline bg-surface">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-on-surface">
                                    KES {(totalPaid / 100).toLocaleString()}
                                </p>
                                <p className="text-sm text-on-surface-variant">Total Paid</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Link href={`/${slug}/manage/billing/invoices`}>
                    <Card className="google-card border-outline bg-surface h-full hover:bg-surface-variant transition-colors cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950">
                                    <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-on-surface">{openInvoices}</p>
                                    <p className="text-sm text-on-surface-variant">Open Invoices</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/${slug}/manage/billing/subscription`}>
                    <Card className="google-card border-outline bg-surface h-full hover:bg-surface-variant transition-colors cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
                                    <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-on-surface capitalize">
                                        {subscription?.plan || 'Free'}
                                    </p>
                                    <p className="text-sm text-on-surface-variant">Current Plan</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Subscription Details */}
            {subscription && (
                <Card className="google-card border-outline bg-surface">
                    <CardHeader>
                        <CardTitle className="text-headline-small text-on-surface">
                            Subscription Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-on-surface-variant mb-1">Plan</p>
                                <p className="text-lg font-semibold text-on-surface capitalize">{subscription.plan}</p>
                            </div>
                            <div>
                                <p className="text-sm text-on-surface-variant mb-1">Status</p>
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 capitalize">
                                    {subscription.status}
                                </span>
                            </div>
                            {subscription.current_period_end && (
                                <div>
                                    <p className="text-sm text-on-surface-variant mb-1">Next Billing Date</p>
                                    <p className="text-lg font-semibold text-on-surface">
                                        {new Date(subscription.current_period_end).toLocaleDateString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Invoices */}
            <Card className="google-card border-outline bg-surface">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-headline-small text-on-surface">
                        Recent Invoices
                    </CardTitle>
                    <Link href={`/${slug}/manage/billing/invoices`}>
                        <button className="google-button-text text-sm">View All</button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {invoices && invoices.length > 0 ? (
                        <div className="space-y-2">
                            {invoices.map((invoice) => (
                                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border border-outline">
                                    <div>
                                        <p className="font-medium text-on-surface">{invoice.invoice_number}</p>
                                        <p className="text-sm text-on-surface-variant">
                                            {new Date(invoice.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-on-surface">
                                            KES {(invoice.amount_due / 100).toLocaleString()}
                                        </p>
                                        <span className={`text-xs px-2 py-1 rounded-full ${invoice.status === 'paid'
                                                ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
                                                : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400'
                                            }`}>
                                            {invoice.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-on-surface-variant mx-auto mb-4" />
                            <p className="text-sm text-on-surface-variant">No invoices yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
