'use client'

// app/(merchant)/org/[orgSlug]/[storeSlug]/settings/tracking/tracking-client.tsx

import { useState } from 'react'
import { cn } from '@mcloud/ui/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type TrackedOrder = {
    id: string
    order_number: string | number
    customer_name: string
    status: string
    tracking_number: string | null
    created_at: string
    delivery_option: { id: string; courier_name: string; tracking_url_template: string | null } | null
    delivery_zone: { id: string; location_name: string } | null
}

type TrackingData = {
    store_id: string
    orders: TrackedOrder[]
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function MSO({ icon, className, fill = 0 }: { icon: string; className?: string; fill?: number }) {
    return (
        <span
            className={cn('material-symbols-outlined select-none leading-none', className)}
            style={{ fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}
        >
            {icon}
        </span>
    )
}

function Sk({ className }: { className?: string }) {
    return <span className={cn('block animate-pulse bg-muted', className)} />
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d === 1) return 'yesterday'
    if (d < 7) return `${d}d ago`
    return new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
}

function trackingUrl(template: string | null, trackingNumber: string | null) {
    if (!template || !trackingNumber) return null
    return template.replace('{tracking_number}', encodeURIComponent(trackingNumber))
}

// ─── Order row ────────────────────────────────────────────────────────────────

function OrderRow({ order, onSave }: {
    order: TrackedOrder
    onSave: (patch: { tracking_number?: string | null; status?: string }) => Promise<void>
}) {
    const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? '')
    const [status, setStatus] = useState(order.status)
    const [saving, setSaving] = useState(false)
    const dirty = trackingNumber !== (order.tracking_number ?? '') || status !== order.status

    const url = trackingUrl(order.delivery_option?.tracking_url_template ?? null, order.tracking_number)

    const handleSave = async () => {
        setSaving(true)
        try {
            await onSave({ tracking_number: trackingNumber || null, status })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-2.5 px-5 py-4 border-b border-border last:border-0">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">
                        Order #{order.order_number} · {order.customer_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        {order.delivery_option?.courier_name ?? 'No courier set'}
                        {order.delivery_zone ? ` · ${order.delivery_zone.location_name}` : ''}
                        {' · '}{timeAgo(order.created_at)}
                    </p>
                </div>
                {url && (
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[12px] text-primary hover:underline underline-offset-2 shrink-0"
                    >
                        Track
                        <MSO icon="open_in_new" className="text-[13px]" />
                    </a>
                )}
            </div>
            <div className="flex items-center gap-2">
                <input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Tracking / waybill number"
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-9 px-2 rounded-lg border border-border bg-background text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                {dirty && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-9 px-3 rounded-full bg-accent text-primary text-[12px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                )}
            </div>
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TrackingClient({
    slug,
    orgSlug,
    initialData,
}: {
    slug: string
    orgSlug: string
    initialData: TrackingData | null
}) {
    const [orders, setOrders] = useState<TrackedOrder[]>(initialData?.orders ?? [])

    if (!initialData) {
        return (
            <div className="max-w-2xl space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Sk key={i} className="h-24 rounded-2xl" />
                ))}
            </div>
        )
    }

    const handleSave = async (orderId: string, patch: { tracking_number?: string | null; status?: string }) => {
        const res = await fetch(`/api/store/${slug}/tracking/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
        })
        if (!res.ok) return
        const updated = await res.json()
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)))
    }

    return (
        <div className="max-w-2xl space-y-4">
            <div>
                <p className="text-[15px] font-semibold text-foreground">Track orders</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                    Orders with a courier or delivery zone attached. Add a tracking number once the courier picks up.
                </p>
            </div>

            <div className="rounded-2xl border border-border bg-background overflow-hidden">
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                        <MSO icon="local_shipping" className="text-[24px] text-muted-foreground opacity-40" />
                        <p className="text-[12px] text-muted-foreground">
                            No orders need tracking yet. They'll show up here once a delivery zone or courier is attached.
                        </p>
                    </div>
                ) : (
                    orders.map((o) => (
                        <OrderRow key={o.id} order={o} onSave={(patch) => handleSave(o.id, patch)} />
                    ))
                )}
            </div>
        </div>
    )
}