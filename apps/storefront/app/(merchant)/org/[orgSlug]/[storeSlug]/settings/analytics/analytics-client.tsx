'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Plan } from '@mcloud/merchant/plans'
import { Button } from '@mcloud/ui/kit/button'
import { Icon } from '@mcloud/ui/kit/icon'
import { LoadError } from '@mcloud/ui/kit/load-error'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Skeleton } from '@mcloud/ui/kit/skeleton'
import { Stat, StatStrip } from '@mcloud/ui/kit/stat-strip'
import { Tabs } from '@mcloud/ui/kit/tabs'
import { cn } from '@mcloud/ui/utils'
import { ProGateInline } from '@/components/pro'
import { formatCurrency, funnelRate } from '../overview-logic'

// ─── Types ────────────────────────────────────────────────────────────────────

type SeriesPoint = { date: string; views: number; orders: number; revenue: number }
type Breakdown = { key: string; value: number }
type TopProduct = { id: string; name: string; image_url?: string | null; revenue: number; units_sold: number }

type Analytics = {
    currency: string
    totals: { views: number; orders: number; revenue: number; add_to_carts: number; unique_visitors: number }
    previous: { views: number; orders: number; revenue: number }
    series: SeriesPoint[]
    by_device: Breakdown[]
    // Advanced blocks: Hobby+ only. Omitted from the payload below Hobby, so
    // these must stay optional or the UI crashes reading .funnel etc. on Free.
    funnel?: { views: number; add_to_carts: number; checkouts: number; orders: number }
    by_source?: Breakdown[]
    by_country?: Breakdown[]
    top_products?: TopProduct[]
}

const RANGES = [
    { id: '7d', label: '7 days' },
    { id: '30d', label: '30 days' },
    { id: '90d', label: '90 days' },
]

const METRICS = [
    { id: 'revenue' as const, label: 'Revenue' },
    { id: 'views' as const, label: 'Visits' },
    { id: 'orders' as const, label: 'Orders' },
]

function fmtNum(n: number) {
    return new Intl.NumberFormat('en-KE').format(n)
}

// ─── Trend chart (inline SVG, no dependency) ──────────────────────────────────

