import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@mcloud/auth/server'
import { createClient } from '@mcloud/db/server'
import { upsertDeliveryOption, deleteDeliveryOption, upsertDeliveryZone, deleteDeliveryZone } from '@/lib/logistics-data'

// POST /api/store/[slug]/logistics
// Body: { options: DeliveryOption[], zones: DeliveryZone[] }
// Full-replace semantics per list: rows with a real uuid id are upserted, rows
// with a temp "_new_*" id are inserted, and rows missing from the incoming
// list (that existed before) are deleted. Client sends its whole working set.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const session = await getSession()
    if (!session?.user) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: memberships } = await supabase
        .from('store_members')
        .select('store_id, store:stores(slug)')
        .eq('user_id', session.user.id)

    const membership = memberships?.find((m) => {
        const s = Array.isArray(m.store) ? m.store[0] : m.store
        return s?.slug === slug
    })
    if (!membership?.store_id) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    const storeId = membership.store_id

    const body = await req.json()
    const incomingOptions = Array.isArray(body.options) ? body.options : []
    const incomingZones = Array.isArray(body.zones) ? body.zones : []

    const isTempId = (id: string) => id.startsWith('_new_')

    const [{ data: existingOptions }, { data: existingZones }] = await Promise.all([
        supabase.from('delivery_options').select('id').eq('store_id', storeId),
        supabase.from('delivery_zones').select('id').eq('store_id', storeId),
    ])

    const keepOptionIds = new Set(incomingOptions.filter((o: any) => !isTempId(o.id)).map((o: any) => o.id))
    const keepZoneIds = new Set(incomingZones.filter((z: any) => !isTempId(z.id)).map((z: any) => z.id))

    const optionsToDelete = (existingOptions ?? []).filter((o) => !keepOptionIds.has(o.id))
    const zonesToDelete = (existingZones ?? []).filter((z) => !keepZoneIds.has(z.id))

    await Promise.all([
        ...optionsToDelete.map((o) => deleteDeliveryOption(storeId, o.id)),
        ...zonesToDelete.map((z) => deleteDeliveryZone(storeId, z.id)),
    ])

    const savedOptions = await Promise.all(
        incomingOptions.map((o: any) => {
            const { id, ...rest } = o
            return upsertDeliveryOption(storeId, isTempId(id) ? rest : { id, ...rest })
        })
    )
    const savedZones = await Promise.all(
        incomingZones.map((z: any) => {
            const { id, ...rest } = z
            return upsertDeliveryZone(storeId, isTempId(id) ? rest : { id, ...rest })
        })
    )

    return NextResponse.json({
        options: savedOptions.map((r) => r.data).filter(Boolean),
        zones: savedZones.map((r) => r.data).filter(Boolean),
    })
}