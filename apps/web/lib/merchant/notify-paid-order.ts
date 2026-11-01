import { createClient } from '@mcloud/db/server'
import { sendEmail } from '@mcloud/mail'
import { newOrderEmail, orderConfirmationEmail, type OrderSummary } from '@mcloud/mail/templates'
import { storeSettingsUrl, storefrontUrl } from '@mcloud/merchant/storefront-url'
import { getStoreManagerUserIds } from '@/lib/merchant/store-managers'
import { sendPushToUsers } from '@/lib/merchant/send-push'

type PaidOrder = { id: string; store_id: string; order_number: string; total: number; currency: string }

/**
 * Tell the store's managers about a newly paid order (push and email) and send the shopper
 * a confirmation if they gave an email. Best-effort: the payment is already recorded, so a
 * failure here is swallowed. Call it only from the request that flipped the order to paid,
 * so each order is announced once; the email idempotency keys cover a retry on top of that.
 */
export async function notifyPaidOrder(order: PaidOrder): Promise<void> {
    try {
        const supabase = await createClient()
        const { data: store } = await supabase
            .from('stores')
            .select('name, slug, custom_domain, org:orgs(slug)')
            .eq('id', order.store_id)
            .single()
        if (!store) return
        const userIds = await getStoreManagerUserIds(order.store_id)

        const [{ data: full }, { data: managers }] = await Promise.all([
            supabase.from('orders').select('customer_email, customer_phone, order_items(title, quantity, price)').eq('id', order.id).single(),
            userIds.length ? supabase.from('users').select('email').in('id', userIds) : Promise.resolve({ data: [] as { email: string | null }[] }),
        ])

        const summary: OrderSummary = {
            storeName: store.name,
            orderNumber: order.order_number,
            total: Number(order.total),
            currency: order.currency,
            items: (full?.order_items ?? []).map((i) => ({ title: i.title ?? 'Item', quantity: i.quantity, price: Number(i.price) })),
        }
        const orgSlug = (store.org as { slug: string } | null)?.slug
        const managerEmails = (managers ?? []).map((m) => m.email).filter((e): e is string => !!e)

        await Promise.all([
            userIds.length &&
                sendPushToUsers(userIds, {
                    title: 'New order',
                    body: `${order.order_number} · ${order.currency} ${Number(order.total).toLocaleString()}`,
                    data: { storeSlug: store.slug, type: 'new_order', orderId: order.id },
                }),
            // One message per manager so the team's addresses are not shared on a To: line.
            ...(orgSlug
                ? managerEmails.map((to) =>
                      sendEmail({
                          to,
                          idempotencyKey: `order-paid/${order.id}/${to}`,
                          ...newOrderEmail({
                              ...summary,
                              customer: full?.customer_email ?? full?.customer_phone,
                              ordersUrl: storeSettingsUrl(orgSlug, store.slug, '/orders'),
                          }),
                      }),
                  )
                : []),
            full?.customer_email &&
                sendEmail({
                    to: full.customer_email,
                    idempotencyKey: `order-paid/${order.id}/customer`,
                    ...orderConfirmationEmail({
                        ...summary,
                        orderUrl: `${storefrontUrl(store.slug, store.custom_domain)}/orders/${encodeURIComponent(order.order_number)}`,
                    }),
                }),
        ])
    } catch {
        // never let a notification failure break the request that settled the payment
    }
}
