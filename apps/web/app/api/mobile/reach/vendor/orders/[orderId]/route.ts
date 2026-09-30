// PATCH /api/mobile/reach/vendor/orders/[orderId] — vendor marks their part delivered.
// Escrow: this moves their payout from 'held' to 'released' (owed to them, paid out manually).
import { NextResponse, type NextRequest } from 'next/server'
import { reachDb } from '@/lib/reach/db'
import { vendorIdFor } from '@/lib/reach/vendor'
import { fail, requireMobileUser } from '../../../../_lib'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
    const auth = await requireMobileUser(req)
    if (auth instanceof NextResponse) return auth

    const vendorId = await vendorIdFor(auth.user.id)
    if (!vendorId) return fail(403, 'Not a vendor')

    const { orderId } = await params
    const body = (await req.json().catch(() => null)) as { fulfillment_status?: string } | null
    if (body?.fulfillment_status !== 'fulfilled') return fail(400, "fulfillment_status must be 'fulfilled'")

    const db = await reachDb()
    const { data: released, error } = await db
        .from('reach_vendor_payouts')
        .update({ status: 'released', released_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('vendor_id', vendorId)
        .eq('status', 'held') // only paid orders that haven't been delivered yet
        .select('id')
    if (error) return fail(500, error.message)
    if (!released?.length) return fail(409, 'This order is not waiting for delivery')

    // When every vendor on the order has delivered, close the order itself
    const { count } = await db
        .from('reach_vendor_payouts')
        .select('id', { count: 'exact', head: true })
        .eq('order_id', orderId)
        .in('status', ['pending', 'held'])
    if (count === 0) {
        await db.from('orders').update({ fulfillment_status: 'fulfilled' }).eq('id', orderId)
    }

    return NextResponse.json({ success: true })
}