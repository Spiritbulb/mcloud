// /app/[slug]/manage/organizations/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Building2, Users, Package, Plus } from "lucide-react"
import Link from "next/link"

export default async function OrganizationsPage({
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

    // Get all organizations
    const { data: organizations, error } = await supabase
        .from('organizations')
        .select('*, team_members(count)')
        .order('created_at', { ascending: false })

    // Get team members count
    const { count: teamMembersCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .in('organization_id', (organizations || []).map((org) => org.id))

    if (error) {
        console.error('Error fetching organizations:', error)
    }

    // Get apps count for each organization
    const orgsWithData = await Promise.all(
        (organizations || []).map(async (org) => {
            const { count: appsCount } = await supabase
                .from('apps')
                .select('*', { count: 'exact', head: true })

            return {
                ...org,
                appsCount: appsCount || 0,
                teamMembersCount: teamMembersCount || 0,
            }
        })
    )

    return (
        <div className="space-y-6">
            <PageHeader
                title="Organizations"
                description="Manage all your organizations"
                actions={
                    <Link href={`/${slug}/manage/organizations/new`}>
                        <button className="google-button-primary py-2 px-4 text-body-medium flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                        </button>
                    </Link>
                }
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {orgsWithData?.map((org) => (
                    <Link key={org.id} href={`/${slug}/manage/organizations/${org.slug}`}>
                        <Card className="google-card border-outline bg-surface h-full hover:bg-surface-variant transition-colors cursor-pointer">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                            <Building2 className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-title-medium text-on-surface">
                                                {org.name}
                                            </CardTitle>
                                            <p className="text-sm text-on-surface-variant">/{org.slug}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-on-surface-variant" />
                                        <div>
                                            <p className="text-sm font-medium text-on-surface">{org.appsCount}</p>
                                            <p className="text-xs text-on-surface-variant">Apps</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-on-surface-variant" />
                                        <div>
                                            <p className="text-sm font-medium text-on-surface">
                                                {org.teamMembersCount}
                                            </p>
                                            <p className="text-xs text-on-surface-variant">Members</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-on-surface-variant mt-4">
                                    Created {new Date(org.created_at).toLocaleDateString()}
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {(!organizations || organizations.length === 0) && (
                <Card className="google-card border-outline bg-surface">
                    <CardContent className="text-center py-12">
                        <Building2 className="h-12 w-12 text-on-surface-variant mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-on-surface mb-2">
                            No organizations yet
                        </h3>
                        <p className="text-sm text-on-surface-variant mb-4">
                            Create your first organization to get started
                        </p>
                        <Link href={`/${slug}/manage/organizations/new`}>
                            <button className="google-button-primary py-2 px-4 text-sm">
                                Create Organization
                            </button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
