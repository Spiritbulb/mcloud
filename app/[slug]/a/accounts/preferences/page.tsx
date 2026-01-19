// /app/[slug]/manage/accounts/preferences/page.tsx
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"
import { PreferencesForm } from "@/components/account/preferences-form"

export default async function ManagePreferencesPage({
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

    const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

    return (
        <div className="space-y-6">
            <PageHeader
                title="Preferences"
                description="Customize your experience"
            />

            <div className="max-w-2xl">
                <PreferencesForm preferences={preferences} slug={slug} />
            </div>
        </div>
    )
}
