// /app/[slug]/manage/accounts/profiles/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/account/profile-form"

export default async function ManageProfilesPage({
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

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="space-y-6">
            <PageHeader
                title="Profile Settings"
                description="Manage your personal information"
            />

            <div className="max-w-2xl">
                <Card className="google-card border-outline bg-surface">
                    <CardHeader>
                        <CardTitle className="text-headline-small text-on-surface">
                            Personal Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ProfileForm
                            profile={profile}
                            userEmail={user.email || ''}
                            slug={slug}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
