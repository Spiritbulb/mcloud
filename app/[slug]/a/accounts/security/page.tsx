// /app/[slug]/manage/accounts/security/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { SecuritySettings } from "@/components/account/security-settings"

export default async function ManageSecurityPage({
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

    return (
        <div className="space-y-6">
            <PageHeader
                title="Security Settings"
                description="Manage your password and security preferences"
            />

            <div className="max-w-2xl">
                <SecuritySettings slug={slug} userEmail={user.email || ''} />
            </div>
        </div>
    )
}
