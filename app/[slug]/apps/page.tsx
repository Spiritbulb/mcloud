import { PageHeader } from "@/components/admin/page-header"
import { StatCard } from "@/components/admin/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, Activity, Users, TrendingUp, Plus } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"

export default async function AppsPage({
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

    // Get user's organization
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

    if (!profile?.organization_id) {
        redirect('/auth/login')
    }

    // Get all apps for this user
    const { data: apps, error } = await supabase
        .from('apps')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching apps:', error)
    }

    // Calculate stats
    const totalApps = apps?.length || 0
    const activeApps = apps?.filter(app => app.status === 'active').length || 0
    const betaApps = apps?.filter(app => app.status === 'beta').length || 0

    // Get analytics for total users (this is simplified - you'd aggregate from analytics_events)
    const { count: totalUsers } = await supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact', head: true })
        .in('app_id', apps?.map(app => app.id) || [])

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-surface-variant text-on-surface border border-outline'
            case 'beta':
                return 'bg-surface-variant text-on-surface-variant border border-outline'
            case 'maintenance':
                return 'bg-surface-variant text-on-surface-variant border border-outline'
            case 'archived':
                return 'bg-surface-variant text-on-surface-variant border border-outline'
            default:
                return 'bg-surface-variant text-on-surface-variant border border-outline'
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Apps"
                description="Manage and monitor all your applications"
                actions={
                    <Link href={`/${slug}/apps/new`}>
                        <button className="google-button-primary py-2 px-4 text-body-medium flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            New App
                        </button>
                    </Link>
                }
            />

            <Card className="rounded-none border-none shadow-none p-0">
                <CardContent className="p-0">
                    {!apps || apps.length === 0 ? (
                        <div className="text-center py-12">
                            <Globe className="h-12 w-12 text-on-surface-variant mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-on-surface mb-2">
                                No apps yet
                            </h3>
                            <p className="text-sm text-on-surface-variant mb-4">
                                Get started by creating your first application
                            </p>
                            <Link href={`/${slug}/apps/new`}>
                                <button className="google-button-primary py-2 px-4 text-sm">
                                    Create App
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {apps.map((app) => (
                                <div
                                    key={app.id}
                                    className="flex items-center justify-between p-4 rounded-none border border-outline transition-colors duration-200"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                            <Globe className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-on-surface">{app.name}</p>
                                            <p className="text-sm text-on-surface-variant">
                                                {app.description || 'No description'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(app.status)}`}
                                        >
                                            {app.status}
                                        </span>
                                        <Link
                                            href={`/${slug}/apps/${app.slug}`}
                                            className="google-button-primary py-2 px-4 text-sm"
                                        >
                                            Manage
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
