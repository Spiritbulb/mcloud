import type { Metadata } from "next"
import { reachDb } from "@/lib/reach/db"
import { pageRange, parseAuditQuery, totalPages } from "./audit-view"
import AuditLogView, { type AuditRow } from "./audit-log-view"

export const metadata: Metadata = {
    title: "Audit log — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

// Always live: it is the record of what just happened.
export const dynamic = "force-dynamic"

export default async function AuditPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const q = parseAuditQuery(await searchParams)
    const { from, to } = pageRange(q.page)

    // The table is newer than the generated DB types, hence the untyped client.
    const db = await reachDb()
    let query = db
        .from("admin_audit_log")
        .select("id, created_at, actor_id, actor_email, action, target_type, target_id, summary, before, after, ip", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to)
    if (q.action) query = query.eq("action", q.action)
    if (q.actor) query = query.or(`actor_id.eq.${q.actor.replace(/[,()]/g, "")},actor_email.ilike.%${q.actor.replace(/[,()%]/g, "")}%`)

    const { data, count, error } = (await query) as { data: AuditRow[] | null; count: number | null; error: { message: string } | null }
    const rows = data ?? []

    // Show store names, not uuids.
    const storeIds = [...new Set(rows.filter((r) => r.target_type === "store" && r.target_id).map((r) => r.target_id!))]
    const storeNames: Record<string, string> = {}
    if (storeIds.length) {
        const { data: stores } = await db.from("stores").select("id, name").in("id", storeIds)
        for (const s of stores ?? []) storeNames[s.id] = s.name
    }

    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <AuditLogView rows={rows} total={count} pages={totalPages(count ?? 0)} q={q} storeNames={storeNames} error={error?.message ?? null} />
        </div>
    )
}
