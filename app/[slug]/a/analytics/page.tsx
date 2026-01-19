// /app/[slug]/manage/analytics/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { BarChart3, TrendingUp, Users, Activity, Globe, MousePointer } from "lucide-react"

export default async function ManageAnalyticsPage({
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

    // Get all apps
    const { data: apps } = await supabase
        .from('apps')
        .select('id, name, slug')
        .eq('user_id', user.id)

    const appIds = apps?.map(app => app.id) || []

    // Get analytics for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('app_id', appIds)
        .gte('created_at', thirtyDaysAgo.toISOString())

    const { count: uniqueUsers } = await supabase
        .from('events')
        .select('user_id', { count: 'exact', head: true })
        .in('app_id', appIds)
        .gte('created_at', thirtyDaysAgo.toISOString())

    const { count: pageViews } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('app_id', appIds)
        .eq('event_type', 'page_view')
        .gte('created_at', thirtyDaysAgo.toISOString())

    // Get top apps by events
    const { data: topApps } = await supabase
        .from('events')
        .select('app_id, apps(name, slug)')
        .in('app_id', appIds)
        .gte('created_at', thirtyDaysAgo.toISOString())

    const appEventCounts = topApps?.reduce((acc: any, event: any) => {
        const appId = event.app_id
        if (!acc[appId]) {
            acc[appId] = {
                name: event.apps?.name || 'Unknown',
                slug: event.apps?.slug || '',
                count: 0
            }
        }
        acc[appId].count++
        return acc
    }, {})

    const sortedApps = Object.values(appEventCounts || {})
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5)

    const stats = [
        {
            title: "Total Events",
            value: (totalEvents || 0).toLocaleString(),
            icon: Activity,
            description: "Last 30 days",
            color: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-100 dark:bg-blue-950",
        },
        {
            title: "Unique Users",
            value: (uniqueUsers || 0).toLocaleString(),
            icon: Users,
            description: "Last 30 days",
            color: "text-green-600 dark:text-green-400",
            bgColor: "bg-green-100 dark:bg-green-950",
        },
        {
            title: "Page Views",
            value: (pageViews || 0).toLocaleString(),
            icon: MousePointer,
            description: "Last 30 days",
            color: "text-purple-600 dark:text-purple-400",
            bgColor: "bg-purple-100 dark:bg-purple-950",
        },
        {
            title: "Avg Events/User",
            value: uniqueUsers ? ((totalEvents || 0) / uniqueUsers).toFixed(1) : "0",
            icon: TrendingUp,
            description: "Last 30 days",
            color: "text-orange-600 dark:text-orange-400",
            bgColor: "bg-orange-100 dark:bg-orange-950",
        },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Analytics Overview"
                description="Cross-app analytics and insights"
            />

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <Card key={stat.title} className="google-card border-outline bg-surface">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.bgColor}`}>
                                        <Icon className={`h-5 w-5 ${stat.color}`} />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-on-surface mb-1">
                                    {stat.value}
                                </p>
                                <p className="text-sm font-medium text-on-surface-variant mb-1">
                                    {stat.title}
                                </p>
                                <p className="text-xs text-on-surface-variant">
                                    {stat.description}
                                </p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Top Apps */}
            <Card className="google-card border-outline bg-surface">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        Top Apps by Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {sortedApps.length > 0 ? (
                        <div className="space-y-3">
                            {sortedApps.map((app: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-outline">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-on-surface">{app.name}</p>
                                            <p className="text-sm text-on-surface-variant">{app.count.toLocaleString()} events</p>
                                        </div>
                                    </div>
                                    <BarChart3 className="h-5 w-5 text-on-surface-variant" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <BarChart3 className="h-12 w-12 text-on-surface-variant mx-auto mb-4" />
                            <p className="text-sm text-on-surface-variant">No analytics data yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
