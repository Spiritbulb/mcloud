// app/api/store/[slug]/participate/join-request/route.ts
// Non-members submitting interest in TBS — no payment, no order. Just a
// record for the team to follow up on manually.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { getActiveStoreId } from '@/lib/customer-auth'


const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

const noStore = { 'Cache-Control': 'no-store', ...corsHeaders }

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params
    let body: { name?: unknown; phone?: unknown; email?: unknown; message?: unknown }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: noStore })
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!name || !phone) {
        return NextResponse.json({ error: 'name and phone are required' }, { status: 400, headers: noStore })
    }

    const storeId = await getActiveStoreId(slug)
    if (!storeId) return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: noStore })

    const admin = await createClient()
    const { error } = await admin.from('store_join_requests').insert({
        store_id: storeId,
        full_name: name,
        phone,
        email: email || null,
        message: message || null,
    })

    if (error) {
        return NextResponse.json({ error: 'Failed to submit request' }, { status: 500, headers: noStore })
    }

    return NextResponse.json({ ok: true }, { headers: noStore })
}