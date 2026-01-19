import { SidebarProvider } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin-sidebar"
import { createClient } from "@/lib/server"
import { redirect } from "next/navigation"

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Get user profile with organization
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user?.id)
        .single()

    if (!profile?.organization_id) {
        redirect('/auth/login')
    }

    // Get organization separately
    const { data: organization } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, role')
        .eq('id', profile.organization_id)
        .single()

    return {
        title: `Admin | ${organization?.name}`
    }
}

export default async function OrgLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get user profile with organization
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

    if (!profile?.organization_id) {
        redirect('/auth/login')
    }

    // Get organization separately
    const { data: organization } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, role')
        .eq('id', profile.organization_id)
        .single()

    if (!organization || organization.slug !== slug) {
        redirect('/auth/login')
    }

    return (
        <SidebarProvider defaultOpen={true}>
            <div className="flex min-h-screen w-full">
                <AdminSidebar
                    slug={organization.slug}
                    orgName={organization.name}
                    userId={user.id}
                    orgLogo={organization.logo_url}
                    orgRole={organization.role}
                />
                <main className="flex-1 bg-surface-variant">
                    <div className="p-6 md:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </SidebarProvider>
    )
}