function TrendChart({ series, currency }: { series: SeriesPoint[]; currency: string }) {
    const [metric, setMetric] = useState<'revenue' | 'views' | 'orders'>('revenue')
    const W = 720, H = 180, P = 8
    const vals = series.map((p) => p[metric])
    const max = Math.max(1, ...vals)
    const stepX = series.length > 1 ? (W - P * 2) / (series.length - 1) : 0
    const total = vals.reduce((a, b) => a + b, 0)

    const points = series.map((p, i) => [P + i * stepX, H - P - (p[metric] / max) * (H - P * 2)] as const)
    const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    const area = points.length
        ? `${line} L${points[points.length - 1][0].toFixed(1)},${H - P} L${points[0][0].toFixed(1)},${H - P} Z`
        : ''

    return (
        <Panel
            title="Over time"
            action={
                <div role="group" aria-label="Metric" className="inline-flex rounded-md border border-border p-0.5">
                    {METRICS.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            aria-pressed={metric === m.id}
                            onClick={() => setMetric(m.id)}
                            className={cn(
                                'h-6 rounded px-2 text-[12px] transition-colors',
                                metric === m.id ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            }
        >
            {total === 0 ? (
                <div className="flex h-[180px] items-center justify-center text-[12px] text-muted-foreground">No {METRICS.find((m) => m.id === metric)?.label.toLowerCase()} in this range yet.</div>
            ) : (
                <svg viewBox={`0 0 ${W} ${H}`} className="h-[180px] w-full text-primary" preserveAspectRatio="none" role="img" aria-label={`${metric} per day`}>
                    <path d={area} fill="currentColor" fillOpacity={0.08} />
                    <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </svg>
            )}
            <div className="mt-2 flex items-center justify-between text-[12px] text-muted-foreground">
                <span>{series[0]?.date ?? ''}</span>
                <span className="font-medium text-foreground tabular-nums">
                    {metric === 'revenue' ? formatCurrency(total, currency) : fmtNum(total)} total
                </span>
                <span>{series[series.length - 1]?.date ?? ''}</span>
            </div>
        </Panel>
    )
}

// ─── Bars ─────────────────────────────────────────────────────────────────────

function Bar({ label, value, share, detail }: { label: string; value: string; share: number; detail?: string | null }) {
    return (
        <div>
            <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                <span className="truncate text-foreground">{label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                    {value}
                    {detail && <span className="ml-2 text-foreground">{detail}</span>}
                </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, share * 100)}%` }} />
            </div>
        </div>
    )
}

function Funnel({ funnel }: { funnel: NonNullable<Analytics['funnel']> }) {
    // Each rate is share-of-visits (top of funnel), not step-over-step, so a step
    // larger than the one above it can't produce a >100% rate.
    const steps = [
        { label: 'Visits', value: funnel.views },
        { label: 'Added to cart', value: funnel.add_to_carts },
        { label: 'Started checkout', value: funnel.checkouts },
        { label: 'Ordered', value: funnel.orders },
    ]
    const max = Math.max(1, funnel.views)
    return (
        <Panel title="Conversion">
            <div className="space-y-3">
                {steps.map((s, i) => (
                    <Bar key={s.label} label={s.label} value={fmtNum(s.value)} share={s.value / max} detail={i > 0 ? funnelRate(s.value, funnel.views) : null} />
                ))}
            </div>
        </Panel>
    )
}

function BreakdownPanel({ title, items }: { title: string; items: Breakdown[] }) {
    const total = items.reduce((a, b) => a + b.value, 0)
    return (
        <Panel title={title}>
            {items.length === 0 ? (
                <p className="py-2 text-[12px] text-muted-foreground">No visits yet.</p>
            ) : (
                <div className="space-y-2.5">
                    {items.map((it) => (
                        <Bar key={it.key} label={it.key.charAt(0).toUpperCase() + it.key.slice(1)} value={fmtNum(it.value)} share={total ? it.value / total : 0} />
                    ))}
                </div>
            )}
        </Panel>
    )
}

function TopProducts({ products, currency }: { products: TopProduct[] | undefined; currency: string }) {
    return (
        <Panel title="Top products" flush>
            {!products || products.length === 0 ? (
                <p className="px-4 py-4 text-[12px] text-muted-foreground">No sales in this range yet.</p>
            ) : (
                <ul className="divide-y divide-border">
                    {products.map((p) => (
                        <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                                {p.image_url
                                    // eslint-disable-next-line @next/next/no-img-element
                                    ? <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                                    : <Icon name="inventory_2" size={16} className="text-muted-foreground" />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] text-foreground">{p.name}</span>
                                <span className="block text-[12px] text-muted-foreground">{fmtNum(p.units_sold)} sold</span>
                            </span>
                            <span className="shrink-0 text-[13px] font-medium tabular-nums text-foreground">{formatCurrency(p.revenue, currency)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AnalyticsClient({ slug, storeName, plan }: { slug: string; storeName: string; plan: Plan }) {
    const [range, setRange] = useState('30d')
    const [data, setData] = useState<Analytics | null>(null)
    // Keyed by the request it belongs to, so changing range shows loading without a synchronous
    // setState in the effect.
    const [loadedKey, setLoadedKey] = useState<string | null>(null)
    const [error, setError] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)
    const requestKey = `${range}:${reloadKey}`
    const loading = loadedKey !== requestKey

    useEffect(() => {
        let cancelled = false
        // Same-origin call: this route lives in this app, and the auth cookie is
        // scoped to this domain; a cross-domain absolute URL would drop it and 401.
        fetch(`/api/store/${slug}/analytics?range=${range}`, { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            // A payload without totals (the RPC drifted once, SPI-65) is an error, not a crash.
            .then((d: Analytics) => (d?.totals && d.previous && Array.isArray(d.series) ? d : Promise.reject()))
            .then((d) => {
                if (cancelled) return
                setData(d)
                setError(false)
            })
            .catch(() => {
                if (!cancelled) setError(true)
            })
            .finally(() => {
                if (!cancelled) setLoadedKey(requestKey)
            })
        return () => {
            cancelled = true
        }
    }, [slug, range, requestKey])

    const currency = data?.currency ?? 'KES'

    const exportCsv = useCallback(() => {
        if (!data) return
        const rows = [
            ['date', 'views', 'orders', 'revenue'],
            ...data.series.map((p) => [p.date, p.views, p.orders, p.revenue]),
        ]
        const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${slug}-analytics-${range}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }, [data, slug, range])

    const convRate = useMemo(() => (data ? funnelRate(data.totals.orders, data.totals.views) : null), [data])
    const show = !loading && !error && data

    return (
        <div className="space-y-6">
            <PageHeader
                title="Analytics"
                description={`Visits, orders and revenue for ${storeName}.`}
                actions={
                    <Button size="sm" onClick={exportCsv} disabled={!show}>
                        <Icon name="download" size={14} />
                        Export CSV
                    </Button>
                }
            />

            <Tabs label="Date range" items={RANGES} value={range} onChange={setRange} />

            {error && !loading ? (
                <Panel>
                    <LoadError title="Couldn't load analytics" onRetry={() => setReloadKey((k) => k + 1)} />
                </Panel>
            ) : (
                <>
                    <StatStrip className="grid-cols-2 lg:grid-cols-4">
                        <Stat label="Revenue" value={data ? formatCurrency(data.totals.revenue, currency) : '—'} current={data?.totals.revenue} previous={data?.previous.revenue} loading={loading} />
                        <Stat label="Orders" value={data ? fmtNum(data.totals.orders) : '—'} current={data?.totals.orders} previous={data?.previous.orders} loading={loading} />
                        <Stat label="Visits" value={data ? fmtNum(data.totals.views) : '—'} current={data?.totals.views} previous={data?.previous.views} loading={loading} />
                        <Stat label="Conversion" value={convRate ?? '—'} hint="Orders per visit" loading={loading} />
                    </StatStrip>

                    {show ? (
                        <>
                            <TrendChart series={data.series} currency={currency} />

                            <ProGateInline
                                plan={plan}
                                requires="hobby"
                                feature="Advanced analytics"
                                description="Conversion, traffic sources, countries and top products are on the Hobby plan and higher."
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Funnel funnel={data.funnel ?? { views: 0, add_to_carts: 0, checkouts: 0, orders: 0 }} />
                                    <TopProducts products={data.top_products} currency={currency} />
                                    <BreakdownPanel title="Sources" items={data.by_source ?? []} />
                                    <BreakdownPanel title="Countries" items={data.by_country ?? []} />
                                </div>
                            </ProGateInline>

                            <div className="grid gap-4 md:grid-cols-2">
                                <BreakdownPanel title="Devices" items={data.by_device} />
                            </div>
                        </>
                    ) : (
                        <Skeleton className="h-[260px] w-full rounded-lg" />
                    )}
                </>
            )}
        </div>
    )
}
