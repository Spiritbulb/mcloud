import Link from "next/link"
import { PageHeader } from "@/components/admin/ui/page-header"
import { Panel } from "@/components/admin/ui/panel"
import { Stat, StatStrip, Delta } from "@/components/admin/ui/stat-strip"
import { Sparkline } from "@/components/admin/ui/sparkline"
import { Badge, orderStatusTone } from "@/components/admin/ui/badge"
import { EmptyState } from "@/components/admin/ui/empty-state"
import { Table, Td, Th, Tr } from "@/components/admin/ui/table"
import { percentChange, timeAgo } from "@/components/admin/ui/ui-logic"
import { buttonClass } from "@/components/admin/ui/button"
import { Icon } from "@/components/admin/ui/icon"
import { formatMoney, type AttentionItem, type CurrencyRevenue, type Signups } from "./dashboard-logic"

export type DashboardData = {
    /** Render time in ms; passed in so the view is deterministic (and previewable with fixtures). */
    now: number
    totals: { users: number; stores: number; activeSubs: number }
    week: { users: number; usersPrev: number; stores: number; storesPrev: number }
    attention: AttentionItem[]
    revenue: CurrencyRevenue[]
    revenueCapped: boolean
    signups: Signups
    recentOrders: {
        id: string
        order_number: string | number | null
        total: number | null
        currency: string | null
        status: string | null
        created_at: string | null
        storeName: string | null
    }[]
    recentStores: { id: string; name: string; created_at: string | null }[]
}

