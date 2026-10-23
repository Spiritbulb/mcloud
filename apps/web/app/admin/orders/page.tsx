import { createClient } from "@mcloud/db/server"
import type { Metadata } from "next"
import OrdersClient from "@/components/admin/orders-client"

export const metadata: Metadata = {
    title: "Orders — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

// Search runs in the browser over what is loaded, so the load is bounded.
const ORDER_LIMIT = 500

async function getOrders() {
    const supabase = await createClient()
    const { data } = await supabase
        .from("orders")
        .select(`
            id, order_number, store_id, customer_email,
            total, currency, status, fulfillment_status, created_at,
            stores ( name, slug )
        `)
        .order("created_at", { ascending: false })
        .limit(ORDER_LIMIT)

    return (data ?? []).map(row => ({
        ...row,
        created_at: row.created_at ?? "",
        store: Array.isArray(row.stores) ? row.stores[0] ?? null : row.stores,
    }))
}

export default async function OrdersPage() {
    const orders = await getOrders()
    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <OrdersClient orders={orders} capped={orders.length >= ORDER_LIMIT} />
        </div>
    )
}
