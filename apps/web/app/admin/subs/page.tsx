import { createClient } from "@mcloud/db/client"
import type { Metadata } from "next"
import SubscriptionsClient from "@/components/subscriptions-client"

export const metadata: Metadata = {
    title: "Subscriptions — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

async function getSubscriptions() {
    const supabase = createClient()
    const { data } = await supabase
        .from("store_subscriptions")
        .select(`
            id,
            status,
            amount,
            currency,
            created_at,
            provider,
            google_play_order_id,
            stores (
                id,
                name,
                slug,
                is_pro
            )
        `)
        .order("created_at", { ascending: false })

    return (data ?? []).map(row => ({
        ...row,
        stores: Array.isArray(row.stores) ? row.stores[0] ?? null : row.stores,
    }))
}

export default async function SubscriptionsPage() {
    const subscriptions = await getSubscriptions()
    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <SubscriptionsClient subscriptions={subscriptions} />
        </div>
    )
}
