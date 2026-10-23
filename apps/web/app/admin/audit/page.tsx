import type { Metadata } from "next"
import Link from "next/link"
import { AUDIT_ACTIONS } from "@/lib/audit-logic"
import { reachDb } from "@/lib/reach/db"
import { PAGE_SIZE, auditHref, pageRange, parseAuditQuery, totalPages } from "./audit-view"

export const metadata: Metadata = {
    title: "Audit log — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

// Always live: it is the record of what just happened.
export const dynamic = "force-dynamic"

type Row = {
    id: string
    created_at: string
    actor_id: string
    actor_email: string | null
    action: string
    target_type: string | null
    target_id: string | null
    summary: string
    before: unknown
    after: unknown
    ip: string | null
}

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

    const { data, count, error } = (await query) as { data: Row[] | null; count: number | null; error: { message: string } | null }
    const rows = data ?? []
    const pages = totalPages(count ?? 0)

    // Show store names, not uuids.
    const storeIds = [...new Set(rows.filter((r) => r.target_type === "store" && r.target_id).map((r) => r.target_id!))]
    const names = new Map<string, string>()
    if (storeIds.length) {
        const { data: stores } = await db.from("stores").select("id, name").in("id", storeIds)
        for (const s of stores ?? []) names.set(s.id, s.name)
    }

    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <div className="max-w-5xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Audit log</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        What admins changed, and who did it. Append-only.
                        {count != null && ` ${count.toLocaleString()} ${count === 1 ? "entry" : "entries"}.`}
                    </p>
                </div>

                <form action="/admin/audit" className="flex flex-wrap items-end gap-3 text-[13px]">
                    <label className="flex flex-col gap-1">
                        <span className="text-muted-foreground">Action</span>
                        <select name="action" defaultValue={q.action ?? ""} className="rounded-md border border-border bg-card px-2 py-1.5">
                            <option value="">All actions</option>
                            {Object.entries(AUDIT_ACTIONS).map(([k, label]) => (
                                <option key={k} value={k}>{label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-muted-foreground">Actor (id or email)</span>
                        <input name="actor" defaultValue={q.actor ?? ""} className="rounded-md border border-border bg-card px-2 py-1.5" />
                    </label>
                    <button className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">Filter</button>
                    {(q.action || q.actor) && (
                        <Link href="/admin/audit" className="py-1.5 text-primary hover:underline underline-offset-4">Clear</Link>
                    )}
                </form>

                {error ? (
                    <p className="rounded-lg border border-[var(--md-sys-color-error)] px-4 py-3 text-[13px] text-destructive">
                        Could not read the audit log: {error.message}. If this is a new install, run
                        migrations/20261023b_admin_audit_log.sql.
                    </p>
                ) : rows.length === 0 ? (
                    <p className="rounded-lg border border-border bg-card px-5 py-4 text-[13px] text-muted-foreground">
                        {q.action || q.actor ? "No entries match." : "Nothing recorded yet."}
                    </p>
                ) : (
                    <ul className="rounded-lg border border-border bg-card divide-y divide-border">
                        {rows.map((r) => (
                            <li key={r.id} className="px-4 py-3 text-[13px]">
                                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                    <p className="font-medium text-foreground">
                                        {AUDIT_ACTIONS[r.action as keyof typeof AUDIT_ACTIONS] ?? r.action}
                                        {r.target_id && (
                                            <span className="font-normal text-muted-foreground">
                                                {" · "}
                                                {r.target_type === "store"
                                                    ? names.get(r.target_id) ?? r.target_id
                                                    : `${r.target_type ?? "target"} ${r.target_id}`}
                                            </span>
                                        )}
                                    </p>
                                    <time dateTime={r.created_at} className="text-[12px] text-muted-foreground tabular-nums">
                                        {new Date(r.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
                                    </time>
                                </div>
                                <p className="text-muted-foreground mt-0.5">{r.summary}</p>
                                <p className="text-[12px] text-muted-foreground mt-0.5">
                                    by {r.actor_email ?? r.actor_id}{r.ip ? ` · ${r.ip}` : ""}
                                </p>
                                {(r.before != null || r.after != null) && (
                                    <details className="mt-1 text-[12px]">
                                        <summary className="cursor-pointer text-primary">Details</summary>
                                        <pre className="mt-1 overflow-x-auto rounded-md bg-muted/50 p-2">
                                            {JSON.stringify({ before: r.before, after: r.after }, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {pages > 1 && (
                    <nav className="flex items-center justify-between text-[13px]" aria-label="Pagination">
                        {q.page > 1 ? (
                            <Link href={auditHref({ ...q, page: q.page - 1 })} className="text-primary hover:underline underline-offset-4">← Newer</Link>
                        ) : <span />}
                        <span className="text-muted-foreground">Page {q.page} of {pages} · {PAGE_SIZE} per page</span>
                        {q.page < pages ? (
                            <Link href={auditHref({ ...q, page: q.page + 1 })} className="text-primary hover:underline underline-offset-4">Older →</Link>
                        ) : <span />}
                    </nav>
                )}
            </div>
        </div>
    )
}
