import { createClient } from "@mcloud/db/client"
import type { Metadata } from "next"
import WebhooksClient from "@/components/admin/webhooks-client"

export const metadata: Metadata = {
    title: "Webhook Logs — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

async function getWebhookLogs() {
    const supabase = createClient()
    const { data } = await supabase
        .from("webhook_logs")
        .select(`
            id, provider, event_type, status, store_id,
            created_at, error_message, payload,
            stores ( name )
        `)
        .order("created_at", { ascending: false })
        .limit(500)

    return (data ?? []).map(row => ({
        ...row,
        store: Array.isArray(row.stores) ? row.stores[0] ?? null : row.stores,
    }))
}

export default async function WebhooksPage() {
    const logs = await getWebhookLogs()
    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <WebhooksClient logs={logs} />
        </div>
    )
}
