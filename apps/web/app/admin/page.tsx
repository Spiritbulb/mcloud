import type { Metadata } from "next"
import { createClient } from "@mcloud/db/server"
import Link from "next/link"
import { reachDb } from "@/lib/reach/db"
import {
    attentionItems,
    formatMoney,
    summarizeRevenue,
    type CurrencyRevenue,
} from "./dashboard-logic"

export const metadata: Metadata = {
    title: "Admin Dashboard — Menengai Cloud",
    robots: { index: false, follow: false },
}

// Always live: this is the page you open to see what changed.
export const dynamic = "force-dynamic"

const DAY_MS = 86_400_000

async function getDashboard() {
    const supabase = await createClient()
    const now = Date.now()
    const since30 = new Date(now - 30 * DAY_MS).toISOString()
    const since7 = new Date(now - 7 * DAY_MS).toISOString()
    const since24h = new Date(now - DAY_MS).toISOString()
    const head = { count: "exact" as const, head: true }

    const [
        users, stores, activeSubs, pendingSubs, newUsers7, newStores7, failedWebhooks,
        paidOrders, recentOrders, recentStores,
    ] = await Promise.all([
        supabase.from("users").select("id", head),
        supabase.from("stores").select("id", head),
        supabase.from("store_subscriptions").select("id", head).eq("status", "active"),
        supabase.from("store_subscriptions").select("id", head).eq("status", "pending"),
        supabase.from("users").select("id", head).gte("created_at", since7),
        supabase.from("stores").select("id", head).gte("created_at", since7),
        supabase.from("webhook_logs").select("id", head).eq("status", "failed").gte("created_at", since24h),
        // Capped so one busy month cannot make this page slow; the cap is flagged in the UI.
        supabase.from("orders").select("total, currency, created_at").eq("status", "paid").gte("created_at", since30).limit(10000),
        supabase.from("orders")
            .select("id, order_number, total, currency, status, created_at, stores ( name )")
            .order("created_at", { ascending: false })
            .limit(8),
        supabase.from("stores")
            .select("id, name, slug, created_at")
            .order("created_at", { ascending: false })
            .limit(6),
    ])

    // reach_vendors.approval_status is newer than the generated DB types, hence reachDb().
    const pendingVendors = await (await reachDb())
        .from("reach_vendors")
        .select("id", head)
        .eq("approval_status", "pending")

    return {
        totals: { users: users.count ?? 0, stores: stores.count ?? 0, activeSubs: activeSubs.count ?? 0 },
        week: { users: newUsers7.count ?? 0, stores: newStores7.count ?? 0 },
        attention: attentionItems({
            pendingSubs: pendingSubs.count ?? 0,
            pendingVendors: pendingVendors.count ?? 0,
            failedWebhooks: failedWebhooks.count ?? 0,
        }),
        revenue: summarizeRevenue(paidOrders.data ?? [], now),
        revenueCapped: (paidOrders.data?.length ?? 0) >= 10000,
        recentOrders: (recentOrders.data ?? []).map((o) => ({
            ...o,
            store: Array.isArray(o.stores) ? o.stores[0] ?? null : o.stores,
        })),
        recentStores: recentStores.data ?? [],
    }
}

