import type { Metadata } from "next"
import { createClient } from "@/lib/client"
import Link from "next/link"

export const metadata: Metadata = {
    title: "Admin Dashboard — Menengai Cloud",
    robots: { index: false, follow: false },
}

async function getStats() {
    const supabase = createClient()
    const [users, stores, activeSubs, pendingSubs] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("stores").select("id", { count: "exact", head: true }),
        supabase.from("store_subscriptions").select("id", { count: "exact", head: true }).eq("status", "complete"),
        supabase.from("store_subscriptions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ])
    return {
        users: users.count ?? 0,
        stores: stores.count ?? 0,
        activeSubs: activeSubs.count ?? 0,
        pendingSubs: pendingSubs.count ?? 0,
    }
}

export default async function AdminDashboard() {
    const stats = await getStats()

    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <div className="max-w-4xl space-y-8">

                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">Platform overview</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Users" value={stats.users} icon="people" />
                    <StatCard label="Stores" value={stats.stores} icon="storefront" />
                    <StatCard label="Pro subscribers" value={stats.activeSubs} icon="workspace_premium" />
                    <StatCard
                        label="Pending subs"
                        value={stats.pendingSubs}
                        icon="pending_actions"
                        highlight={stats.pendingSubs > 0}
                    />
                </div>

                {/* Quick links */}
                <div>
                    <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                        Quick access
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <QuickLink
                            href="/admin/subs"
                            icon="subscriptions"
                            label="Subscriptions"
                            description="View and activate pending Pro subscriptions"
                            badge={stats.pendingSubs > 0 ? stats.pendingSubs : undefined}
                        />
                        <QuickLink
                            href="/admin/docs-editor"
                            icon="article"
                            label="Documentation"
                            description="Edit and manage platform documentation pages"
                        />
                    </div>
                </div>

            </div>
        </div>
    )
}

function StatCard({
    label,
    value,
    icon,
    highlight,
}: {
    label: string
    value: number
    icon: string
    highlight?: boolean
}) {
    return (
        <div className={`rounded-lg border bg-card p-4 ${highlight ? 'border-[var(--md-sys-color-error)] bg-[var(--md-sys-color-error-container)]/20' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-muted-foreground truncate pr-1">{label}</span>
                <span className={`material-symbols-outlined text-[16px] shrink-0 ${highlight ? 'text-[var(--md-sys-color-error)]' : 'text-muted-foreground'}`}>
                    {icon}
                </span>
            </div>
            <p className={`text-2xl font-semibold ${highlight ? 'text-[var(--md-sys-color-error)]' : 'text-foreground'}`}>
                {value.toLocaleString()}
            </p>
        </div>
    )
}

function QuickLink({
    href,
    icon,
    label,
    description,
    badge,
}: {
    href: string
    icon: string
    label: string
    description: string
    badge?: number
}) {
    return (
        <Link
            href={href}
            className="flex items-start gap-4 rounded-lg border border-border bg-card p-5 hover:bg-muted/40 transition-colors group"
        >
            <div className="mt-0.5 flex items-center justify-center w-9 h-9 rounded-md bg-brand-container shrink-0">
                <span className="material-symbols-outlined text-[18px] text-[rgb(var(--brand))]">{icon}</span>
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
                        {label}
                    </p>
                    {badge != null && badge > 0 && (
                        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] text-[10px] font-bold">
                            {badge > 9 ? '9+' : badge}
                        </span>
                    )}
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>
            </div>
            <span className="material-symbols-outlined text-[16px] text-muted-foreground mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                arrow_forward
            </span>
        </Link>
    )
}
