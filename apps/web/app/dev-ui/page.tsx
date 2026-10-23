// Dev-only preview of the admin dashboard with fixture data, so the design can be checked (and
// screenshotted) without signing in or touching the database. 404s in production.
import { notFound } from "next/navigation"
import AdminShell from "@/components/admin/admin-shell"
import DashboardView, { type DashboardData } from "../admin/dashboard-view"
import { attentionItems, summarizeRevenue, summarizeSignups } from "../admin/dashboard-logic"

export const dynamic = "force-dynamic"

const DAY = 86_400_000

function fixture(clear: boolean): DashboardData {
    const now = Date.now()
    const orders = Array.from({ length: 160 }, (_, i) => ({
        // Roughly 2.7 orders a day, busier recently, with a weekend dip.
        total: 1500 + ((i * 7919) % 9000),
        currency: "KES",
        created_at: new Date(now - ((i * 0.37 + (i % 5 === 0 ? 0 : 0.2)) * DAY) % (58 * DAY)).toISOString(),
    }))
    const ago = (m: number) => new Date(now - m * 60_000).toISOString()
    return {
        now,
        totals: { users: 412, stores: 63, activeSubs: 14 },
        week: { users: 18, usersPrev: 11, stores: 3, storesPrev: 4 },
        attention: clear ? [] : attentionItems({ pendingSubs: 2, pendingVendors: 3, failedWebhooks: 0 }),
        revenue: summarizeRevenue(orders, now),
        revenueCapped: false,
        signups: summarizeSignups(Array.from({ length: 90 }, (_, i) => new Date(now - ((i * 0.61) % 58) * DAY).toISOString()), now),
        recentOrders: [
            { id: "1", order_number: 1042, total: 4800, currency: "KES", status: "paid", created_at: ago(6), storeName: "Loc'd Essence" },
            { id: "2", order_number: 1041, total: 12500, currency: "KES", status: "pending", created_at: ago(48), storeName: "Techtunes" },
            { id: "3", order_number: 1040, total: 2300, currency: "KES", status: "paid", created_at: ago(190), storeName: "Southern Bypass" },
            { id: "4", order_number: 1039, total: 9100, currency: "KES", status: "refunded", created_at: ago(60 * 26), storeName: "Bhagavad Gita" },
            { id: "5", order_number: 1038, total: 650, currency: "KES", status: "cancelled", created_at: ago(60 * 52), storeName: "Trials" },
        ],
        recentStores: [
            { id: "a", name: "Kisumu Feminist Society", created_at: ago(120) },
            { id: "b", name: "RAC District", created_at: ago(60 * 30) },
            { id: "c", name: "Nuru Notes", created_at: ago(60 * 80) },
        ],
    }
}

export default async function DevUiPage({ searchParams }: { searchParams: Promise<{ clear?: string }> }) {
    if (process.env.NODE_ENV === "production") notFound()
    const clear = (await searchParams).clear === "1"
    return (
        <AdminShell user={{ name: "Preview Admin", email: "preview@example.com" }}>
            <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
                <DashboardView data={fixture(clear)} />
            </div>
        </AdminShell>
    )
}
