import { createClient } from "@mcloud/db/server"
import type { Metadata } from "next"
import OrdersClient from "@/components/admin/orders-client"
import { ORDER_FILTERS } from "@/components/admin/orders-filters"
import { likeTerm, orIlike, pageRange, parseListQuery, totalPages } from "@mcloud/ui/kit/list-query"

export const metadata: Metadata = {
    title: "Orders — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

// The list changes with every request (page, search, filter), and orders land constantly.
export const dynamic = "force-dynamic"

export default async function OrdersPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const q = parseListQuery(await searchParams, ORDER_FILTERS)
    const { from, to } = pageRange(q.page)
    const supabase = await createClient()

    let query = supabase
        .from("orders")
        .select(
            `id, order_number, store_id, customer_email, total, currency, status, fulfillment_status, created_at, stores ( name, slug )`,
            { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(from, to)

    if (q.filters.status) query = query.eq("status", q.filters.status)

    // Search order number and customer email directly, and any store whose name matches.
    const term = likeTerm(q.q)
    if (term) {
        const { data: matched } = await supabase.from("stores").select("id").ilike("name", `%${term}%`).limit(50)
        const ids = (matched ?? []).map((s) => s.id)
        const clauses = [orIlike(["order_number", "customer_email"], term), ids.length ? `store_id.in.(${ids.join(",")})` : null]
        query = query.or(clauses.filter(Boolean).join(","))
    }

    const { data, count, error } = await query
    const orders = (data ?? []).map((row) => ({
        ...row,
        created_at: row.created_at ?? "",
        store: Array.isArray(row.stores) ? row.stores[0] ?? null : row.stores,
    }))

    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <OrdersClient orders={orders} total={count ?? 0} pages={totalPages(count ?? 0)} q={q} error={error?.message ?? null} />
        </div>
    )
}
