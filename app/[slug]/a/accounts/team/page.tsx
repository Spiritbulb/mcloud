// /app/[slug]/manage/accounts/team/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { Users, Mail, Shield, UserPlus } from "lucide-react"
import Link from "next/link"

export default async function ManageTeamPage({
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

    // Get all organizations owned by user
    const { data: organizations } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('user_id', user.id)

    const orgIds = organizations?.map(org => org.id) || []

    // Get all team members across organizations
    const { data: members } = await supabase
        .from('organization_members')
        .select('*, organizations(name, slug), user_profiles(full_name, email, avatar_url)')
        .in('organization_id', orgIds)
        .order('created_at', { ascending: false })

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'owner':
                return 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400'
            case 'admin':
                return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
            case 'member':
                return 'bg-gray-100 dark:bg-gray-950 text-gray-700 dark:text-gray-400'
            default:
                return 'bg-surface-variant text-on-surface-variant'
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Team Members"
                description="Manage team members across all organizations"
                actions={
                    organizations && organizations.length > 0 && (
                        <Link href={`/${slug}/manage/accounts/team/invite`}>
                            <button className="google-button-primary py-2 px-4 text-body-medium flex items-center gap-2">
                                <UserPlus className="h-4 w-4" />
                                Invite Member
                            </button>
                        </Link>
                    )
                }
            />

            <Card className="google-card border-outline bg-surface">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        All Team Members
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {members && members.length > 0 ? (
                        <div className="space-y-3">
                            {members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border border-outline">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                            <Users className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-on-surface">
                                                {member.user_profiles?.full_name || member.user_profiles?.email}
                                            </p>
                                            <p className="text-sm text-on-surface-variant flex items-center gap-2">
                                                <Mail className="h-3 w-3" />
                                                {member.user_profiles?.email}
                                            </p>
                                            <p className="text-xs text-on-surface-variant mt-1">
                                                {member.organizations?.name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize flex items-center gap-1 ${getRoleBadge(member.role)}`}>
                                            <Shield className="h-3 w-3" />
                                            {member.role}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 text-on-surface-variant mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-on-surface mb-2">
                                No team members yet
                            </h3>
                            <p className="text-sm text-on-surface-variant mb-4">
                                Invite team members to collaborate on your organizations
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Stats */}
            {members && members.length > 0 && (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="google-card border-outline bg-surface">
                        <CardContent className="p-6">
                            <p className="text-sm text-on-surface-variant mb-1">Total Members</p>
                            <p className="text-2xl font-bold text-on-surface">{members.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="google-card border-outline bg-surface">
                        <CardContent className="p-6">
                            <p className="text-sm text-on-surface-variant mb-1">Organizations</p>
                            <p className="text-2xl font-bold text-on-surface">{organizations?.length || 0}</p>
                        </CardContent>
                    </Card>
                    <Card className="google-card border-outline bg-surface">
                        <CardContent className="p-6">
                            <p className="text-sm text-on-surface-variant mb-1">Admins</p>
                            <p className="text-2xl font-bold text-on-surface">
                                {members.filter(m => m.role === 'admin').length}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
