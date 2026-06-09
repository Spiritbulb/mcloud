'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type SeriesPoint = { date: string; views: number; orders: number; revenue: number }
type Breakdown = { key: string; value: number }
type TopProduct = { id: string; name: string; image_url?: string | null; revenue: number; units_sold: number }

type Analytics = {
    range: string
    currency: string
    totals: { views: number; orders: number; revenue: number; add_to_carts: number; unique_visitors: number }
    previous: { views: number; orders: number; revenue: number }
    series: SeriesPoint[]
    funnel: { views: number; add_to_carts: number; checkouts: number; orders: number }
    by_device: Breakdown[]
    by_source: Breakdown[]
    by_country: Breakdown[]
    top_products: TopProduct[]
}

const RANGES = [
    { id: '7d', label: '7 days' },
    { id: '30d', label: '30 days' },
    { id: '90d', label: '90 days' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MSO({ icon, className, fill = 0 }: { icon: string; className?: string; fill?: number }) {
    return (
        <span className={cn('material-symbols-outlined select-none leading-none', className)}
            style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}>
            {icon}
        </span>
    )
}

function Sk({ className }: { className?: string }) {
    return <span className={cn('block animate-pulse rounded-lg bg-[var(--md-sys-color-surface-variant)]', className)} />
}

function fmtMoney(n: number, currency: string) {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function fmtNum(n: number) {
    return new Intl.NumberFormat('en-KE').format(n)
}

function delta(current: number, previous: number): { pct: number; dir: 'up' | 'down' | 'flat' } {
    if (previous === 0) return { pct: current > 0 ? 100 : 0, dir: current > 0 ? 'up' : 'flat' }
    const pct = ((current - previous) / previous) * 100
    return { pct: Math.abs(pct), dir: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat' }
}

function pct(a: number, b: number) {
    if (!b) return null
    return `${((a / b) * 100).toFixed(1)}%`
}

// ─── Delta badge ──────────────────────────────────────────────────────────────

function DeltaBadge({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
    const d = delta(current, previous)
    if (d.dir === 'flat') {
        return <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] opacity-60">no change</span>
    }
    const good = invert ? d.dir === 'down' : d.dir === 'up'
    return (
        <span className={cn(
            'inline-flex items-center gap-0.5 text-[11px] font-medium',
            good ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--md-sys-color-error)]'
        )}>
            <MSO icon={d.dir === 'up' ? 'trending_up' : 'trending_down'} className="text-[13px]" />
            {d.pct.toFixed(0)}%
        </span>
    )
}

// ─── KPI ──────────────────────────────────────────────────────────────────────

function Kpi({ label, value, current, previous, icon, featured, loading }: {
    label: string; value: string; current?: number; previous?: number; icon: string; featured?: boolean; loading: boolean
}) {
    return (
        <div className={cn(
            'relative overflow-hidden rounded-2xl p-5 flex flex-col gap-1.5',
            featured
                ? 'bg-[var(--md-sys-color-primary-container)]'
                : 'bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)]'
        )}>
            <MSO icon={icon} fill={1} className={cn(
                'absolute right-3 top-3 text-[20px]',
                featured ? 'text-[var(--md-sys-color-primary)] opacity-70' : 'text-[var(--md-sys-color-on-surface-variant)] opacity-30'
            )} />
            {loading
                ? <Sk className="h-7 w-24" />
                : <p className={cn('text-[26px] font-semibold tabular-nums leading-none tracking-tight',
                    featured ? 'text-[var(--md-sys-color-on-primary-container)]' : 'text-[var(--md-sys-color-on-surface)]')}>{value}</p>}
            <p className={cn('text-[12px] font-medium',
                featured ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)]')}>{label}</p>
            {!loading && current !== undefined && previous !== undefined && (
                <div className="mt-0.5"><DeltaBadge current={current} previous={previous} /></div>
            )}
        </div>
    )
}

// ─── Trend chart (inline SVG, no dependency) ──────────────────────────────────

function TrendChart({ series, currency }: { series: SeriesPoint[]; currency: string }) {
    const [metric, setMetric] = useState<'revenue' | 'views' | 'orders'>('revenue')
    const W = 720, H = 180, P = 8
    const vals = series.map(p => p[metric])
    const max = Math.max(1, ...vals)
    const stepX = series.length > 1 ? (W - P * 2) / (series.length - 1) : 0

    const points = series.map((p, i) => {
        const x = P + i * stepX
        const y = H - P - (p[metric] / max) * (H - P * 2)
        return [x, y] as const
    })
    const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    const area = points.length
        ? `${line} L${points[points.length - 1][0].toFixed(1)},${H - P} L${points[0][0].toFixed(1)},${H - P} Z`
        : ''

    const metrics = [
        { id: 'revenue' as const, label: 'Revenue' },
        { id: 'views' as const, label: 'Views' },
        { id: 'orders' as const, label: 'Orders' },
    ]

    return (
        <div className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-5">
            <div className="flex items-center justify-between mb-4">
                <p className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)]">Over time</p>
                <div className="inline-flex rounded-full bg-[var(--md-sys-color-surface-container)] p-0.5">
                    {metrics.map(m => (
                        <button key={m.id} onClick={() => setMetric(m.id)}
                            className={cn('px-3 h-7 rounded-full text-[12px] font-medium transition-colors',
                                metric === m.id
                                    ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]'
                                    : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]')}>
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>
            {series.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-[12px] text-[var(--md-sys-color-on-surface-variant)]">
                    No data in this range yet.
                </div>
            ) : (
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[180px]" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="var(--md-sys-color-primary)" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {area && <path d={area} fill="url(#trendFill)" />}
                    {line && <path d={line} fill="none" stroke="var(--md-sys-color-primary)" strokeWidth="2"
                        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
                </svg>
            )}
            <div className="flex items-center justify-between mt-2 text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                <span>{series[0]?.date ?? ''}</span>
                <span className="font-medium text-[var(--md-sys-color-on-surface)]">
                    {metric === 'revenue'
                        ? fmtMoney(vals.reduce((a, b) => a + b, 0), currency)
                        : fmtNum(vals.reduce((a, b) => a + b, 0))} total
                </span>
                <span>{series[series.length - 1]?.date ?? ''}</span>
            </div>
        </div>
    )
}

// ─── Funnel ───────────────────────────────────────────────────────────────────

function Funnel({ funnel }: { funnel: Analytics['funnel'] }) {
    const steps = [
        { label: 'Views', value: funnel.views, rate: null },
        { label: 'Add to cart', value: funnel.add_to_carts, rate: pct(funnel.add_to_carts, funnel.views) },
        { label: 'Checkout', value: funnel.checkouts, rate: pct(funnel.checkouts, funnel.add_to_carts) },
        { label: 'Ordered', value: funnel.orders, rate: pct(funnel.orders, funnel.checkouts) },
    ]
    const max = Math.max(1, funnel.views)
    return (
        <div className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-5">
            <p className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)] mb-4">Conversion funnel</p>
            <div className="space-y-3">
                {steps.map((s, i) => (
                    <div key={s.label}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] text-[var(--md-sys-color-on-surface-variant)]">{s.label}</span>
                            <span className="text-[12px] font-medium tabular-nums text-[var(--md-sys-color-on-surface)]">
                                {fmtNum(s.value)}{s.rate && <span className="text-[var(--md-sys-color-primary)] ml-2">{s.rate}</span>}
                            </span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--md-sys-color-surface-variant)] overflow-hidden">
                            <div className="h-full rounded-full bg-[var(--md-sys-color-primary)] transition-all duration-500"
                                style={{ width: `${(s.value / max) * 100}%`, opacity: 1 - i * 0.12 }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Breakdown list ───────────────────────────────────────────────────────────

function BreakdownCard({ title, icon, items }: { title: string; icon: string; items: Breakdown[] }) {
    const total = items.reduce((a, b) => a + b.value, 0)
    return (
        <div className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-5">
            <div className="flex items-center gap-2 mb-4">
                <MSO icon={icon} className="text-[16px] text-[var(--md-sys-color-on-surface-variant)]" />
                <p className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)]">{title}</p>
            </div>
            {items.length === 0 ? (
                <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] py-2">No data yet.</p>
            ) : (
                <div className="space-y-2.5">
                    {items.map(it => (
                        <div key={it.key}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[12px] text-[var(--md-sys-color-on-surface)] capitalize truncate pr-2">{it.key}</span>
                                <span className="text-[12px] tabular-nums text-[var(--md-sys-color-on-surface-variant)] shrink-0">{fmtNum(it.value)}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[var(--md-sys-color-surface-variant)] overflow-hidden">
                                <div className="h-full rounded-full bg-[var(--md-sys-color-primary)]"
                                    style={{ width: `${total ? (it.value / total) * 100 : 0}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AnalyticsClient({ slug, storeName }: { slug: string; storeName: string }) {
    const [range, setRange] = useState('30d')
    const [data, setData] = useState<Analytics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        setLoading(true)
        setError(false)
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/store/${slug}/analytics?range=${range}`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(setData)
            .catch(() => setError(true))
            .finally(() => setLoading(false))
    }, [slug, range, reloadKey])

    const currency = data?.currency ?? 'KES'

    const exportCsv = useCallback(() => {
        if (!data) return
        const rows = [
            ['date', 'views', 'orders', 'revenue'],
            ...data.series.map(p => [p.date, p.views, p.orders, p.revenue]),
        ]
        const csv = rows.map(r => r.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${slug}-analytics-${range}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }, [data, slug, range])

    const convRate = useMemo(() => {
        if (!data) return null
        return pct(data.totals.orders, data.totals.views)
    }, [data])

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-16 pt-2">
            {/* Header + range */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-[18px] font-semibold text-[var(--md-sys-color-on-surface)] tracking-tight">Analytics</h1>
                    <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)]">{storeName}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-full bg-[var(--md-sys-color-surface-container)] p-0.5">
                        {RANGES.map(r => (
                            <button key={r.id} onClick={() => setRange(r.id)}
                                className={cn('px-3 h-8 rounded-full text-[12px] font-medium transition-colors',
                                    range === r.id
                                        ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]'
                                        : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]')}>
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={exportCsv} disabled={!data}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[var(--md-sys-color-outline-variant)] text-[12px] font-medium text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-low)] transition-colors disabled:opacity-40">
                        <MSO icon="download" className="text-[15px]" />
                        Export
                    </button>
                </div>
            </div>

            {error ? (
                <div className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] flex items-center gap-2.5 px-5 py-6 text-[13px] text-[var(--md-sys-color-on-surface-variant)]">
                    <MSO icon="error_outline" className="text-[18px] text-[var(--md-sys-color-error)]" />
                    Could not load analytics.
                    <button onClick={() => setReloadKey(k => k + 1)} className="text-[var(--md-sys-color-primary)] hover:underline">Retry</button>
                </div>
            ) : (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Kpi label="Revenue" value={data ? fmtMoney(data.totals.revenue, currency) : '—'}
                            current={data?.totals.revenue} previous={data?.previous.revenue} icon="payments" featured loading={loading} />
                        <Kpi label="Orders" value={data ? fmtNum(data.totals.orders) : '—'}
                            current={data?.totals.orders} previous={data?.previous.orders} icon="receipt_long" loading={loading} />
                        <Kpi label="Visits" value={data ? fmtNum(data.totals.views) : '—'}
                            current={data?.totals.views} previous={data?.previous.views} icon="visibility" loading={loading} />
                        <Kpi label="Conversion" value={convRate ?? '—'} icon="conversion_path" loading={loading} />
                    </div>

                    {/* Trend */}
                    {loading
                        ? <Sk className="h-[260px] w-full rounded-2xl" />
                        : data && <TrendChart series={data.series} currency={currency} />}

                    {/* Funnel + top products */}
                    {!loading && data && (
                        <div className="grid md:grid-cols-2 gap-4">
                            <Funnel funnel={data.funnel} />
                            <div className="rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-5">
                                <p className="text-[13px] font-semibold text-[var(--md-sys-color-on-surface)] mb-4">Top products</p>
                                {data.top_products.length === 0 ? (
                                    <p className="text-[12px] text-[var(--md-sys-color-on-surface-variant)] py-2">No sales in this range yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {data.top_products.map(p => (
                                            <div key={p.id} className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg overflow-hidden bg-[var(--md-sys-color-surface-variant)] flex items-center justify-center shrink-0">
                                                    {p.image_url
                                                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                                        : <MSO icon="inventory_2" className="text-[16px] text-[var(--md-sys-color-on-surface-variant)]" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-medium text-[var(--md-sys-color-on-surface)] truncate">{p.name}</p>
                                                    <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">{p.units_sold} sold</p>
                                                </div>
                                                <span className="text-[12px] font-semibold tabular-nums text-[var(--md-sys-color-on-surface)] shrink-0">
                                                    {fmtMoney(p.revenue, currency)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Breakdowns */}
                    {!loading && data && (
                        <div className="grid sm:grid-cols-3 gap-4">
                            <BreakdownCard title="Devices" icon="devices" items={data.by_device} />
                            <BreakdownCard title="Sources" icon="travel_explore" items={data.by_source} />
                            <BreakdownCard title="Countries" icon="public" items={data.by_country} />
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
