import { NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'

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

        return NextResponse.json({
            mpesa: sanitize(dataMap['mpesa']),
            paypal: sanitize(dataMap['paypal']),
            pesapal: sanitize(dataMap['pesapal']),
            intasend: sanitize(dataMap['intasend']),
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

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id, owner_id')
            .eq('slug', slug)
            .single()

        if (storeError || !store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        if (store.owner_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { provider, data } = body

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

        if (existing) {
            await supabase
                .from('store_integrations')
                .update({ config: configOnly, is_active: data.enabled ?? true, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
        } else {
            await supabase
                .from('store_integrations')
                .insert({
                    store_id: store.id,
                    provider,
                    is_active: data.enabled ?? true,
                    config: configOnly,
                })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error saving integration:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
