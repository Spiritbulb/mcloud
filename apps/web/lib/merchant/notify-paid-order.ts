import { createClient } from '@mcloud/db/server'
import { getStoreManagerUserIds } from '@/lib/merchant/store-managers'
import { sendPushToUsers } from '@/lib/merchant/send-push'

type PaidOrder = { id: string; store_id: string; order_number: string; total: number; currency: string }

/**
 * Push a "New order" notification to the store's managers. Best-effort: the payment is
 * already recorded, so a failure here is swallowed. The tap target needs the store's slug,
 * which an order row does not carry, so it is resolved here.
 */
export async function notifyPaidOrder(order: PaidOrder): Promise<void> {
    try {
        const supabase = await createClient()
        const { data: store } = await supabase.from('stores').select('slug').eq('id', order.store_id).single()
        if (!store) return
        const userIds = await getStoreManagerUserIds(order.store_id)
        if (!userIds.length) return
        await sendPushToUsers(userIds, {
            title: 'New order',
            body: `${order.order_number} · ${order.currency} ${Number(order.total).toLocaleString()}`,
            data: { storeSlug: store.slug, type: 'new_order', orderId: order.id },
        })
    } catch {
        // never let a notification failure break the request that settled the payment
    }
}
