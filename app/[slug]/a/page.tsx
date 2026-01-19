// /app/[slug]/manage/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import {
    Building2,
    Users,
    Globe,
    Activity,
    TrendingUp,
    DollarSign,
    Package,
    BarChart3
} from "lucide-react"
import Link from "next/link"

export default async function ManagePage({
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

    // Get all organizations owned by this user
    const { data: organizations, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (orgsError) {
        console.error('Error fetching organizations:', orgsError)
    }

    const orgIds = organizations?.map(org => org.id) || []

    // Get all apps across organizations
    const { count: totalApps } = await supabase
        .from('apps')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

    // Get all domains
    const { data: apps } = await supabase
        .from('apps')
        .select('id')
        .eq('user_id', user.id)

    const appIds = apps?.map(app => app.id) || []

    const { count: totalDomains } = await supabase
        .from('domains')
        .select('*', { count: 'exact', head: true })
        .in('app_id', appIds)

    // Get total events (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('app_id', appIds)
        .gte('created_at', thirtyDaysAgo.toISOString())

    // Get team members count
    const { count: totalMembers } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .in('organization_id', orgIds)

    const stats = [
        {
            title: "Organizations",
            value: organizations?.length || 0,
            icon: Building2,
            href: `/${slug}/manage/organizations`,
            description: "Total organizations",
            color: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-100 dark:bg-blue-950",
        },
        {
            title: "Apps",
            value: totalApps || 0,
            icon: Package,
            href: `/${slug}/manage/apps`,
            description: "Active applications",
            color: "text-green-600 dark:text-green-400",
            bgColor: "bg-green-100 dark:bg-green-950",
        },
        {
            title: "Domains",
            value: totalDomains || 0,
            icon: Globe,
            href: `/${slug}/apps/domains`,
            description: "Connected domains",
            color: "text-purple-600 dark:text-purple-400",
            bgColor: "bg-purple-100 dark:bg-purple-950",
        },
        {
            title: "Team Members",
            value: totalMembers || 0,
            icon: Users,
            href: `/${slug}/manage/accounts/team`,
            description: "Across all organizations",
            color: "text-orange-600 dark:text-orange-400",
            bgColor: "bg-orange-100 dark:bg-orange-950",
        },
        {
            title: "Events (30d)",
            value: totalEvents || 0,
            icon: Activity,
            href: `/${slug}/manage/analytics`,
            description: "Last 30 days",
            color: "text-pink-600 dark:text-pink-400",
            bgColor: "bg-pink-100 dark:bg-pink-950",
        },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Management Dashboard"
                description="Overview of all your organizations and apps"
            />

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <Link key={stat.title} href={stat.href}>
                            <Card className="google-card border-outline bg-surface h-full hover:bg-surface-variant transition-colors cursor-pointer">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.bgColor}`}>
                                            <Icon className={`h-5 w-5 ${stat.color}`} />
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-on-surface mb-1">
                                        {stat.value.toLocaleString()}
                                    </p>
                                    <p className="text-sm font-medium text-on-surface-variant mb-1">
                                        {stat.title}
                                    </p>
                                    <p className="text-xs text-on-surface-variant">
                                        {stat.description}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            {/* Organizations Quick View */}
            <Card className="google-card border-outline bg-surface">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-headline-small text-on-surface">
                        Your Organizations
                    </CardTitle>
                    <Link href={`/${slug}/manage/organizations`}>
                        <button className="google-button-text text-sm">
                            View All
                        </button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {organizations && organizations.length > 0 ? (
                        <div className="space-y-3">
                            {organizations.slice(0, 5).map((org) => (
                                <Link key={org.id} href={`/${slug}/manage/organizations/${org.slug}`}>
                                    <div className="flex items-center justify-between p-4 rounded-lg border border-outline hover:bg-surface-variant transition-colors cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                                <Building2 className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-on-surface">{org.name}</p>
                                                <p className="text-sm text-on-surface-variant">/{org.slug}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-on-surface-variant">
                                                Created {new Date(org.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Building2 className="h-12 w-12 text-on-surface-variant mx-auto mb-4" />
                            <p className="text-sm text-on-surface-variant">No organizations yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-3">
                <Link href={`/${slug}/manage/organizations/new`}>
                    <Card className="google-card border-outline bg-surface h-full hover:bg-surface-variant transition-colors cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    <Building2 className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-on-surface">Create Organization</h3>
                                    <p className="text-sm text-on-surface-variant">Set up a new organization</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/${slug}/apps/new`}>
                    <Card className="google-card border-outline bg-surface h-full hover:bg-surface-variant transition-colors cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    <Package className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-on-surface">Create App</h3>
                                    <p className="text-sm text-on-surface-variant">Add a new application</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/${slug}/manage/analytics`}>
                    <Card className="google-card border-outline bg-surface h-full hover:bg-surface-variant transition-colors cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    <BarChart3 className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-on-surface">View Analytics</h3>
                                    <p className="text-sm text-on-surface-variant">Cross-app insights</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
