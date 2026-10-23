import { createClient } from "@mcloud/db/server"
import type { Metadata } from "next"
import WebhooksClient from "@/components/admin/webhooks-client"
import { WEBHOOK_STATUSES } from "@/components/admin/webhooks-filters"
import { orIlike, pageRange, parseListQuery, totalPages } from "@mcloud/ui/kit/list-query"

export const metadata: Metadata = {
    title: "Webhook Logs — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function WebhooksPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const raw = await searchParams
    const supabase = await createClient()

    // The provider filter offers whatever providers have actually logged, so validate against that.
    const { data: seen } = await supabase.from("webhook_logs").select("provider").order("created_at", { ascending: false }).limit(1000)
    const providers = [...new Set((seen ?? []).map((r) => r.provider).filter((p): p is string => Boolean(p)))].sort()

    const q = parseListQuery(raw, { provider: providers, status: WEBHOOK_STATUSES.map((s) => s.value) })
    const { from, to } = pageRange(q.page)

    let query = supabase
        .from("webhook_logs")
        .select(`id, provider, event_type, status, store_id, created_at, error_message, payload, stores ( name )`, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to)
    if (q.filters.provider) query = query.eq("provider", q.filters.provider)
    if (q.filters.status) query = query.eq("status", q.filters.status)
    const search = orIlike(["event_type", "provider", "error_message"], q.q)
    if (search) query = query.or(search)

    const [{ data, count, error }, { count: failed }] = await Promise.all([
        query,
        supabase.from("webhook_logs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    ])

    const logs = (data ?? []).map((row) => ({
        ...row,
        created_at: row.created_at ?? "",
        store: Array.isArray(row.stores) ? row.stores[0] ?? null : row.stores,
    }))

    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <WebhooksClient logs={logs} total={count ?? 0} failed={failed ?? 0} providers={providers} pages={totalPages(count ?? 0)} q={q} error={error?.message ?? null} />
        </div>
    )
}
