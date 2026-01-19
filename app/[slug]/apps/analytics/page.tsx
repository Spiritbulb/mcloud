import { PageHeader } from "@/components/admin/page-header"
import { StatCard } from "@/components/admin/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Users, Eye, Clock } from "lucide-react"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"

export default async function AnalyticsPage({
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

    // Get user's apps
    const { data: apps } = await supabase
        .from('apps')
        .select('id, name, slug')
        .eq('user_id', user.id)

    const appIds = apps?.map(app => app.id) || []

    // Get current month dates
    const now = new Date()
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

    // Total visits this month
    const { count: totalVisitsThisMonth } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .in('app_id', appIds)
        .eq('event_type', 'pageview')
        .gte('created_at', firstDayThisMonth)

    // Total visits last month
    const { count: totalVisitsLastMonth } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .in('app_id', appIds)
        .eq('event_type', 'pageview')
        .gte('created_at', firstDayLastMonth)
        .lte('created_at', lastDayLastMonth)

    // Active users (unique users this month)
    const { count: activeUsers } = await supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact', head: true })
        .in('app_id', appIds)
        .gte('created_at', firstDayThisMonth)
        .not('user_id', 'is', null)

    // Calculate growth percentages
    const visitsGrowth = totalVisitsLastMonth
        ? (((totalVisitsThisMonth || 0) - totalVisitsLastMonth) / totalVisitsLastMonth * 100).toFixed(1)
        : '0'

    // Get top performing apps
    const { data: topApps } = await supabase
        .from('analytics_events')
        .select('app_id')
        .in('app_id', appIds)
        .eq('event_type', 'pageview')
        .gte('created_at', firstDayThisMonth)

    // Count visits per app
    const appVisits = topApps?.reduce((acc, event) => {
        acc[event.app_id] = (acc[event.app_id] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const topPerformingApps = apps
        ?.map(app => ({
            name: app.name,
            visits: appVisits?.[app.id] || 0,
        }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 4) || []

    // Get traffic sources (from referrer field)
    const { data: trafficData } = await supabase
        .from('analytics_events')
        .select('referrer')
        .in('app_id', appIds)
        .eq('event_type', 'pageview')
        .gte('created_at', firstDayThisMonth)

    // Categorize traffic sources
    const trafficSources = {
        direct: 0,
        social: 0,
        search: 0,
        referral: 0,
    }

    trafficData?.forEach(event => {
        const ref = event.referrer?.toLowerCase() || ''
        if (!ref || ref === '') {
            trafficSources.direct++
        } else if (ref.includes('facebook') || ref.includes('twitter') || ref.includes('instagram') || ref.includes('linkedin')) {
            trafficSources.social++
        } else if (ref.includes('google') || ref.includes('bing') || ref.includes('yahoo')) {
            trafficSources.search++
        } else {
            trafficSources.referral++
        }
    })

    const totalTraffic = Object.values(trafficSources).reduce((a, b) => a + b, 0) || 1

    const trafficSourcesData = [
        {
            source: "Direct",
            percentage: Math.round((trafficSources.direct / totalTraffic) * 100),
            visitors: trafficSources.direct.toLocaleString(),
        },
        {
            source: "Social Media",
            percentage: Math.round((trafficSources.social / totalTraffic) * 100),
            visitors: trafficSources.social.toLocaleString(),
        },
        {
            source: "Search Engines",
            percentage: Math.round((trafficSources.search / totalTraffic) * 100),
            visitors: trafficSources.search.toLocaleString(),
        },
        {
            source: "Referrals",
            percentage: Math.round((trafficSources.referral / totalTraffic) * 100),
            visitors: trafficSources.referral.toLocaleString(),
        },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Analytics"
                description="Track performance and user engagement across your apps"
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Visits"
                    value={(totalVisitsThisMonth || 0).toLocaleString()}
                    subtitle={`${visitsGrowth > '0' ? '+' : ''}${visitsGrowth}% from last month`}
                    icon={Eye}
                    colorClass="bg-surface-variant"
                />
                <StatCard
                    title="Active Users"
                    value={(activeUsers || 0).toLocaleString()}
                    subtitle="This month"
                    icon={Users}
                    colorClass="bg-surface-variant"
                />
                <StatCard
                    title="Total Apps"
                    value={(apps?.length || 0).toString()}
                    subtitle="Tracking analytics"
                    icon={Clock}
                    colorClass="bg-surface-variant"
                />
                <StatCard
                    title="Growth Rate"
                    value={`${visitsGrowth}%`}
                    subtitle="Monthly growth"
                    icon={TrendingUp}
                    colorClass="bg-surface-variant"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="google-card border-outline bg-surface">
                    <CardHeader>
                        <CardTitle className="text-headline-small text-on-surface">
                            Top Performing Apps
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topPerformingApps.length === 0 ? (
                            <p className="text-sm text-on-surface-variant text-center py-8">
                                No analytics data yet
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {topPerformingApps.map((app) => (
                                    <div key={app.name} className="flex items-center justify-between">
                                        <span className="text-on-surface font-medium">{app.name}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-on-surface-variant">
                                                {app.visits.toLocaleString()} visits
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="google-card border-outline bg-surface">
                    <CardHeader>
                        <CardTitle className="text-headline-small text-on-surface">
                            Traffic Sources
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {trafficSourcesData.map((source) => (
                                <div key={source.source} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-on-surface font-medium">{source.source}</span>
                                        <span className="text-on-surface-variant text-sm">
                                            {source.visitors} visitors ({source.percentage}%)
                                        </span>
                                    </div>
                                    <div className="h-2 bg-surface-variant rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{ width: `${source.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
