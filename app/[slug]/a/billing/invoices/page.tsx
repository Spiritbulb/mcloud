// /app/[slug]/manage/billing/invoices/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { InvoiceList } from "@/components/billing/invoice-list"

export default async function ManageBillingInvoicesPage({
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

    // Get all invoices for this user
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching invoices:', error)
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Invoices"
                description="View and download your billing invoices"
            />

            <Card className="google-card border-outline bg-surface">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        Invoice History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <InvoiceList invoices={invoices || []} slug={slug} />
                </CardContent>
            </Card>
        </div>
    )
}
