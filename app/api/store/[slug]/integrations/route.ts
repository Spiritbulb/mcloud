import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

interface KVNamespace {
    get(key: string, type: 'json'): Promise<any>
    put(key: string, value: string): Promise<void>
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const supabase = await createClient()

        // Verify the store exists
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id')
            .eq('slug', slug)
            .single()

        if (storeError || !store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        const kv = process.env.STORE_INTEGRATIONS as unknown as KVNamespace | undefined

        // Always fetch Postgres data as the baseline (covers existing stores + dev where KV is unbound)
        const { data: pgIntegrations } = await supabase
            .from('store_integrations')
            .select('provider, config, is_active')
            .eq('store_id', store.id)

        const pgMap: Record<string, any> = {}
        if (pgIntegrations) {
            pgIntegrations.forEach(intg => {
                pgMap[intg.provider] = {
                    ...(typeof intg.config === 'object' && intg.config ? intg.config : {}),
                    enabled: intg.is_active
                }
            })
        }

        // Overlay KV data on top of PG data (KV is source of truth in prod)
        const getProviderData = async (provider: string) => {
            if (kv) {
                try {
                    const kvData = await kv.get(`store:${store.id}:integration:${provider}`, 'json')
                    if (kvData) return kvData
                } catch (e) {
                    console.warn(`KV read failed for ${provider}, falling back to PG:`, e)
                }
            }
            return pgMap[provider] ?? null
        }

        const mpesaData = await getProviderData('mpesa')
        const paypalData = await getProviderData('paypal')
        const pesapalData = await getProviderData('pesapal')
        const intasendData = await getProviderData('intasend')

        // Filter out secrets before returning to frontend
        const sanitize = (data: any) => {
            if (!data) return null
            const { consumerKey, consumerSecret, publishableKey, secretKey, clientId, secret, passkey, ...safe } = data
            return {
                ...safe,
                hasConsumerKey: !!consumerKey,
                hasConsumerSecret: !!consumerSecret,
                hasPublishableKey: !!publishableKey,
                hasSecretKey: !!secretKey,
                hasClientId: !!clientId,
                hasSecret: !!secret,
                hasPasskey: !!passkey
            }
        }

        return NextResponse.json({
            mpesa: sanitize(mpesaData),
            paypal: sanitize(paypalData),
            pesapal: sanitize(pesapalData),
            intasend: sanitize(intasendData)
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

        // Authenticate - check if user is the store owner
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

        // Must be the owner to change these settings
        if (store.owner_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { provider, data } = body

        if (!['mpesa', 'paypal', 'pesapal', 'intasend'].includes(provider)) {
            return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
        }

        const kv = process.env.STORE_INTEGRATIONS as unknown as KVNamespace | undefined

        if (kv) {
            try {
                // If credentials are partially provided, fetch existing to merge
                const existingData = await kv.get(`store:${store.id}:integration:${provider}`, 'json') || {}
                const mergedData = { ...(existingData as object), ...data }
                await kv.put(`store:${store.id}:integration:${provider}`, JSON.stringify(mergedData))
            } catch (e) {
                console.warn(`KV write failed for ${provider}, saving to PG only:`, e)
            }
        }

        // Upsert into store_integrations — in dev this is the only storage; in prod it tracks active state
        const { data: existingPgRecord } = await supabase
            .from('store_integrations')
            .select('id')
            .eq('store_id', store.id)
            .eq('provider', provider)
            .maybeSingle()

        if (existingPgRecord) {
            await supabase
                .from('store_integrations')
                .update({ is_active: data.enabled ?? true, updated_at: new Date().toISOString() })
                .eq('id', existingPgRecord.id)
        } else {
            await supabase
                .from('store_integrations')
                .insert({
                    store_id: store.id,
                    provider: provider,
                    is_active: data.enabled ?? true,
                    config: {} // No secrets stored in PG
                })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error saving integration:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}