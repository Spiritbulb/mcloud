'use client'

// app/(merchant)/org/[orgSlug]/[storeSlug]/settings/logistics/logistics-settings-client.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@mcloud/ui/kit/button'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Field, Switch, TextInput } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { LoadError } from '@mcloud/ui/kit/load-error'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { SaveBar, SaveStatus } from '@mcloud/ui/kit/save-bar'
import { isDirty } from '@mcloud/ui/kit/ui-logic'
import { zoneProblem } from '@/lib/delivery-zones-logic'

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

// ─── Rows ─────────────────────────────────────────────────────────────────────

function OptionRow({ option, onChange, onDelete }: {
    option: DeliveryOption
    onChange: (patch: Partial<DeliveryOption>) => void
    onDelete: () => void
}) {
    return (
        <div className="space-y-3 px-4 py-4">
            <div className="flex items-end gap-3">
                <Field label="Courier" className="flex-1">
                    <TextInput
                        value={option.courier_name}
                        onChange={(e) => onChange({ courier_name: e.target.value })}
                        placeholder="e.g. Fargo Courier"
                    />
                </Field>
                <div className="flex h-8 items-center gap-2 text-[12px] text-muted-foreground">
                    <Switch checked={option.is_active} onChange={(is_active) => onChange({ is_active })} />
                    <span className="w-12">{option.is_active ? 'Active' : 'Off'}</span>
                </div>
                <Button variant="ghost" aria-label="Remove courier" onClick={onDelete}>
                    <Icon name="delete" size={16} />
                </Button>
            </div>
            <Field label="Tracking link" hint="Use {tracking_number} where the waybill number goes.">
                <TextInput
                    value={option.tracking_url_template ?? ''}
                    onChange={(e) => onChange({ tracking_url_template: e.target.value })}
                    placeholder="https://fargocourier.co.ke/track?wb={tracking_number}"
                    spellCheck={false}
                />
            </Field>
            <Field label="Notes">
                <TextInput
                    value={option.notes ?? ''}
                    onChange={(e) => onChange({ notes: e.target.value })}
                    placeholder="Optional, e.g. call the rider directly for this courier"
                />
            </Field>
        </div>
    )
}

function ZoneRow({ zone, currency, onChange, onDelete }: {
    zone: DeliveryZone
    currency: string
    onChange: (patch: Partial<DeliveryZone>) => void
    onDelete: () => void
}) {
    return (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
            <TextInput
                aria-label="Location"
                value={zone.location_name}
                onChange={(e) => onChange({ location_name: e.target.value })}
                placeholder="Location, e.g. Nairobi CBD"
                className="h-8 min-w-0 flex-1 basis-full sm:basis-auto"
            />
            <div className="flex items-center gap-1.5">
                <span className="text-[12px] text-muted-foreground">{currency}</span>
                <TextInput
                    aria-label="Rate"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={zone.rate ?? ''}
                    onChange={(e) => onChange({ rate: e.target.value === '' ? null : Number(e.target.value) })}
                    placeholder="0 = free"
                    className="h-8 w-28 tabular-nums"
                />
            </div>
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Switch checked={zone.available} onChange={(available) => onChange({ available })} />
                <span className="w-16">{zone.available ? 'Delivering' : 'Paused'}</span>
            </div>
            <Button variant="ghost" aria-label="Remove zone" onClick={onDelete} className="ml-auto sm:ml-0">
                <Icon name="delete" size={16} />
            </Button>
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

let tempId = 0
const newId = () => `_new_${tempId++}`

export default function LogisticsSettingsClient({
    slug,
    currency,
    initialData,
}: {
    slug: string
    currency: string
    initialData: LogisticsData | null
}) {
    const router = useRouter()
    const [saved, setSaved] = useState(() => ({ options: initialData?.options ?? [], zones: initialData?.zones ?? [] }))
    const [options, setOptions] = useState<DeliveryOption[]>(saved.options)
    const [zones, setZones] = useState<DeliveryZone[]>(saved.zones)
    const [saving, setSaving] = useState(false)
    const [justSaved, setJustSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const header = (
        <PageHeader
            title="Delivery options"
            description="Couriers you use and the places you deliver to. Every zone needs a rate: enter 0 for free delivery."
        />
    )

    if (!initialData) {
        return (
            <div className="space-y-6">
                {header}
                <Panel>
                    <LoadError title="Couldn't load your delivery settings" onRetry={() => router.refresh()} />
                </Panel>
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
        const problem = zoneProblem(zones)
        if (problem) {
            setError(problem)
            return
        }
        setError(null)
        setSaving(true)
        try {
            const res = await fetch(`/api/store/${slug}/logistics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ options, zones }),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => null)
                throw new Error(typeof body?.error === 'string' ? body.error : 'Could not save. Please try again.')
            }
            const updated = await res.json()
            const next = { options: updated.options ?? options, zones: updated.zones ?? zones }
            setSaved(next)
            setOptions(next.options)
            setZones(next.zones)
            setJustSaved(true)
            setTimeout(() => setJustSaved(false), 2500)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const addButton = (label: string, onClick: () => void) => (
        <Button size="sm" onClick={onClick}>
            <Icon name="add" size={14} />
            {label}
        </Button>
    )

    return (
        <div className="space-y-6">
            {header}

            {error && <Notice tone="error">{error}</Notice>}

            <Panel title="Couriers" description="Who carries your orders, and where customers can track them." action={addButton('Add courier', addOption)} flush>
                {options.length === 0 ? (
                    <EmptyState icon="local_shipping" title="No couriers yet" description="Add the couriers you send orders with." />
                ) : (
                    <div className="divide-y divide-border">
                        {options.map((o) => (
                            <OptionRow key={o.id} option={o} onChange={(patch) => patchOption(o.id, patch)} onDelete={() => removeOption(o.id)} />
                        ))}
                    </div>
                )}
            </Panel>

            <Panel
                title="Delivery zones and rates"
                description="Customers outside these zones see no delivery option at checkout and are pointed to your contact page."
                action={addButton('Add zone', addZone)}
                flush
            >
                {zones.length === 0 ? (
                    <EmptyState icon="map" title="No zones yet" description="Add the places you deliver to and what each costs." />
                ) : (
                    <div className="divide-y divide-border">
                        {zones.map((z) => (
                            <ZoneRow key={z.id} zone={z} currency={currency} onChange={(patch) => patchZone(z.id, patch)} onDelete={() => removeZone(z.id)} />
                        ))}
                    </div>
                )}
            </Panel>

            <SaveBar
                dirty={isDirty(saved, { options, zones })}
                saving={saving}
                onSave={handleSave}
                onDiscard={() => {
                    setOptions(saved.options)
                    setZones(saved.zones)
                    setError(null)
                }}
            />
            <SaveStatus saving={saving} saved={justSaved} />
        </div>
    )
}
