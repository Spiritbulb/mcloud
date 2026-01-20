// /app/[slug]/apps/[appSlug]/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/server"
import { redirect, notFound } from "next/navigation"
import {
    Activity,
    Users,
    BarChart3,
    Settings,
    Key,
    Globe,
    Calendar,
    Edit,
    Trash2
} from "lucide-react"
import Link from "next/link"
import { AppActions } from "@/components/apps/app-actions"
import { AppStats } from "@/components/apps/app-stats"
import { Badge } from "@/components/ui/badge"

export default async function AppDetailPage({
    params,
}: {
    params: Promise<{ slug: string; appSlug: string }>
}) {
    const { slug, appSlug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get app details
    const { data: app, error } = await supabase
        .from('apps')
        .select('*')
        .eq('slug', appSlug)
        .eq('user_id', user.id)
        .single()

    if (error || !app) {
        notFound()
    }

    // Get API key for this app
    const { data: apiKey } = await supabase
        .from('api_keys')
        .select('*')
        .eq('app_id', app.id)
        .eq('is_active', true)
        .single()

    // Get domains for this app
    const { data: domains } = await supabase
        .from('domains')
        .select('*')
        .eq('app_id', app.id)
        .order('created_at', { ascending: false })

    // Get recent analytics stats (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('app_id', app.id)
        .gte('created_at', thirtyDaysAgo.toISOString())

    const { count: uniqueUsers } = await supabase
        .from('events')
        .select('user_id', { count: 'exact', head: true })
        .eq('app_id', app.id)
        .gte('created_at', thirtyDaysAgo.toISOString())

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return 'border-green-700 dark:border-green-400 text-green-700 dark:text-green-400'
            case 'beta':
                return 'border-blue-700 dark:border-blue-400 text-blue-700 dark:text-blue-400'
            case 'maintenance':
                return 'border-orange-700 dark:border-orange-400 text-orange-700 dark:text-orange-400'
            case 'archived':
                return 'border-gray-700 dark:border-gray-400 text-gray-700 dark:text-gray-400'
            default:
                return 'border-on-surface-variant text-on-surface-variant'
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={app.name}
                description={app.description || 'App details and analytics'}
                actions={
                    <div className="flex gap-2">
                        <Link href={`/${slug}/apps/${appSlug}/settings`}>
                            <button className="google-button-secondary py-2 px-4 text-body-medium flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Settings
                            </button>
                        </Link>
                        <AppActions app={app} slug={slug} />
                    </div>
                }
            />

            {/* App Info Card */}
            <Card className="rounded-none border-none shadow-none p-0">
                <CardContent className="space-y-4 p-0">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-on-surface-variant mb-1">App ID</p>
                            <p className="text-sm font-mono text-on-surface">{app.id}</p>
                        </div>
                        <div>
                            <p className="text-sm text-on-surface-variant mb-1">Status</p>
                            <Badge className={`px-3 py-1 capitalize bg-transparent ${getStatusBadge(app.status)}`}>
                                {app.status}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm text-on-surface-variant mb-1">Slug</p>
                            <p className="text-sm font-mono text-on-surface">{app.slug}</p>
                        </div>
                        <div>
                            <p className="text-sm text-on-surface-variant mb-1">Created</p>
                            <p className="text-sm text-on-surface flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {formatDate(app.created_at)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <AppStats
                totalEvents={totalEvents || 0}
                uniqueUsers={uniqueUsers || 0}
                appId={app.id}
            />

            {/* API Key Card */}
            <Card className="google-card border-outline bg-surface">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-headline-small text-on-surface">
                        API Configuration
                    </CardTitle>
                    <Link href={`/${slug}/apps/${appSlug}/api-keys`}>
                        <button className="google-button-secondary py-2 px-3 text-sm flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            Manage Keys
                        </button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {apiKey ? (
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-on-surface-variant mb-2">Active API Key</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-3 rounded-lg bg-surface-variant border border-outline text-sm font-mono text-on-surface">
                                        {apiKey.key}
                                    </code>
                                    <button className="google-button-secondary py-2 px-3 text-sm">
                                        Copy
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-on-surface-variant">
                                Created {formatDate(apiKey.created_at)}
                            </p>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Key className="h-12 w-12 text-on-surface-variant mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-on-surface mb-2">
                                No API Key
                            </h3>
                            <p className="text-sm text-on-surface-variant mb-4">
                                Generate an API key to start tracking events
                            </p>
                            <Link href={`/${slug}/apps/${appSlug}/api-keys`}>
                                <button className="google-button-primary py-2 px-4 text-sm">
                                    Generate API Key
                                </button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Domains Card */}
            <Card className="google-card border-outline bg-surface">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-headline-small text-on-surface">
                        Domains
                    </CardTitle>
                    <Link href={`/${slug}/apps/${appSlug}/domains`}>
                        <button className="google-button-secondary py-2 px-3 text-sm flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Manage Domains
                        </button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {domains && domains.length > 0 ? (
                        <div className="space-y-2">
                            {domains.map((domain) => (
                                <div
                                    key={domain.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-outline"
                                >
                                    <div className="flex items-center gap-3">
                                        <Globe className="h-5 w-5 text-on-surface-variant" />
                                        <div>
                                            <p className="text-sm font-medium text-on-surface">{domain.domain}</p>
                                            {domain.is_verified ? (
                                                <p className="text-xs text-on-surface-variant">Verified</p>
                                            ) : (
                                                <p className="text-xs text-on-surface-variant">Pending verification</p>
                                            )}
                                        </div>
                                    </div>
                                    {domain.is_verified && (
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
                                            Active
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Globe className="h-12 w-12 text-on-surface-variant mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-on-surface mb-2">
                                No Domains
                            </h3>
                            <p className="text-sm text-on-surface-variant mb-4">
                                Add domains to track analytics from your websites
                            </p>
                            <Link href={`/${slug}/apps/${appSlug}/domains`}>
                                <button className="google-button-primary py-2 px-4 text-sm">
                                    Add Domain
                                </button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-3">
                <Link href={`/${slug}/apps/${appSlug}/analytics`}>
                    <Card className="google-card border-outline bg-surface h-full hover:bg-surface-variant transition-colors cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    <BarChart3 className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-on-surface">Analytics</h3>
                                    <p className="text-sm text-on-surface-variant">View detailed insights</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/${slug}/apps/${appSlug}/events`}>
                    <Card className="google-card border-outline bg-surface h-full hover:bg-surface-variant transition-colors cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    <Activity className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-on-surface">Events</h3>
                                    <p className="text-sm text-on-surface-variant">Track custom events</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/${slug}/apps/${appSlug}/users`}>
                    <Card className="google-card border-outline bg-surface h-full hover:bg-surface-variant transition-colors cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-on-surface">Users</h3>
                                    <p className="text-sm text-on-surface-variant">Manage app users</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
