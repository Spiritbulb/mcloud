'use server'

import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { revalidatePath } from 'next/cache'

async function authorise(orgSlug: string, traderSlug: string) {
    const session = await getSession()
    if (!session?.user) return { error: 'Unauthenticated' as const, app: null, supabase: null }

    const supabase = await createClient()

    const { data: org } = await supabase.from('orgs').select('id').eq('slug', orgSlug).single()
    if (!org) return { error: 'Not found' as const, app: null, supabase: null }

    const { data: member } = await supabase
        .from('org_members').select('role').eq('org_id', org.id).eq('user_id', session.user.id).single()

    if (!member || !['owner', 'admin'].includes(member.role)) {
        return { error: 'Forbidden' as const, app: null, supabase: null }
    }

    const { data: app } = await supabase
        .from('trading_apps').select('id').eq('slug', traderSlug).eq('org_id', org.id).single()

    if (!app) return { error: 'Not found' as const, app: null, supabase: null }

    return { error: null, app, supabase }
}

export async function updateTraderField(
    orgSlug: string,
    traderSlug: string,
    fields: Record<string, unknown>,
) {
    const { error, app, supabase } = await authorise(orgSlug, traderSlug)
    if (error || !app || !supabase) return { error: error ?? 'Unknown error' }

    const { error: dbErr } = await supabase
        .from('trading_apps')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', app.id)

    if (dbErr) return { error: dbErr.message }

    revalidatePath(`/org/${orgSlug}/trading/${traderSlug}`, 'layout')
    return { error: null }
}
