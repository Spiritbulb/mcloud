"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { UserPlus, Mail } from "lucide-react"

interface TeamMember {
    id: string
    user_id: string
    role: 'owner' | 'admin' | 'member' | 'viewer'
    status: 'pending' | 'active' | 'suspended'
    invited_at: string
    joined_at: string | null
    user_profiles: {
        full_name: string | null
        avatar_url: string | null
    } | null
    users: {
        email: string
    } | null
}

export default function TeamPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [members, setMembers] = useState<TeamMember[]>([])
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadTeamMembers()
    }, [])

    const loadTeamMembers = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/auth/login')
                return
            }

            setCurrentUserId(user.id)

            const { data: orgData } = await supabase
                .from('organizations')
                .select('id')
                .eq('owner_id', user.id)
                .single()

            if (!orgData) {
                setMembers([])
                setLoading(false)
                return
            }

            const { data: teamData, error: teamError } = await supabase
                .from('team_members')
                .select(`
                    *,
                    user_profiles (
                        full_name,
                        avatar_url
                    )
                `)
                .eq('organization_id', orgData.id)
                .order('joined_at', { ascending: false })

            if (teamError) throw teamError

            const membersWithEmails = await Promise.all(
                (teamData || []).map(async (member) => {
                    const { data: userData } = await supabase.auth.admin.getUserById(member.user_id)
                    return {
                        ...member,
                        users: userData?.user ? { email: userData.user.email || '' } : null
                    }
                })
            )

            setMembers(membersWithEmails)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const getInitials = (name: string | null | undefined, email: string) => {
        if (name) {
            return name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)
        }
        return email.slice(0, 2).toUpperCase()
    }

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'owner':
                return 'default'
            case 'admin':
                return 'secondary'
            default:
                return 'outline'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Team Members"
                description="Manage team access and permissions"
                actions={
                    <button className="google-button-primary py-2 px-4 text-body-medium flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                    </button>
                }
            />

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-variant border border-outline">
                    <p className="text-sm text-on-surface">{error}</p>
                </div>
            )}

            {members.length === 0 ? (
                <Card className="border-none shadow-none">
                    <CardContent className="p-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-variant">
                                <Mail className="h-8 w-8 text-on-surface-variant" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-on-surface mb-1">
                                    No team members yet
                                </h3>
                                <p className="text-sm text-on-surface-variant mb-4">
                                    Invite team members to collaborate on your projects
                                </p>
                                <button className="google-button-primary py-2 px-4 text-sm">
                                    Invite Your First Member
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-none shadow-none">
                    <CardHeader>
                        <CardTitle className="text-headline-small text-on-surface">
                            Team Members ({members.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {members.map((member) => {
                                const isCurrentUser = member.user_id === currentUserId
                                const email = member.users?.email || 'Unknown'
                                const name = member.user_profiles?.full_name

                                return (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-4 rounded-lg border border-outline hover:bg-surface-variant transition-colors duration-200"
                                    >
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={member.user_profiles?.avatar_url || ''} />
                                                <AvatarFallback className="bg-primary text-white text-sm">
                                                    {getInitials(name, email)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-on-surface">
                                                    {name || email}
                                                    {isCurrentUser && (
                                                        <span className="text-sm text-on-surface-variant ml-2">
                                                            (You)
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-sm text-on-surface-variant">{email}</p>
                                                {member.status === 'pending' && (
                                                    <p className="text-xs text-on-surface-variant mt-1">
                                                        Invited {new Date(member.invited_at).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge
                                                variant={getRoleBadgeVariant(member.role)}
                                                className="capitalize"
                                            >
                                                {member.role}
                                            </Badge>
                                            {member.status === 'pending' && (
                                                <Badge variant="outline" className="text-on-surface-variant">
                                                    Pending
                                                </Badge>
                                            )}
                                            {member.role !== 'owner' && (
                                                <button className="google-button-secondary py-2 px-4 text-sm">
                                                    Manage
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