export default async function AdminDashboard() {
    const d = await getDashboard()

    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <div className="max-w-5xl space-y-8">

                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">Platform overview</p>
                </div>

                {/* Needs attention */}
                <section aria-labelledby="attention-h">
                    <SectionTitle id="attention-h">Needs attention</SectionTitle>
                    {d.attention.length === 0 ? (
                        <div className="rounded-lg border border-border bg-card px-5 py-4 flex items-center gap-3 text-[13px] text-muted-foreground">
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            All clear. Nothing is waiting on you.
                        </div>
                    ) : (
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {d.attention.map((a) => (
                                <li key={a.id}>
                                    <Link
                                        href={a.href}
                                        className="flex items-center gap-4 rounded-lg border border-[var(--md-sys-color-error)] bg-card p-4 hover:bg-muted/40 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px] text-destructive shrink-0">{a.icon}</span>
                                        <span className="text-2xl font-semibold text-foreground tabular-nums">{a.count.toLocaleString()}</span>
                                        <span className="text-[13px] text-muted-foreground min-w-0">{a.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Revenue */}
                <section aria-labelledby="revenue-h">
                    <SectionTitle id="revenue-h">Paid orders, last 30 days</SectionTitle>
                    {d.revenue.length === 0 ? (
                        <p className="rounded-lg border border-border bg-card px-5 py-4 text-[13px] text-muted-foreground">
                            No paid orders in the last 30 days.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {d.revenue.map((r) => <RevenueCard key={r.currency} r={r} />)}
                        </div>
                    )}
                    {d.revenueCapped && (
                        <p className="text-[11px] text-muted-foreground mt-2">
                            Showing the most recent 10,000 paid orders; totals are understated.
                        </p>
                    )}
                </section>

                {/* Totals */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <StatCard label="Users" value={d.totals.users} sub={`+${d.week.users} this week`} icon="people" />
                    <StatCard label="Stores" value={d.totals.stores} sub={`+${d.week.stores} this week`} icon="storefront" />
                    <StatCard label="Pro subscribers" value={d.totals.activeSubs} icon="workspace_premium" />
                </div>

                {/* Recent activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section aria-labelledby="orders-h">
                        <SectionTitle id="orders-h">Latest orders</SectionTitle>
                        <ul className="rounded-lg border border-border bg-card divide-y divide-border">
                            {d.recentOrders.length === 0 && <Empty>No orders yet.</Empty>}
                            {d.recentOrders.map((o) => (
                                <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]">
                                    <div className="min-w-0">
                                        <p className="font-medium text-foreground truncate">
                                            {o.store?.name ?? "Unknown store"}
                                            <span className="text-muted-foreground font-normal"> · #{o.order_number}</span>
                                        </p>
                                        <p className="text-[12px] text-muted-foreground">
                                            {o.status} · {timeAgo(o.created_at)}
                                        </p>
                                    </div>
                                    <span className="tabular-nums text-foreground shrink-0">
                                        {formatMoney(o.total ?? 0, (o.currency ?? "KES").toUpperCase())}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <Link href="/admin/orders" className="inline-block mt-2 text-[12px] text-primary hover:underline underline-offset-4">
                            All orders
                        </Link>
                    </section>

                    <section aria-labelledby="stores-h">
                        <SectionTitle id="stores-h">New stores</SectionTitle>
                        <ul className="rounded-lg border border-border bg-card divide-y divide-border">
                            {d.recentStores.length === 0 && <Empty>No stores yet.</Empty>}
                            {d.recentStores.map((s) => (
                                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]">
                                    <p className="font-medium text-foreground truncate">{s.name}</p>
                                    <span className="text-[12px] text-muted-foreground shrink-0">{timeAgo(s.created_at)}</span>
                                </li>
                            ))}
                        </ul>
                        <Link href="/admin/stores" className="inline-block mt-2 text-[12px] text-primary hover:underline underline-offset-4">
                            All stores
                        </Link>
                    </section>
                </div>

            </div>
        </div>
    )
}

function timeAgo(iso: string | null): string {
    if (!iso) return ""
    const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000))
    if (mins < 60) return `${mins}m ago`
    if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`
    return `${Math.round(mins / (60 * 24))}d ago`
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
    return (
        <h2 id={id} className="text-[13px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            {children}
        </h2>
    )
}

function Empty({ children }: { children: React.ReactNode }) {
    return <li className="px-4 py-3 text-[13px] text-muted-foreground">{children}</li>
}

function RevenueCard({ r }: { r: CurrencyRevenue }) {
    const max = Math.max(...r.daily, 1)
    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[12px] text-muted-foreground">{r.currency}</p>
            <p className="text-2xl font-semibold text-foreground tabular-nums">{formatMoney(r.last30, r.currency)}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
                {r.orders30.toLocaleString()} orders · {formatMoney(r.last7, r.currency)} in the last 7 days
            </p>
            <div className="flex items-end gap-[3px] h-10 mt-3" role="img" aria-label={`Daily ${r.currency} sales, last ${r.daily.length} days`}>
                {r.daily.map((v, i) => (
                    <div
                        key={i}
                        className="flex-1 rounded-sm bg-[rgb(var(--brand))]"
                        style={{ height: `${Math.max(v > 0 ? 8 : 2, (v / max) * 100)}%`, opacity: v > 0 ? 1 : 0.25 }}
                    />
                ))}
            </div>
        </div>
    )
}

function StatCard({ label, value, sub, icon }: { label: string; value: number; sub?: string; icon: string }) {
    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-muted-foreground truncate pr-1">{label}</span>
                <span className="material-symbols-outlined text-[16px] shrink-0 text-muted-foreground">{icon}</span>
            </div>
            <p className="text-2xl font-semibold text-foreground tabular-nums">{value.toLocaleString()}</p>
            {sub && <p className="text-[12px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
    )
}
