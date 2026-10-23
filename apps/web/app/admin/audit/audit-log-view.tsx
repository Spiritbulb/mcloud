import Link from "next/link"
import { PageHeader } from "@mcloud/ui/kit/page-header"
import { Panel } from "@mcloud/ui/kit/panel"
import { Badge } from "@mcloud/ui/kit/badge"
import { EmptyState } from "@mcloud/ui/kit/empty-state"
import { AUDIT_ACTIONS } from "@/lib/audit-logic"
import { PAGE_SIZE, auditHref, auditTone, type AuditQuery } from "./audit-view"

export type AuditRow = {
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

export default function AuditLogView({
    rows,
    total,
    pages,
    q,
    storeNames,
    error,
}: {
    rows: AuditRow[]
    total: number | null
    pages: number
    q: AuditQuery
    storeNames: Record<string, string>
    error: string | null
}) {
    const filtered = Boolean(q.action || q.actor)
    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <PageHeader
                title="Audit log"
                description={`What admins changed, and who did it. Append-only.${total != null ? ` ${total.toLocaleString()} ${total === 1 ? "entry" : "entries"}.` : ""}`}
            />

            <form action="/admin/audit" className="flex flex-wrap items-end gap-3 text-[13px]">
                <label className="flex flex-col gap-1">
                    <span className="text-[12px] text-muted-foreground">Action</span>
                    <select name="action" defaultValue={q.action ?? ""} className="h-8 rounded-md border border-border bg-card px-2 text-foreground">
                        <option value="">All actions</option>
                        {Object.entries(AUDIT_ACTIONS).map(([k, label]) => (
                            <option key={k} value={k}>{label}</option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-[12px] text-muted-foreground">Actor (id or email)</span>
                    <input name="actor" defaultValue={q.actor ?? ""} className="h-8 w-56 rounded-md border border-border bg-card px-2 text-foreground" />
                </label>
                <button className="h-8 rounded-md bg-primary px-3 font-medium text-primary-foreground transition-opacity hover:opacity-90">Filter</button>
                {filtered && <Link href="/admin/audit" className="h-8 py-1.5 text-primary hover:underline underline-offset-4">Clear</Link>}
            </form>

            {error ? (
                <p className="rounded-lg border border-red-300/70 bg-red-50/60 px-4 py-3 text-[13px] text-red-800 dark:border-red-500/30 dark:bg-red-500/[0.06] dark:text-red-300">
                    Could not read the audit log: {error}. If this is a new install, run migrations/20261023b_admin_audit_log.sql.
                </p>
            ) : rows.length === 0 ? (
                <Panel>
                    <EmptyState icon="history" title={filtered ? "No entries match" : "Nothing recorded yet"} description={filtered ? "Try a different action or actor." : "Admin changes will appear here as they happen."} />
                </Panel>
            ) : (
                <Panel flush>
                    <ul className="divide-y divide-border">
                        {rows.map((r) => (
                            <li key={r.id} className="px-4 py-3 text-[13px]">
                                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <Badge tone={auditTone(r.action)}>{AUDIT_ACTIONS[r.action as keyof typeof AUDIT_ACTIONS] ?? r.action}</Badge>
                                        {r.target_id && (
                                            <span className="truncate font-medium text-foreground">
                                                {r.target_type === "store" ? storeNames[r.target_id] ?? r.target_id : `${r.target_type ?? "target"} ${r.target_id}`}
                                            </span>
                                        )}
                                    </div>
                                    <time dateTime={r.created_at} className="text-[12px] text-muted-foreground tabular-nums">
                                        {new Date(r.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
                                    </time>
                                </div>
                                <p className="mt-1 text-foreground">{r.summary}</p>
                                <p className="mt-0.5 text-[12px] text-muted-foreground">
                                    by {r.actor_email ?? r.actor_id}{r.ip ? ` · ${r.ip}` : ""}
                                </p>
                                {(r.before != null || r.after != null) && (
                                    <details className="mt-1.5 text-[12px]">
                                        <summary className="cursor-pointer text-primary">Details</summary>
                                        <pre className="mt-1.5 overflow-x-auto rounded-md border border-border bg-muted/40 p-2.5 font-mono text-[11px] leading-relaxed">
                                            {JSON.stringify({ before: r.before, after: r.after }, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </li>
                        ))}
                    </ul>
                </Panel>
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
    )
}
