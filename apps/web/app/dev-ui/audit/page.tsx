// Dev-only preview of the audit log with fixture data. 404s in production. See ../page.tsx.
import { notFound } from "next/navigation"
import AdminShell from "@/components/admin/admin-shell"
import AuditLogView, { type AuditRow } from "../../admin/audit/audit-log-view"
import { parseAuditQuery, totalPages } from "../../admin/audit/audit-view"

export const dynamic = "force-dynamic"

const row = (i: number, minutesAgo: number, r: Partial<AuditRow>): AuditRow => ({
    id: String(i),
    created_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    actor_id: "auth0|69b0fc02f5f8370eea772e82",
    actor_email: "bentley@spiritbulb.org",
    action: "store.status.set",
    target_type: "store",
    target_id: "s1",
    summary: "",
    before: null,
    after: null,
    ip: "197.232.10.4",
    ...r,
})

export default async function DevAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    if (process.env.NODE_ENV === "production") notFound()
    const sp = await searchParams
    const rows: AuditRow[] = sp.empty ? [] : [
        row(1, 4, { action: "user.role.set", target_type: "user", target_id: "user_01M5K…", summary: "Role customer → admin", before: { role: "customer" }, after: { role: "admin" } }),
        row(2, 55, { action: "store.plan.grant", summary: "Granted pro (was hobby)", before: { plan: "hobby" }, after: { plan: "pro" } }),
        row(3, 60 * 5, { action: "store.status.set", summary: "Suspended store", before: { is_active: true }, after: { is_active: false } }),
        row(4, 60 * 27, { action: "subscription.activate", target_type: "subscription", target_id: "9c1e…", summary: "Activated subscription for store s1 (plan now pro)" }),
        row(5, 60 * 50, { action: "handoff.recovery.send", target_type: null, target_id: null, summary: "Sent 7 recovery email(s); 0 failed, 1 skipped", after: { sent: ["…"], failed: [], skipped: ["…"] } }),
    ]
    return (
        <AdminShell user={{ name: "Preview Admin", email: "preview@example.com" }}>
            <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
                <AuditLogView rows={rows} total={rows.length ? 132 : 0} pages={totalPages(rows.length ? 132 : 0)} q={parseAuditQuery(sp)} storeNames={{ s1: "Loc'd Essence" }} error={null} />
            </div>
        </AdminShell>
    )
}
