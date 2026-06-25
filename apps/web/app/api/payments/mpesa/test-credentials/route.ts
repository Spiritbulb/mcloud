import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'

// Tests Daraja credentials by hitting the sandbox token endpoint.
// No real payment is initiated.
export async function POST(req: NextRequest) {
    try {
        const { data: { user } } = await (await createClient()).auth.getUser()
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { consumerKey, consumerSecret } = await req.json()
        if (!consumerKey || !consumerSecret) {
            return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 })
        }

        const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
        const res = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: { Authorization: `Basic ${credentials}` },
        })

        if (res.ok) {
            return NextResponse.json({ success: true })
        } else {
            const text = await res.text().catch(() => '')
            return NextResponse.json({ success: false, error: `Safaricom rejected the credentials (${res.status})` })
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Could not reach Safaricom — check your network' }, { status: 502 })
    }
}
