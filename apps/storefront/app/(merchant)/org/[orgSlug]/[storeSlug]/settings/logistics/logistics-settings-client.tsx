'use client'

// app/(merchant)/org/[orgSlug]/[storeSlug]/settings/logistics/logistics-settings-client.tsx

import { useState } from 'react'
import { cn } from '@mcloud/ui/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryOption = {
    id: string
    courier_name: string
    is_active: boolean
    notes: string | null
    tracking_url_template: string | null
}

type DeliveryZone = {
    id: string
    location_name: string
    rate: number | null
    available: boolean
}

type LogisticsData = {
    store_id: string
    options: DeliveryOption[]
    zones: DeliveryZone[]
}

// ─── Primitives (matches settings-home-client conventions) ─────────────────

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

function SectionCard({ title, icon, children, onAdd, addLabel }: {
    title: string; icon: string; children: React.ReactNode; onAdd?: () => void; addLabel?: string
}) {
    return (
        <div className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-2">
                    <MSO icon={icon} fill={1} className="text-[18px] text-primary" />
                    <p className="text-[13px] font-semibold text-foreground">{title}</p>
                </div>
                {onAdd && (
                    <button
                        onClick={onAdd}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-accent text-primary text-[12px] font-semibold hover:opacity-90 transition-opacity"
                    >
                        <MSO icon="add" className="text-[15px]" />
                        {addLabel ?? 'Add'}
                    </button>
                )}
            </div>
            {children}
        </div>
    )
}

// ─── Delivery option row ─────────────────────────────────────────────────────

function OptionRow({ option, onChange, onDelete }: {
    option: DeliveryOption
    onChange: (patch: Partial<DeliveryOption>) => void
    onDelete: () => void
}) {
    return (
        <div className="flex flex-col gap-2.5 px-5 py-4">
            <div className="flex items-center gap-3">
                <input
                    value={option.courier_name}
                    onChange={(e) => onChange({ courier_name: e.target.value })}
                    placeholder="Courier name (e.g. Fargo Courier)"
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                    onClick={() => onChange({ is_active: !option.is_active })}
                    className={cn(
                        'h-9 px-3 rounded-full text-[12px] font-semibold transition-colors shrink-0',
                        option.is_active ? 'bg-accent text-primary' : 'bg-muted text-muted-foreground'
                    )}
                >
                    {option.is_active ? 'Active' : 'Inactive'}
                </button>
                <button
                    onClick={onDelete}
                    className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
                >
                    <MSO icon="delete" className="text-[16px] text-muted-foreground" />
                </button>
            </div>
            <input
                value={option.tracking_url_template ?? ''}
                onChange={(e) => onChange({ tracking_url_template: e.target.value })}
                placeholder="Tracking URL template, e.g. https://fargocourier.co.ke/track?wb={tracking_number}"
                className="h-9 px-3 rounded-lg border border-border bg-background text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
                value={option.notes ?? ''}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder="Notes (optional) — e.g. contact client's rider directly for this courier"
                className="h-9 px-3 rounded-lg border border-border bg-background text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
        </div>
    )
}

// ─── Delivery zone row ────────────────────────────────────────────────────────

