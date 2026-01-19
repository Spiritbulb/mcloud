// /app/[slug]/support/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, Book, Mail, HelpCircle } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"

export default async function SupportPage({
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

    // Get open support tickets count
    const { count: openTickets } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'open')

    const supportOptions = [
        {
            title: "Support Tickets",
            description: `View and manage your support requests${openTickets ? ` (${openTickets} open)` : ''}`,
            icon: MessageSquare,
            href: `/${slug}/support/tickets`,
            badge: openTickets || 0,
        },
        {
            title: "Documentation",
            description: "Browse our comprehensive guides and tutorials",
            icon: Book,
            href: `/${slug}/support/docs`,
        },
        {
            title: "Contact Us",
            description: "Get in touch with our support team",
            icon: Mail,
            href: `/${slug}/support/contact`,
        },
        {
            title: "FAQ",
            description: "Find answers to common questions",
            icon: HelpCircle,
            href: `/${slug}/support/faq`,
        },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Support"
                description="Get help and find resources"
            />

            <div className="grid gap-6 md:grid-cols-2">
                {supportOptions.map((option) => {
                    const Icon = option.icon
                    return (
                        <Link key={option.title} href={option.href}>
                            <Card className="google-card border-outline bg-surface h-full hover:bg-surface-variant transition-all duration-200 cursor-pointer">
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                            <Icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-semibold text-on-surface">
                                                    {option.title}
                                                </h3>
                                                {option.badge && option.badge > 0 ? (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-on-primary">
                                                        {option.badge}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="text-sm text-on-surface-variant">
                                                {option.description}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            <Card className="google-card border-outline bg-surface-variant">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <HelpCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="text-lg font-semibold text-on-surface mb-2">
                                Need immediate help?
                            </h3>
                            <p className="text-sm text-on-surface-variant mb-3">
                                Our support team is available Monday to Friday, 9 AM - 6 PM EAT
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <a href="mailto:support@spiritbulb.com" className="text-sm text-primary hover:underline">
                                    support@spiritbulb.com
                                </a>
                                <span className="text-on-surface-variant">•</span>
                                <a href="tel:+254700000000" className="text-sm text-primary hover:underline">
                                    +254 700 000 000
                                </a>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
