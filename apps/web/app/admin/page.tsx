import type { Metadata } from "next"
import { createClient } from "@mcloud/db/server"
import { reachDb } from "@/lib/reach/db"
import { attentionItems, summarizeRevenue, summarizeSignups } from "./dashboard-logic"
import DashboardView, { type DashboardData } from "./dashboard-view"

export const metadata: Metadata = {
    title: "Admin Dashboard — Menengai Cloud",
    robots: { index: false, follow: false },
}

// Always live: this is the page you open to see what changed.
export const dynamic = "force-dynamic"

const DAY_MS = 86_400_000
const ORDER_CAP = 10_000

async function getDashboard(): Promise<DashboardData> {
    const supabase = await createClient()
    const now = Date.now()
    const iso = (days: number) => new Date(now - days * DAY_MS).toISOString()
    const head = { count: "exact" as const, head: true }

    const [
        users, stores, activeSubs, pendingSubs, newUsers7, newUsersPrev7, newStores7, newStoresPrev7, failedWebhooks,
        paidOrders, recentOrders, recentStores, signups,
    ] = await Promise.all([
        supabase.from("users").select("id", head),
        supabase.from("stores").select("id", head),
        supabase.from("store_subscriptions").select("id", head).eq("status", "active"),
        supabase.from("store_subscriptions").select("id", head).eq("status", "pending"),
        supabase.from("users").select("id", head).gte("created_at", iso(7)),
        supabase.from("users").select("id", head).gte("created_at", iso(14)).lt("created_at", iso(7)),
        supabase.from("stores").select("id", head).gte("created_at", iso(7)),
        supabase.from("stores").select("id", head).gte("created_at", iso(14)).lt("created_at", iso(7)),
        supabase.from("webhook_logs").select("id", head).eq("status", "failed").gte("created_at", iso(1)),
        // 60 days: the latest 30 plus the 30 before, for the comparison. Capped so one busy period
        // cannot make this page slow; the cap is flagged in the UI.
        supabase.from("orders").select("total, currency, created_at").eq("status", "paid").gte("created_at", iso(60)).limit(ORDER_CAP),
        supabase.from("orders")
            .select("id, order_number, total, currency, status, created_at, stores ( name )")
            .order("created_at", { ascending: false })
            .limit(8),
        supabase.from("stores")
            .select("id, name, created_at")
            .order("created_at", { ascending: false })
            .limit(6),
        supabase.from("users").select("created_at").gte("created_at", iso(60)).order("created_at", { ascending: false }).limit(ORDER_CAP),
    ])

    // reach_vendors.approval_status is newer than the generated DB types, hence reachDb().
    const pendingVendors = await (await reachDb())
        .from("reach_vendors")
        .select("id", head)
        .eq("approval_status", "pending")

    return {
        now,
        totals: { users: users.count ?? 0, stores: stores.count ?? 0, activeSubs: activeSubs.count ?? 0 },
        week: {
            users: newUsers7.count ?? 0,
            usersPrev: newUsersPrev7.count ?? 0,
            stores: newStores7.count ?? 0,
            storesPrev: newStoresPrev7.count ?? 0,
        },
        attention: attentionItems({
            pendingSubs: pendingSubs.count ?? 0,
            pendingVendors: pendingVendors.count ?? 0,
            failedWebhooks: failedWebhooks.count ?? 0,
        }),
        revenue: summarizeRevenue(paidOrders.data ?? [], now),
        signups: summarizeSignups((signups.data ?? []).map((u) => u.created_at), now),
        revenueCapped: (paidOrders.data?.length ?? 0) >= ORDER_CAP,
        recentOrders: (recentOrders.data ?? []).map((o) => {
            const store = Array.isArray(o.stores) ? o.stores[0] : o.stores
            return {
                id: o.id,
                order_number: o.order_number,
                total: o.total,
                currency: o.currency,
                status: o.status,
                created_at: o.created_at,
                storeName: store?.name ?? null,
            }
        }),
        recentStores: recentStores.data ?? [],
    }
}

export default async function AdminDashboard() {
    const data = await getDashboard()
    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <DashboardView data={data} />
        </div>
    )
}
