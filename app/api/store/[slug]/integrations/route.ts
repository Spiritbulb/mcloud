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

        const kv = process.env.STORE_INTEGRATIONS as unknown as KVNamespace
        if (!kv) {
            console.error('STORE_INTEGRATIONS KV not bound')
            return NextResponse.json({ error: 'System configuration error' }, { status: 500 })
        }

        let mpesaData = await kv.get(`store:${store.id}:integration:mpesa`, 'json')
        let paypalData = await kv.get(`store:${store.id}:integration:paypal`, 'json')
        let pesapalData = await kv.get(`store:${store.id}:integration:pesapal`, 'json')
        let intasendData = await kv.get(`store:${store.id}:integration:intasend`, 'json')

        // Fallback to Postgres for existing stores
        if (!mpesaData || !paypalData || !pesapalData || !intasendData) {
            const { data: pgIntegrations } = await supabase
                .from('store_integrations')
                .select('provider, config, is_active')
                .eq('store_id', store.id)

            if (pgIntegrations) {
                pgIntegrations.forEach(intg => {
                    // Using structural typing logic here
                    const fallbackData = { ...(typeof intg.config === 'object' && intg.config ? intg.config : {}), enabled: intg.is_active }
                    if (intg.provider === 'mpesa' && !mpesaData) mpesaData = fallbackData
                    if (intg.provider === 'paypal' && !paypalData) paypalData = fallbackData
                    if (intg.provider === 'pesapal' && !pesapalData) pesapalData = fallbackData
                    if (intg.provider === 'intasend' && !intasendData) intasendData = fallbackData
                })
            }
        }

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
        console.error('Error fetching integrations from KV:', error)
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

        const kv = process.env.STORE_INTEGRATIONS as unknown as KVNamespace
        if (!kv) {
            return NextResponse.json({ error: 'System configuration error' }, { status: 500 })
        }

        const body = await request.json()
        const { provider, data } = body

        if (!['mpesa', 'paypal', 'pesapal', 'intasend'].includes(provider)) {
            return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
        }

        // If credentials are partially provided, fetch existing to merge
        const existingData = await kv.get(`store:${store.id}:integration:${provider}`, 'json') || {}
        const mergedData = { ...(existingData as object), ...data }

        await kv.put(`store:${store.id}:integration:${provider}`, JSON.stringify(mergedData))

        // Ensure store_integrations table understands it is active 
        // We will keep a small reference in PG even though actual keys are in KV
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
        console.error('Error saving integration to KV:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
