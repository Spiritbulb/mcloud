// /app/[slug]/manage/apps/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Package, Globe, Activity, Plus } from "lucide-react"
import Link from "next/link"

export default async function ManageAppsPage({
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
    const { data: apps, error } = await supabase
        .from('apps')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching apps:', error)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
            case 'beta':
                return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
            case 'maintenance':
                return 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400'
            case 'archived':
                return 'bg-gray-100 dark:bg-gray-950 text-gray-700 dark:text-gray-400'
            default:
                return 'bg-surface-variant text-on-surface-variant'
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="All Apps"
                description="Manage all applications across organizations"
                actions={
                    <Link href={`/${slug}/apps/new`}>
                        <button className="google-button-primary py-2 px-4 text-body-medium flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            New App
                        </button>
                    </Link>
                }
            />

            <Card className="google-card border-outline bg-surface">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        Applications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {apps && apps.length > 0 ? (
                        <div className="space-y-3">
                            {apps.map((app) => (
                                <Link key={app.id} href={`/${slug}/apps/${app.slug}`}>
                                    <div className="flex items-center justify-between p-4 rounded-lg border border-outline hover:bg-surface-variant transition-colors cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                                <Package className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-on-surface">{app.name}</p>
                                                <p className="text-sm text-on-surface-variant">{app.description || 'No description'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(app.status)}`}>
                                                {app.status}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Package className="h-12 w-12 text-on-surface-variant mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-on-surface mb-2">
                                No apps yet
                            </h3>
                            <p className="text-sm text-on-surface-variant mb-4">
                                Create your first app to get started
                            </p>
                            <Link href={`/${slug}/apps/new`}>
                                <button className="google-button-primary py-2 px-4 text-sm">
                                    Create App
                                </button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
