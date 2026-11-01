import { createClient } from '@mcloud/db/server'

/** Slug of the first org the user joined, or null when they belong to none. */
export async function firstOrgSlug(userId: string): Promise<string | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('org_members')
        .select('org:orgs(slug)')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
    // Sending someone with orgs to onboarding would let them create a duplicate; fail instead.
    if (error) throw new Error(`Loading orgs failed: ${error.message}`)
    return (data?.org as { slug?: string } | null)?.slug ?? null
}

/** Where "the dashboard" is for this user: their first org, or onboarding. */
export async function dashboardPath(userId: string): Promise<string> {
    const slug = await firstOrgSlug(userId)
    return slug ? `/org/${slug}` : '/org/onboarding'
}