export default function DashboardView({ data: d }: { data: DashboardData }) {
    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <PageHeader
                title="Overview"
                description="Platform activity over the last 30 days"
                actions={
                    <Link
                        href="/admin/audit"
                        className={buttonClass("secondary")}
                    >
                        <Icon name="history" size={16} />
                        Audit log
                    </Link>
                }
            />

            <Attention items={d.attention} />

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                <section aria-label="Revenue" className="space-y-3">
                    {d.revenue.length === 0 ? (
                        <Panel title="Paid orders">
                            <EmptyState icon="receipt_long" title="No paid orders yet" description="Paid orders from the last 30 days will show here." />
                        </Panel>
                    ) : (
                        d.revenue.map((r) => <RevenuePanel key={r.currency} r={r} multi={d.revenue.length > 1} />)
                    )}
                    {d.revenueCapped && (
                        <p className="text-[12px] text-muted-foreground">Showing the most recent 10,000 paid orders; totals are understated.</p>
                    )}
                </section>
                <section aria-label="New users">
                    <SignupsPanel s={d.signups} />
                </section>
            </div>

            <StatStrip className="grid-cols-1 sm:grid-cols-3">
                <Stat label="Users" value={d.totals.users.toLocaleString()} hint={<WeekHint n={d.week.users} prev={d.week.usersPrev} />} />
                <Stat label="Stores" value={d.totals.stores.toLocaleString()} hint={<WeekHint n={d.week.stores} prev={d.week.storesPrev} />} />
                <Stat label="Pro subscribers" value={d.totals.activeSubs.toLocaleString()} hint="Active paid plans" />
            </StatStrip>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
                <Panel
                    title="Latest orders"
                    className="lg:col-span-3"
                    flush
                    action={<Link href="/admin/orders" className="text-primary hover:underline underline-offset-4">View all</Link>}
                >
                    {d.recentOrders.length === 0 ? (
                        <EmptyState icon="receipt_long" title="No orders yet" />
                    ) : (
                        <Table>
                            <thead>
                                <tr>
                                    <Th>Store</Th>
                                    <Th>Status</Th>
                                    <Th align="right">Amount</Th>
                                    <Th align="right">When</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {d.recentOrders.map((o) => (
                                    <Tr key={o.id}>
                                        <Td>
                                            <span className="font-medium">{o.storeName ?? "Unknown store"}</span>
                                            <span className="text-muted-foreground"> · #{o.order_number}</span>
                                        </Td>
                                        <Td><Badge tone={orderStatusTone(o.status)}>{o.status ?? "unknown"}</Badge></Td>
                                        <Td align="right">{formatMoney(o.total ?? 0, (o.currency ?? "KES").toUpperCase())}</Td>
                                        <Td align="right" muted>{timeAgo(o.created_at, d.now)}</Td>
                                    </Tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Panel>

                <Panel
                    title="New stores"
                    className="lg:col-span-2"
                    flush
                    action={<Link href="/admin/stores" className="text-primary hover:underline underline-offset-4">View all</Link>}
                >
                    {d.recentStores.length === 0 ? (
                        <EmptyState icon="storefront" title="No stores yet" />
                    ) : (
                        <Table>
                            <tbody>
                                {d.recentStores.map((s) => (
                                    <Tr key={s.id}>
                                        <Td><span className="font-medium">{s.name}</span></Td>
                                        <Td align="right" muted>{timeAgo(s.created_at, d.now)}</Td>
                                    </Tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Panel>
            </div>
        </div>
    )
}

function Attention({ items }: { items: AttentionItem[] }) {
    if (items.length === 0) {
        return (
            <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Icon name="check_circle" size={16} className="text-emerald-600 dark:text-emerald-400" />
                All clear. Nothing is waiting on you.
            </p>
        )
    }
    return (
        <section aria-label="Needs attention" className="overflow-hidden rounded-lg border border-amber-300/70 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/[0.06]">
            <h2 className="px-4 pt-3 pb-1 font-sans text-[12px] font-medium text-amber-800 dark:text-amber-300">Needs attention</h2>
            <ul className="divide-y divide-amber-300/50 dark:divide-amber-500/20">
                {items.map((a) => (
                    <li key={a.id}>
                        <Link href={a.href} className="group flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors hover:bg-amber-100/60 dark:hover:bg-amber-500/10">
                            <Icon name={a.icon} size={18} className="text-amber-700 dark:text-amber-300" />
                            <span className="min-w-0 flex-1 text-foreground">
                                <span className="font-semibold tabular-nums">{a.count.toLocaleString()}</span> {a.label}
                            </span>
                            <Icon name="arrow_forward" size={16} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}

function RevenuePanel({ r, multi }: { r: CurrencyRevenue; multi: boolean }) {
    return (
        <Panel title={multi ? `Paid orders · ${r.currency}` : "Paid orders"} description="Last 30 days, compared with the 30 days before">
            <p className="text-[12px] text-muted-foreground">Revenue</p>
            <div className="mt-1 flex items-baseline gap-2">
                <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">{formatMoney(r.last30, r.currency)}</p>
                <Delta pct={percentChange(r.last30, r.prev30)} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-[13px]">
                <div>
                    <dt className="text-[12px] text-muted-foreground">Orders</dt>
                    <dd className="mt-0.5 flex items-baseline gap-1.5 font-medium text-foreground tabular-nums">
                        {r.orders30.toLocaleString()}
                        <Delta pct={percentChange(r.orders30, r.ordersPrev30)} />
                    </dd>
                </div>
                <div>
                    <dt className="text-[12px] text-muted-foreground">Last 7 days</dt>
                    <dd className="mt-0.5 font-medium text-foreground tabular-nums">{formatMoney(r.last7, r.currency)}</dd>
                </div>
            </dl>
            <div className="mt-5 text-[rgb(var(--brand))]">
                <Sparkline values={r.daily} label={`Daily ${r.currency} sales, last ${r.daily.length} days`} height={72} />
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{r.daily.length} days ago</span>
                    <span>Today</span>
                </div>
            </div>
        </Panel>
    )
}

function SignupsPanel({ s }: { s: Signups }) {
    return (
        <Panel title="New users" description="Last 30 days, compared with the 30 days before">
            <p className="text-[12px] text-muted-foreground">Sign-ups</p>
            <div className="mt-1 flex items-baseline gap-2">
                <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">{s.last30.toLocaleString()}</p>
                <Delta pct={percentChange(s.last30, s.prev30)} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-[13px]">
                <div>
                    <dt className="text-[12px] text-muted-foreground">Previous 30 days</dt>
                    <dd className="mt-0.5 font-medium text-foreground tabular-nums">{s.prev30.toLocaleString()}</dd>
                </div>
                <div>
                    <dt className="text-[12px] text-muted-foreground">Last 7 days</dt>
                    <dd className="mt-0.5 font-medium text-foreground tabular-nums">{s.last7.toLocaleString()}</dd>
                </div>
            </dl>
            <div className="mt-5 text-[rgb(var(--brand))]">
                <Sparkline values={s.daily} label={`New users per day, last ${s.daily.length} days`} height={72} />
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{s.daily.length} days ago</span>
                    <span>Today</span>
                </div>
            </div>
        </Panel>
    )
}

function WeekHint({ n, prev }: { n: number; prev: number }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            +{n.toLocaleString()} this week
            {prev > 0 && <Delta pct={percentChange(n, prev)} />}
        </span>
    )
}
