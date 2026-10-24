'use client'

// app/(merchant)/org/[orgSlug]/[storeSlug]/settings/tracking/tracking-client.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Status, fulfillmentTone } from '@mcloud/ui/kit/badge'
import { Button } from '@mcloud/ui/kit/button'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Select, TextInput } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { LoadError } from '@mcloud/ui/kit/load-error'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Spinner } from '@mcloud/ui/kit/skeleton'
import { FULFILLMENT_STATUSES, statusLabel } from '@/components/store/order-logic'

// ─── Types ────────────────────────────────────────────────────────────────────

type TrackedOrder = {
    id: string
    order_number: string | number
    customer_name: string
    status: string
    fulfillment_status: string | null
    tracking_number: string | null
    created_at: string
    delivery_option: { id: string; courier_name: string; tracking_url_template: string | null } | null
    delivery_zone: { id: string; location_name: string } | null
}

type TrackingData = {
    store_id: string
    orders: TrackedOrder[]
}

type Patch = { tracking_number: string | null; fulfillment_status: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    onSave: (patch: Patch) => Promise<string | null>
}) {
    const savedFulfillment = order.fulfillment_status ?? 'unfulfilled'
    const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? '')
    const [fulfillment, setFulfillment] = useState(savedFulfillment)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const dirty = trackingNumber.trim() !== (order.tracking_number ?? '') || fulfillment !== savedFulfillment

    const url = trackingUrl(order.delivery_option?.tracking_url_template ?? null, order.tracking_number)

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        const problem = await onSave({ tracking_number: trackingNumber.trim() || null, fulfillment_status: fulfillment })
        setSaving(false)
        if (problem) setError(problem)
    }

    return (
        <div className="space-y-2.5 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-[13px] font-medium text-foreground">
                        <span className="truncate">#{order.order_number} · {order.customer_name}</span>
                        <Status tone={fulfillmentTone(savedFulfillment)}>
                            {statusLabel(savedFulfillment)}
                        </Status>
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {order.delivery_option?.courier_name ?? 'No courier set'}
                        {order.delivery_zone ? ` · ${order.delivery_zone.location_name}` : ''}
                        {' · '}{timeAgo(order.created_at)}
                    </p>
                </div>
                {url && (
                    <a href={url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[12px] text-primary underline-offset-2 hover:underline">
                        Track
                        <Icon name="open_in_new" size={13} />
                    </a>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <TextInput
                    aria-label={`Tracking number for order ${order.order_number}`}
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Tracking or waybill number"
                    className="h-8 min-w-0 flex-1 basis-full sm:basis-auto"
                    spellCheck={false}
                />
                <Select
                    aria-label={`Delivery status for order ${order.order_number}`}
                    value={fulfillment}
                    onChange={(e) => setFulfillment(e.target.value)}
                    className="h-8 w-auto"
                >
                    {FULFILLMENT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                </Select>
                {dirty && (
                    <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
                        {saving && <Spinner size={12} />}
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                )}
            </div>
            {error && <p role="alert" className="text-[12px] text-red-700 dark:text-red-300">{error}</p>}
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TrackingClient({
    slug,
    initialData,
}: {
    slug: string
    initialData: TrackingData | null
}) {
    const router = useRouter()
    const [orders, setOrders] = useState<TrackedOrder[]>(initialData?.orders ?? [])

    const handleSave = async (orderId: string, patch: Patch): Promise<string | null> => {
        try {
            const res = await fetch(`/api/store/${slug}/tracking/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
            })
            if (res.status === 403) return 'Only store owners and admins can update deliveries.'
            if (res.status === 404) return 'This order no longer exists. Reload the page.'
            if (res.status === 400) {
                const body = await res.json().catch(() => null)
                return typeof body?.error === 'string' ? `${body.error}.` : 'Could not save. Try again.'
            }
            if (!res.ok) return 'Could not save. Try again.'
            const updated = await res.json()
            setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)))
            return null
        } catch {
            return 'Could not save. Check your connection and try again.'
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Track orders"
                description="Orders with a courier or delivery zone. Add the waybill number once the courier picks up."
            />

            <Panel flush>
                {!initialData ? (
                    <LoadError title="Couldn't load your orders" onRetry={() => router.refresh()} />
                ) : orders.length === 0 ? (
                    <EmptyState
                        icon="local_shipping"
                        title="Nothing to track yet"
                        description="Orders show up here once a courier or delivery zone is attached."
                    />
                ) : (
                    <div className="divide-y divide-border">
                        {orders.map((o) => (
                            <OrderRow key={`${o.id}-${o.tracking_number}-${o.fulfillment_status}`} order={o} onSave={(patch) => handleSave(o.id, patch)} />
                        ))}
                    </div>
                )}
            </Panel>
        </div>
    )
}
