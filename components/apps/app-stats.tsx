// /components/apps/app-stats.tsx
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Activity, Users, MousePointer, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/client"

interface AppStatsProps {
    totalEvents: number
    uniqueUsers: number
    appId: string
}

export function AppStats({ totalEvents, uniqueUsers, appId }: AppStatsProps) {
    const [pageViews, setPageViews] = useState(0)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchPageViews() {
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const { count } = await supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('app_id', appId)
                .eq('event_type', 'page_view')
                .gte('created_at', thirtyDaysAgo.toISOString())

            setPageViews(count || 0)
            setLoading(false)
        }

        fetchPageViews()
    }, [appId])

    const stats = [
        {
            title: "Total Events",
            value: totalEvents.toLocaleString(),
            icon: Activity,
            description: "Last 30 days",
        },
        {
            title: "Unique Users",
            value: uniqueUsers.toLocaleString(),
            icon: Users,
            description: "Last 30 days",
        },
        {
            title: "Page Views",
            value: pageViews.toLocaleString(),
            icon: MousePointer,
            description: "Last 30 days",
        },
        {
            title: "Avg. Events/User",
            value: uniqueUsers > 0 ? (totalEvents / uniqueUsers).toFixed(1) : "0",
            icon: TrendingUp,
            description: "Last 30 days",
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
                const Icon = stat.icon
                return (
                    <Card key={stat.title} className="google-card border-outline bg-surface">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-on-surface-variant">{stat.title}</p>
                                <Icon className="h-4 w-4 text-on-surface-variant" />
                            </div>
                            <p className="text-2xl font-bold text-on-surface mb-1">
                                {loading && stat.title === "Page Views" ? "..." : stat.value}
                            </p>
                            <p className="text-xs text-on-surface-variant">{stat.description}</p>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
