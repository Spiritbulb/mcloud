// The bot's real dependencies, for ONE already identified user. Every call goes through the same
// gates as the web and mobile apps (requireStoreAccess via listOrders, owner/admin via
// createStoreForUser), so WhatsApp can never do more than the linked user could do in the app.
import { createClient } from '@mcloud/db/server'
import { canManage, createStoreForUser, getOrgRole } from '@mcloud/merchant/stores'
import { storefrontUrl } from '@mcloud/merchant/storefront-url'
import { listAccessibleStores, listCreatableOrgs } from '@mcloud/merchant/user-stores'
import type { BotDeps, OrderDetail, OrderSummary } from '@mcloud/whatsapp'
import { listOrders } from '@/lib/merchant/store-sections'
import { pickFreeSlug, slugCandidates } from './slug-candidates'

const RECENT_ORDERS = 10

export function makeBotDeps(userId: string): BotDeps {
    return {
        async stores(query) {
            const stores = await listAccessibleStores(userId, query)
            return stores.map((s) => ({ slug: s.slug, name: s.name, orgName: s.orgName }))
        },

        async orders(storeSlug) {
            const res = await listOrders(storeSlug, userId) // runs requireStoreAccess for this user
            if (res.error) return { ok: false }
            const supabase = await createClient()
            const { data: store } = await supabase.from('stores').select('name').eq('slug', storeSlug).single()
            const orders: OrderSummary[] = res.data.slice(0, RECENT_ORDERS).map((o) => ({
                orderNumber: o.order_number, total: o.total, currency: o.currency, status: o.status, createdAt: o.created_at,
            }))
            return { ok: true, storeName: store?.name ?? storeSlug, orders }
        },

        async order(storeSlug, orderNumber) {
            const res = await listOrders(storeSlug, userId)
            if (res.error) return null
            const o = res.data.find((x) => x.order_number === orderNumber)
            if (!o) return null
            const detail: OrderDetail = {
                orderNumber: o.order_number, total: o.total, currency: o.currency, status: o.status, createdAt: o.created_at,
                fulfillmentStatus: o.fulfillment_status, customerPhone: o.customer_phone,
                items: o.items.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price })),
            }
            return detail
        },

        orgs: () => listCreatableOrgs(userId),

        async createStore(orgId, name) {
            // Re-check here rather than trusting a list row id that came back from WhatsApp.
            if (!canManage(await getOrgRole(orgId, userId))) {
                return { ok: false, error: 'Only owners and admins can create stores' }
            }
            const supabase = await createClient()
            const candidates = slugCandidates(name)
            const { data: used } = await supabase.from('stores').select('slug').in('slug', candidates)
            const taken = new Set((used ?? []).map((r) => r.slug))

            // A second attempt covers the rare race where someone takes the slug between check and insert.
            for (let attempt = 0; attempt < 2; attempt++) {
                const slug = pickFreeSlug(candidates, taken)
                if (!slug) return { ok: false, error: 'I could not find a free address for that name. Try a slightly different name.' }
                const res = await createStoreForUser({ orgId, name, slug }, userId)
                if (res.error === null) return { ok: true, name, url: storefrontUrl(res.slug) }
                if (!/already exists/i.test(res.error)) return { ok: false, error: res.error }
                taken.add(slug)
            }
            return { ok: false, error: 'Please try again in a moment.' }
        },
    }
}
