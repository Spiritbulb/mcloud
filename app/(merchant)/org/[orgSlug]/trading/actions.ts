'use server'

import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'

export async function getOrgTradingApps(orgSlug: string) {
    const session = await auth0.getSession()
    if (!session?.user) return { error: 'Unauthenticated', apps: [], orgId: null, role: null }

    const supabase = await createClient()

    const { data: org } = await supabase
        .from('orgs')
        .select('id')
        .eq('slug', orgSlug)
        .single()

    if (!org) return { error: 'Not found', apps: [], orgId: null, role: null }

    const { data: member } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', org.id)
        .eq('user_id', session.user.sub)
        .single()

    if (!member) return { error: 'Not a member', apps: [], orgId: null, role: null }

    const { data: apps } = await supabase
        .from('trading_apps')
        .select('id, slug, brand_name, logo_url, custom_domain, primary_color, is_active, created_at')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })

    return { error: null, apps: apps ?? [], orgId: org.id, role: member.role }
}

export async function createTradingApp(formData: FormData) {
    const session = await auth0.getSession()
    if (!session?.user) return { error: 'Unauthenticated' }

    const orgId = formData.get('orgId') as string
    const slug = (formData.get('slug') as string).trim().toLowerCase()
    const brandName = formData.get('brandName') as string
    const derivAppId = formData.get('derivAppId') as string
    const derivRedirectUri = formData.get('derivRedirectUri') as string

    if (!orgId || !slug || !brandName || !derivAppId || !derivRedirectUri) {
        return { error: 'Missing required fields' }
    }

    const supabase = await createClient()

    const { data: member } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', session.user.sub)
        .single()

    if (!member || !['owner', 'admin'].includes(member.role)) {
        return { error: 'Forbidden' }
    }

    const { data, error } = await supabase
        .from('trading_apps')
        .insert({
            org_id: orgId,
            slug,
            brand_name: brandName,
            deriv_app_id: derivAppId,
            deriv_redirect_uri: derivRedirectUri,
        })
        .select('id, slug, brand_name, logo_url, custom_domain, primary_color, is_active, created_at')
        .single()

    if (error) return { error: error.message }
    return { error: null, app: data, slug: data.slug }
}
