// app/api/store/[slug]/delivery-zones/route.ts
// Read-only list of a store's delivery zones for the checkout UI. Mirrors the
// same zone shape/lookup the checkout route already trusts server-side.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@mcloud/db/server'
import { getActiveStoreId } from '@/lib/customer-auth'

const noStore = { 'Cache-Control': 'no-store' }

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params

    const storeId = await getActiveStoreId(slug)
    if (!storeId) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: noStore })
    }

    const admin = await createClient()
    const { data: zones, error } = await admin
        .from('delivery_zones')
        .select('id, location_name, rate, available')
        .eq('store_id', storeId)
        .order('location_name', { ascending: true })

    if (error) {
        return NextResponse.json({ error: 'Could not load delivery zones' }, { status: 500, headers: noStore })
    }

    return NextResponse.json({ zones: zones ?? [] }, { status: 200, headers: noStore })
}