function ZoneRow({ zone, onChange, onDelete }: {
    zone: DeliveryZone
    onChange: (patch: Partial<DeliveryZone>) => void
    onDelete: () => void
}) {
    return (
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border last:border-0">
            <input
                value={zone.location_name}
                onChange={(e) => onChange({ location_name: e.target.value })}
                placeholder="Location (e.g. Nairobi CBD)"
                className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[12px] text-muted-foreground">KES</span>
                <input
                    type="number"
                    value={zone.rate ?? ''}
                    onChange={(e) => onChange({ rate: e.target.value === '' ? null : Number(e.target.value) })}
                    placeholder="Rate"
                    className="w-20 h-9 px-2 rounded-lg border border-border bg-background text-[13px] text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>
            <button
                onClick={() => onChange({ available: !zone.available })}
                className={cn(
                    'h-9 px-3 rounded-full text-[12px] font-semibold transition-colors shrink-0',
                    zone.available ? 'bg-accent text-primary' : 'bg-muted text-muted-foreground'
                )}
            >
                {zone.available ? 'Available' : 'Unavailable'}
            </button>
            <button
                onClick={onDelete}
                className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
            >
                <MSO icon="delete" className="text-[16px] text-muted-foreground" />
            </button>
        </div>
    )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function Empty({ icon, text }: { icon: string; text: string }) {
    return (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <MSO icon={icon} className="text-[24px] text-muted-foreground opacity-40" />
            <p className="text-[12px] text-muted-foreground">{text}</p>
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

let tempId = 0
const newId = () => `_new_${tempId++}`

export default function LogisticsSettingsClient({
    slug,
    orgSlug,
    initialData,
}: {
    slug: string
    orgSlug: string
    initialData: LogisticsData | null
}) {
    const [options, setOptions] = useState<DeliveryOption[]>(initialData?.options ?? [])
    const [zones, setZones] = useState<DeliveryZone[]>(initialData?.zones ?? [])
    const [saving, setSaving] = useState(false)
    const [savedAt, setSavedAt] = useState<number | null>(null)

    if (!initialData) {
        return (
            <div className="max-w-2xl space-y-4">
                <Sk className="h-40 rounded-2xl" />
                <Sk className="h-40 rounded-2xl" />
            </div>
        )
    }

    const addOption = () =>
        setOptions((prev) => [
            ...prev,
            { id: newId(), courier_name: '', is_active: true, notes: null, tracking_url_template: null },
        ])

    const addZone = () =>
        setZones((prev) => [...prev, { id: newId(), location_name: '', rate: null, available: true }])

    const patchOption = (id: string, patch: Partial<DeliveryOption>) =>
        setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))

    const patchZone = (id: string, patch: Partial<DeliveryZone>) =>
        setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)))

    const removeOption = (id: string) => setOptions((prev) => prev.filter((o) => o.id !== id))
    const removeZone = (id: string) => setZones((prev) => prev.filter((z) => z.id !== id))

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/store/${slug}/logistics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ options, zones }),
            })
            if (!res.ok) throw new Error('save failed')
            const updated = await res.json()
            setOptions(updated.options ?? options)
            setZones(updated.zones ?? zones)
            setSavedAt(Date.now())
        } catch {
            // Swallow — button reverts to its normal state, user can retry.
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="max-w-2xl space-y-6 mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[15px] font-semibold text-foreground">Logistics</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                        Set up couriers and delivery zones. Where you don't deliver, customers reach you directly.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {saving ? 'Saving…' : savedAt ? 'Saved' : 'Save changes'}
                </button>
            </div>

            <SectionCard title="Delivery options" icon="local_shipping" onAdd={addOption} addLabel="Add courier">
                {options.length === 0 ? (
                    <Empty icon="local_shipping" text="No couriers yet. Add one to get started." />
                ) : (
                    options.map((o) => (
                        <OptionRow
                            key={o.id}
                            option={o}
                            onChange={(patch) => patchOption(o.id, patch)}
                            onDelete={() => removeOption(o.id)}
                        />
                    ))
                )}
            </SectionCard>

            <SectionCard title="Delivery zones & rates" icon="map" onAdd={addZone} addLabel="Add zone">
                {zones.length === 0 ? (
                    <Empty icon="map" text="No zones yet. Add locations you deliver to and their rates." />
                ) : (
                    zones.map((z) => (
                        <ZoneRow
                            key={z.id}
                            zone={z}
                            onChange={(patch) => patchZone(z.id, patch)}
                            onDelete={() => removeZone(z.id)}
                        />
                    ))
                )}
            </SectionCard>

            <p className="text-[19px] text-muted-foreground">
                Locations outside these zones won't show a delivery option at checkout, customers will be pointed to your contact page instead.
            </p>
        </div>
    )
}