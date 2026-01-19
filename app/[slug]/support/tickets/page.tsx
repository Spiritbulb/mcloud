// /app/[slug]/support/tickets/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Plus } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { SupportTicketList } from "@/components/support/ticket-list"

export default async function SupportTicketsPage({
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

    // Get all support tickets
    const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching tickets:', error)
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Support Tickets"
                description="View and manage your support requests"
                actions={
                    <Link href={`/${slug}/support/tickets/new`}>
                        <button className="google-button-primary py-2 px-4 text-body-medium flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            New Ticket
                        </button>
                    </Link>
                }
            />

            <Card className="google-card border-outline bg-surface">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        Your Tickets
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <SupportTicketList tickets={tickets || []} slug={slug} />
                </CardContent>
            </Card>
        </div>
    )
}
