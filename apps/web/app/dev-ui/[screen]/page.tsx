// Dev-only previews of the admin list screens with fixture data (no login, no database).
// /dev-ui/stores, /orders, /users, /subs, /webhooks, /recovery. 404s in production.
import { notFound } from "next/navigation"
import AdminShell from "@/components/admin/admin-shell"
import StoresClient from "@/components/admin/stores-client"
import OrdersClient from "@/components/admin/orders-client"
import UsersClient from "@/components/admin/users-client"
import WebhooksClient from "@/components/admin/webhooks-client"
import SubscriptionsClient from "@/components/subscriptions-client"
import RecoveryClient from "../../admin/handoff-recovery/recovery-client"

export const dynamic = "force-dynamic"

const iso = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3_600_000).toISOString()

function screen(name: string) {
    switch (name) {
        case "stores":
            return (
                <StoresClient
                    stores={[
                        { id: "1", name: "Loc'd Essence", slug: "locd26", logo_url: null, is_pro: true, is_active: true, pro_since: iso(900), pro_expires_at: null, owner_id: "a", currency: "KES", created_at: iso(2000), owner: { name: "Joan Maday", email: "joanmadaybusiness@gmail.com" } },
                        { id: "2", name: "Techtunes", slug: "techtunes", logo_url: null, is_pro: false, is_active: true, pro_since: null, pro_expires_at: null, owner_id: "b", currency: "KES", created_at: iso(1500), owner: { name: null, email: "techtunes@zohomail.com" } },
                        { id: "3", name: "Southern Bypass", slug: "southernbypass", logo_url: null, is_pro: false, is_active: false, pro_since: null, pro_expires_at: null, owner_id: "c", currency: "KES", created_at: iso(3000), owner: { name: "Claudio S.", email: "claudioserem@gmail.com" } },
                        { id: "4", name: "REACH", slug: "reeeaach", logo_url: null, is_pro: true, is_active: true, pro_since: iso(300), pro_expires_at: null, owner_id: "d", currency: "KES", created_at: iso(5000), owner: { name: "Bentley Bush", email: "kurozai@spiritbulb.org" } },
                    ]}
                />
            )
        case "orders":
            return (
                <OrdersClient
                    orders={[
                        { id: "1", order_number: "1042", store_id: "1", customer_email: "amina@example.org", total: 4800, currency: "KES", status: "paid", fulfillment_status: "unfulfilled", created_at: iso(0.2), store: { name: "Loc'd Essence", slug: "locd26" } },
                        { id: "2", order_number: "1041", store_id: "2", customer_email: "peter@example.org", total: 12500, currency: "KES", status: "pending", fulfillment_status: "unfulfilled", created_at: iso(1), store: { name: "Techtunes", slug: "techtunes" } },
                        { id: "3", order_number: "1040", store_id: "3", customer_email: "wanjiru@example.org", total: 2300, currency: "KES", status: "paid", fulfillment_status: "fulfilled", created_at: iso(30), store: { name: "Southern Bypass", slug: "southernbypass" } },
                        { id: "4", order_number: "1039", store_id: "1", customer_email: "otieno@example.org", total: 9100, currency: "KES", status: "refunded", fulfillment_status: "partial", created_at: iso(96), store: { name: "Loc'd Essence", slug: "locd26" } },
                        { id: "5", order_number: "1038", store_id: "2", customer_email: null, total: 650, currency: "KES", status: "cancelled", fulfillment_status: null, created_at: iso(400), store: null },
                    ]}
                    total={120}
                    pages={3}
                    q={{ page: 2, q: null, filters: { status: null } }}
                    error={null}
                />
            )
        case "users":
            return (
                <UsersClient
                    users={[
                        { id: "1", name: "Bentley Bush", email: "bentley@spiritbulb.org", avatar_url: null, role: "admin", created_at: iso(5000) },
                        { id: "2", name: "Joan Maday", email: "joanmadaybusiness@gmail.com", avatar_url: null, role: "client", created_at: iso(3000) },
                        { id: "3", name: null, email: "tehillahkachila@gmail.com", avatar_url: null, role: "customer", created_at: iso(900) },
                        { id: "4", name: "Elizabeth Nalwakho", email: "elizabethnalwakho80@gmail.com", avatar_url: null, role: "client", created_at: iso(60) },
                    ]}
                    total={35}
                    admins={1}
                    pages={1}
                    q={{ page: 1, q: null, filters: { role: null } }}
                    error={null}
                />
            )
        case "subs":
            return (
                <SubscriptionsClient
                    subscriptions={[
                        { id: "1", status: "pending", amount: 1500, currency: "KES", created_at: iso(3), provider: "wallet", google_play_order_id: null, stores: { id: "2", name: "Techtunes", slug: "techtunes", is_pro: false } },
                        { id: "2", status: "active", amount: 1500, currency: "KES", created_at: iso(700), provider: "wallet", google_play_order_id: null, stores: { id: "1", name: "Loc'd Essence", slug: "locd26", is_pro: true } },
                        { id: "3", status: "cancelled", amount: 0, currency: "KES", created_at: iso(2000), provider: "admin", google_play_order_id: null, stores: { id: "3", name: "Southern Bypass", slug: "southernbypass", is_pro: false } },
                    ]}
                />
            )
        case "webhooks":
            return (
                <WebhooksClient
                    logs={[
                        { id: "1", provider: "daraja", event_type: "stk.callback", status: "success", store_id: "1", created_at: iso(0.1), error_message: null, payload: { ResultCode: 0, Amount: 4800 }, store: { name: "Loc'd Essence" } },
                        { id: "2", provider: "palpluss", event_type: "payment.failed", status: "failed", store_id: "2", created_at: iso(5), error_message: "Amount does not cover order total", payload: { amount: 100 }, store: { name: "Techtunes" } },
                        { id: "3", provider: "paypal", event_type: "capture.completed", status: "success", store_id: null, created_at: iso(50), error_message: null, payload: {}, store: null },
                    ]}
                    total={3}
                    failed={1}
                    providers={["daraja", "palpluss", "paypal"]}
                    pages={1}
                    q={{ page: 1, q: null, filters: { provider: null, status: null } }}
                    error={null}
                />
            )
        case "recovery":
            return (
                <RecoveryClient
                    resendConfigured
                    people={[
                        { id: "a", email: "elsie@gmail.com", name: "Elsie M.", lastSignInAt: iso(30), recent: true },
                        { id: "b", email: "victor@gmail.com", name: null, lastSignInAt: iso(60), recent: true },
                        { id: "c", email: "chebet@gmail.com", name: null, lastSignInAt: iso(24 * 45), recent: false },
                    ]}
                />
            )
        default:
            return null
    }
}

export default async function DevScreen({ params }: { params: Promise<{ screen: string }> }) {
    if (process.env.NODE_ENV === "production") notFound()
    const content = screen((await params).screen)
    if (!content) notFound()
    return (
        <AdminShell user={{ name: "Preview Admin", email: "preview@example.com" }}>
            <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">{content}</div>
        </AdminShell>
    )
}
