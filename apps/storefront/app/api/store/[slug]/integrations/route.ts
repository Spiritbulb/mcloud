// @route-kind: public — GET exposes only an allowlist to shoppers (managers get the full non-secret view); POST requires the store owner
import { NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { getSession } from '@mcloud/auth/server'
import { canManage, requireStoreAccess, requireStoreAccessById } from '@mcloud/merchant/stores'
import { publicIntegration } from '@/lib/integration-public'
import { readOptionalSession } from '@/lib/optional-session'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const supabase = await createClient()

        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id, org_id')
            .eq('slug', slug)
            .single()

        if (storeError || !store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Org-level integrations act as a baseline that store-level settings can override.
        const orgMap: Record<string, any> = {}
        if (store.org_id) {
            const { data: orgIntegrations } = await supabase
                .from('org_integrations')
                .select('provider, config, is_active')
                .eq('org_id', store.org_id)

            orgIntegrations?.forEach(intg => {
                orgMap[intg.provider] = {
                    ...(typeof intg.config === 'object' && intg.config ? intg.config : {}),
                    enabled: intg.is_active,
                    _inheritedFromOrg: true,
                }
            })
        }

        const { data: pgIntegrations } = await supabase
            .from('store_integrations')
            .select('provider, config, is_active, inherited_from_org')
            .eq('store_id', store.id)

        const dataMap: Record<string, any> = { ...orgMap }
        if (pgIntegrations) {
            pgIntegrations.forEach(intg => {
                const orgBase = intg.inherited_from_org ? orgMap[intg.provider] : null
                dataMap[intg.provider] = {
                    ...(orgBase ?? {}),
                    ...(typeof intg.config === 'object' && intg.config ? intg.config : {}),
                    enabled: intg.is_active,
                    _inheritedFromOrg: !!intg.inherited_from_org,
                }
            })
        }

        const sanitize = (data: any) => {
            if (!data) return null
            const { consumerKey, consumerSecret, publishableKey, secretKey, clientId, secret, passkey, _inheritedFromOrg, ...safe } = data
            return {
                ...safe,
                hasConsumerKey: !!consumerKey,
                hasConsumerSecret: !!consumerSecret,
                hasPublishableKey: !!publishableKey,
                hasSecretKey: !!secretKey,
                hasClientId: !!clientId,
                hasSecret: !!secret,
                hasPasskey: !!passkey,
                inheritedFromOrg: !!_inheritedFromOrg,
            }
        }

        // Managers (the settings form) get every non-secret field. Everyone else, including
        // anonymous shoppers, gets only what checkout renders: an allowlist, so a config
        // field added later is private by default.
        const user = (await readOptionalSession(() => getSession(request as any)))?.user
        const manager = user ? canManage((await requireStoreAccessById(store.id, user.id)).role) : false
        const view = manager ? sanitize : publicIntegration

        return NextResponse.json({
            mpesa: view(dataMap['mpesa']),
            paypal: view(dataMap['paypal']),
            pesapal: view(dataMap['pesapal']),
            intasend: view(dataMap['intasend']),
        })

    } catch (error) {
        console.error('Error fetching integrations:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const supabase = await createClient()

        // WorkOS session, not supabase.auth: the db client carries no Supabase user.
        const user = (await getSession())?.user
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Store member or member of the store's org, with a managing role (it was owner-only, which
        // locked org admins and store admins out of Payments).
        const access = await requireStoreAccess(slug, user.id)
        if (access.error === 'not_found') return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        if (access.error || !canManage(access.role)) {
            return NextResponse.json({ error: 'Only store owners and admins can change payment settings.' }, { status: 403 })
        }
        const store = { id: access.storeId }

        const body = await request.json().catch(() => null)
        const provider = body?.provider
        const data = body?.data
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return NextResponse.json({ error: 'Invalid settings' }, { status: 400 })
        }

        if (!['mpesa', 'paypal', 'pesapal', 'intasend'].includes(provider)) {
            return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
        }

        // Fetch existing config to merge (preserves secrets not re-submitted)
        const { data: existing } = await supabase
            .from('store_integrations')
            .select('id, config')
            .eq('store_id', store.id)
            .eq('provider', provider)
            .maybeSingle()

        const mergedConfig = {
            ...(typeof existing?.config === 'object' && existing.config ? existing.config : {}),
            ...data,
        }
        // Strip the enabled flag from config — it lives in is_active
        const { enabled, ...configOnly } = mergedConfig

        const { error: saveError } = existing
            ? await supabase
                .from('store_integrations')
                .update({ config: configOnly, is_active: data.enabled ?? true, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
            : await supabase
                .from('store_integrations')
                .insert({
                    store_id: store.id,
                    provider,
                    is_active: data.enabled ?? true,
                    config: configOnly,
                })
        if (saveError) {
            console.error('Error saving integration:', saveError.code, saveError.message)
            return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error saving integration:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
