import { redirect } from 'next/navigation'
import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'

export default async function OrgIndexPage() {
    const session = await auth0.getSession()
    if (!session?.user) redirect('/auth/login')

    const supabase = await createClient()
    const { data: firstOrg } = await supabase
        .from('org_members')
        .select('org:orgs(slug)')
        .eq('user_id', session.user.sub)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

    const orgSlug = firstOrg ? (firstOrg.org as any)?.slug : null
    redirect(orgSlug ? `/org/${orgSlug}` : '/onboarding')
}
