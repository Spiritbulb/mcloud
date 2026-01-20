// /app/[slug]/apps/domains/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, CheckCircle, AlertCircle, XCircle, Plus } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"

export default async function DomainsPage({
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
        .order('name')

    const appIds = apps?.map(app => app.id) || []

    // Get domains for these apps
    const { data: domains, error } = await supabase
        .from('domains')
        .select('*, apps(name, slug)')
        .in('app_id', appIds)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching domains:', error)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
            case 'pending':
                return 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400'
            case 'failed':
                return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
            case 'expired':
                return 'bg-gray-100 dark:bg-gray-950 text-gray-700 dark:text-gray-400'
            default:
                return 'bg-surface-variant text-on-surface-variant'
        }
    }

    const getSSLIcon = (ssl: boolean, status: string) => {
        if (ssl && status === 'active') {
            return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        } else if (status === 'failed') {
            return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        } else {
            return <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Domains"
                description="Manage domains and DNS settings for your apps"
            />

            {/* Apps with Quick Add Domain */}
            {apps && apps.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {apps.map((app) => {
                        const appDomains = domains?.filter(d => d.app_id === app.id) || []
                        return (
                            <Card key={app.id} className="border-none">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-title-medium text-on-surface">
                                            {app.name}
                                        </CardTitle>
                                        <Link href={`/${slug}/apps/${app.slug}/domains/new`}>
                                            <Button className="p-2 bg-primary cursor-pointer">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {appDomains.length > 0 ? (
                                        <div className="space-y-2">
                                            {appDomains.map((domain) => (
                                                <Link
                                                    key={domain.id}
                                                    href={`/${slug}/apps/${app.slug}/domains/${domain.id}`}
                                                >
                                                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-variant transition-colors cursor-pointer">
                                                        <Globe className="h-4 w-4 text-on-surface-variant flex-shrink-0" />
                                                        <span className="text-sm text-on-surface truncate flex-1">
                                                            {domain.domain}
                                                        </span>
                                                        {domain.is_verified ? (
                                                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                                        ) : (
                                                            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="hidden">

                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* All Domains List */}
            <Card className="google-card border-outline bg-surface">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        All Domains
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!domains || domains.length === 0 ? (
                        <div className="text-center py-12">
                            <Globe className="h-12 w-12 text-on-surface-variant mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-on-surface mb-2">
                                No domains yet
                            </h3>
                            <p className="text-sm text-on-surface-variant mb-4">
                                {apps && apps.length > 0
                                    ? 'Add a domain to one of your apps to get started'
                                    : 'Create an app first, then add domains to it'
                                }
                            </p>
                            {apps && apps.length > 0 ? (
                                <Link href={`/${slug}/apps/${apps[0].slug}/domains/new`}>
                                    <button className="google-button-primary py-2 px-4 text-sm">
                                        Add Domain
                                    </button>
                                </Link>
                            ) : (
                                <Link href={`/${slug}/apps/new`}>
                                    <button className="google-button-primary py-2 px-4 text-sm">
                                        Create App
                                    </button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {domains.map((domain) => (
                                <div
                                    key={domain.id}
                                    className="flex items-center justify-between p-4 rounded-lg border border-outline hover:bg-surface-variant transition-colors duration-200"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <Globe className="h-5 w-5 text-primary flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-on-surface truncate">{domain.domain}</p>
                                            <p className="text-sm text-on-surface-variant">
                                                {domain.apps?.name || 'Unknown App'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 ml-4">
                                        {domain.ssl_enabled && (
                                            <div className="flex items-center gap-2">
                                                {getSSLIcon(domain.ssl_enabled, domain.status)}
                                                <span className="text-xs text-on-surface-variant hidden sm:inline">
                                                    {domain.ssl_enabled && domain.status === 'active'
                                                        ? 'SSL'
                                                        : domain.status === 'failed'
                                                            ? 'SSL Failed'
                                                            : 'SSL Pending'
                                                    }
                                                </span>
                                            </div>
                                        )}
                                        {!domain.is_verified && (
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                                <span className="text-xs text-on-surface-variant hidden sm:inline">Unverified</span>
                                            </div>
                                        )}
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(domain.status)}`}
                                        >
                                            {domain.status}
                                        </span>
                                        <Link href={`/${slug}/apps/${domain.apps?.slug}/domains/${domain.id}`}>
                                            <button className="google-button-secondary py-2 px-4 text-sm">
                                                Configure
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Stats Summary */}
            {domains && domains.length > 0 && (
                <Card className="google-card border-outline bg-surface-variant">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-on-surface-variant">Total Domains</p>
                                <p className="text-2xl font-bold text-on-surface">{domains.length}</p>
                            </div>
                            <div>
                                <p className="text-sm text-on-surface-variant">Verified</p>
                                <p className="text-2xl font-bold text-on-surface">
                                    {domains.filter(d => d.is_verified).length}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-on-surface-variant">Active</p>
                                <p className="text-2xl font-bold text-on-surface">
                                    {domains.filter(d => d.status === 'active').length}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-on-surface-variant">With SSL</p>
                                <p className="text-2xl font-bold text-on-surface">
                                    {domains.filter(d => d.ssl_enabled).length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
