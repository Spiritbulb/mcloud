// @route-kind: member
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { darajaBase } from '@mcloud/merchant/daraja'
import { canManage, requireStoreAccess } from '@mcloud/merchant/stores'

// Tests Daraja credentials by asking Safaricom for an access token, against the same environment
// (live or sandbox, DARAJA_ENV) that real payments use. No payment is initiated. Keys left out of
// the body are read from the store's saved M-PESA settings, so editing does not mean re-pasting them.
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await getSession(req)
        if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { slug } = await params
        const access = await requireStoreAccess(slug, session.user.id)
        if (access.error === 'not_found') return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 })
        if (access.error || !canManage(access.role)) {
            return NextResponse.json({ success: false, error: 'Only store owners and admins can test payment keys.' }, { status: 403 })
        }

        const body = await req.json().catch(() => ({}))
        let consumerKey = typeof body?.consumerKey === 'string' ? body.consumerKey.trim() : ''
        let consumerSecret = typeof body?.consumerSecret === 'string' ? body.consumerSecret.trim() : ''

        if (!consumerKey || !consumerSecret) {
            const supabase = await createClient()
            const { data: saved } = await supabase
                .from('store_integrations')
                .select('config')
                .eq('store_id', access.storeId)
                .eq('provider', 'mpesa')
                .maybeSingle()
            const config = (saved?.config ?? {}) as Record<string, unknown>
            consumerKey ||= typeof config.consumerKey === 'string' ? config.consumerKey : ''
            consumerSecret ||= typeof config.consumerSecret === 'string' ? config.consumerSecret : ''
        }
        if (!consumerKey || !consumerSecret) {
            return NextResponse.json({ success: false, error: 'Enter your Consumer Key and Consumer Secret first.' }, { status: 400 })
        }

        const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
        const res = await fetch(`${darajaBase()}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { Authorization: `Basic ${credentials}` },
        })

        if (res.ok) return NextResponse.json({ success: true })
        return NextResponse.json({ success: false, error: `Safaricom rejected these keys (${res.status}). Check you copied them from the right Daraja app.` })
    } catch {
        return NextResponse.json({ success: false, error: 'Could not reach Safaricom. Try again in a moment.' }, { status: 502 })
    }
}
