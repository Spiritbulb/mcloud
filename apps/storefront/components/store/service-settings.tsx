'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ServiceItem } from '@mcloud/themes/types'
import { Badge, Status, type BadgeTone } from '@mcloud/ui/kit/badge'
import { Button } from '@mcloud/ui/kit/button'
import { ConfirmDialog } from '@mcloud/ui/kit/confirm-dialog'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Field, FormGrid, Select, Switch, TextArea, TextInput } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { LoadError } from '@mcloud/ui/kit/load-error'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { SkeletonRows, Spinner } from '@mcloud/ui/kit/skeleton'
import { Table, Td, Th, Tr } from '@mcloud/ui/kit/table'
import { cn } from '@mcloud/ui/utils'
import { deleteService, listServices, saveService, setServiceActive } from '@/lib/admin/catalog-actions'
import ImageUpload from './image-upload'
import {
    draftFromService, draftProblem, emptyDraft, emptyPackage, newId, servicePayload, slugify, startingPrice,
    type Availability, type Booking, type DraftPackage, type ServiceDraft,
} from './service-logic'

const AVAILABILITY: { value: Availability; label: string; tone: BadgeTone }[] = [
    { value: 'available', label: 'Available', tone: 'success' },
    { value: 'busy', label: 'Busy', tone: 'warning' },
    { value: 'unavailable', label: 'Unavailable', tone: 'neutral' },
]

const BOOKING: { value: Booking; label: string; hint: string }[] = [
    { value: 'instant', label: 'Book instantly', hint: 'Customers book and pay straight away.' },
    { value: 'scheduled', label: 'Pick a time', hint: 'Customers choose a date and time.' },
    { value: 'quote_only', label: 'Request a quote', hint: 'Customers ask, and you reply with a price.' },
]

function Segmented<T extends string>({ value, options, onChange, label }: {
    value: T
    options: { value: T; label: string }[]
    onChange: (v: T) => void
    label: string
}) {
    return (
        <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-md border border-border p-0.5">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={cn(
                        'h-7 rounded px-2.5 text-[12px] transition-colors',
                        value === o.value ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}

function Thumb({ src }: { src?: string }) {
    return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
            {src
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={src} alt="" className="h-full w-full object-cover" />
                : <Icon name="home_repair_service" size={16} className="text-muted-foreground" />}
        </span>
    )
}

// ─── Package editor ───────────────────────────────────────────────────────────

function PackageCard({ pkg, index, currency, onChange, onFeature, onRemove }: {
    pkg: DraftPackage
    index: number
    currency: string
    onChange: (patch: Partial<DraftPackage>) => void
    onFeature: () => void
    onRemove: () => void
}) {
    return (
        <div className={cn('space-y-3 rounded-md border p-3', pkg.is_featured ? 'border-primary/50' : 'border-border')}>
            <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
                    Package {index + 1}
                    {pkg.is_featured && <Badge tone="info">Featured</Badge>}
                </p>
                <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={onFeature}>{pkg.is_featured ? 'Unfeature' : 'Feature'}</Button>
                    <Button size="sm" variant="ghost" aria-label={`Remove package ${index + 1}`} onClick={onRemove}>
                        <Icon name="delete" size={15} />
                    </Button>
                </div>
            </div>
            <FormGrid columns={2} className="sm:grid-cols-4">
                <Field label="Name">
                    <TextInput value={pkg.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Basic" />
                </Field>
                <Field label={`Price (${currency})`}>
                    <TextInput type="number" min={0} step="0.01" inputMode="decimal" value={pkg.price} onChange={(e) => onChange({ price: e.target.value })} placeholder="0" />
                </Field>
                <Field label="Delivery (days)">
                    <TextInput type="number" min={1} value={pkg.delivery_days} onChange={(e) => onChange({ delivery_days: e.target.value })} placeholder="3" />
                </Field>
                <Field label="Revisions">
                    <TextInput type="number" min={0} value={pkg.revisions} onChange={(e) => onChange({ revisions: e.target.value })} placeholder="Unlimited" />
                </Field>
            </FormGrid>
            <Field label="Short description">
                <TextInput value={pkg.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="e.g. For small businesses getting started" />
            </Field>
            <Field label="Deliverables" hint="One per line.">
                <TextArea value={pkg.deliverables} onChange={(e) => onChange({ deliverables: e.target.value })} rows={3} placeholder={'Logo in PNG and SVG\nColour palette'} />
            </Field>
        </div>
    )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function ServiceForm({ storeId, currency, service, onSaved, onCancel }: {
    storeId: string
    currency: string
    service?: ServiceItem
    onSaved: () => void
    onCancel: () => void
}) {
    const isEdit = !!service
    const [draft, setDraft] = useState<ServiceDraft>(() => (service ? draftFromService(service) : emptyDraft()))
    const [videoUrl, setVideoUrl] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const set = (patch: Partial<ServiceDraft>) => setDraft((d) => ({ ...d, ...patch }))
    const setPackage = (id: string, patch: Partial<DraftPackage>) =>
        setDraft((d) => ({ ...d, packages: d.packages.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))

    const setName = (name: string) =>
        // A new service's URL follows its name until the URL is edited by hand.
        setDraft((d) => ({ ...d, name, slug: !isEdit && d.slug === slugify(d.name) ? slugify(name) : d.slug }))

    const handleSave = async () => {
        const problem = draftProblem(draft)
        if (problem) {
            setError(problem)
            return
        }
        setError(null)
        setSaving(true)
        try {
            const result = await saveService(storeId, service?.id ?? null, servicePayload(draft))
            if (!result.ok) {
                setError(result.error)
                return
            }
            onSaved()
        } catch (e) {
            console.error('saveService failed', e)
            setError('Could not save the service. Check your connection and try again.')
        } finally {
            setSaving(false)
        }
    }

    const hasPackages = draft.packages.length > 0

    return (
        <div className="space-y-6">
            <PageHeader
                title={isEdit ? `Edit ${service!.name}` : 'New service'}
                description={isEdit ? 'Change what customers see and how they book.' : 'Something customers can book or request from you.'}
                actions={
                    <>
                        <Button onClick={onCancel} disabled={saving}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave} disabled={saving}>
                            {saving && <Spinner size={13} />}
                            {saving ? 'Saving…' : isEdit ? 'Save' : 'Create service'}
                        </Button>
                    </>
                }
            />

            {error && <Notice tone="error">{error}</Notice>}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-6">
                    <Panel title="Details">
                        <div className="space-y-4">
                            <FormGrid>
                                <Field label="Name">
                                    <TextInput value={draft.name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brand identity design" />
                                </Field>
                                <Field label="URL" hint={`…/services/${draft.slug || '…'}`}>
                                    <TextInput value={draft.slug} onChange={(e) => set({ slug: slugify(e.target.value) })} placeholder="brand-identity-design" className="font-mono" spellCheck={false} />
                                </Field>
                            </FormGrid>
                            <Field label="Description">
                                <TextArea value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={4} placeholder="What this service includes…" />
                            </Field>
                            <FormGrid>
                                <Field label="Type">
                                    <TextInput value={draft.serviceType} onChange={(e) => set({ serviceType: e.target.value })} placeholder="e.g. Design, Consulting" />
                                </Field>
                                <Field label="Location">
                                    <TextInput value={draft.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Nairobi or Remote" />
                                </Field>
                            </FormGrid>
                            <Field label="What's included" hint="One item per line.">
                                <TextArea value={draft.features} onChange={(e) => set({ features: e.target.value })} rows={4} placeholder={'1-on-1 consultation call\nSource files included'} />
                            </Field>
                            <Field label="Tags" hint="Separate with commas.">
                                <TextInput value={draft.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="branding, logo, design" />
                            </Field>
                        </div>
                    </Panel>

                    <Panel
                        title="Pricing"
                        description={hasPackages ? 'The cheapest package is shown as the "from" price.' : 'One price, or add packages like Basic, Standard and Premium.'}
                    >
                        <div className="space-y-4">
                            <FormGrid columns={3}>
                                <Field label={`Price (${currency})`} hint={hasPackages ? 'Set by your packages.' : undefined}>
                                    <TextInput
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        inputMode="decimal"
                                        value={hasPackages ? String(startingPrice(draft)) : draft.basePrice}
                                        onChange={(e) => set({ basePrice: e.target.value })}
                                        disabled={hasPackages}
                                        placeholder="0"
                                    />
                                </Field>
                                <Field label="Delivery time (days)" hint="Shown as “3d delivery”.">
                                    <TextInput type="number" min={0} value={draft.deliveryDays} onChange={(e) => set({ deliveryDays: e.target.value })} placeholder="Optional" />
                                </Field>
                                <Field label="Reference / SKU">
                                    <TextInput value={draft.sku} onChange={(e) => set({ sku: e.target.value })} placeholder="SVC-001" className="font-mono" />
                                </Field>
                            </FormGrid>

                            {draft.packages.map((pkg, i) => (
                                <PackageCard
                                    key={pkg.id}
                                    pkg={pkg}
                                    index={i}
                                    currency={currency}
                                    onChange={(patch) => setPackage(pkg.id, patch)}
                                    onFeature={() => set({ packages: draft.packages.map((p) => ({ ...p, is_featured: p.id === pkg.id ? !p.is_featured : false })) })}
                                    onRemove={() => set({ packages: draft.packages.filter((p) => p.id !== pkg.id) })}
                                />
                            ))}
                            <Button size="sm" onClick={() => set({ packages: [...draft.packages, emptyPackage()] })}>
                                <Icon name="add" size={14} />
                                Add package
                            </Button>

                            <div className="space-y-3 border-t border-border pt-4">
                                <Switch label="Ask for a deposit" description="Customers pay part of the price up front." checked={draft.requiresDeposit} onChange={(requiresDeposit) => set({ requiresDeposit })} />
                                {draft.requiresDeposit && (
                                    <Field label="Deposit (%)" className="max-w-[8rem]">
                                        <TextInput type="number" min={1} max={100} value={draft.depositPercent} onChange={(e) => set({ depositPercent: e.target.value })} />
                                    </Field>
                                )}
                            </div>
                        </div>
                    </Panel>

                    <Panel title="Quantity and duration" description="Optional. For services sold by the hour, piece or session.">
                        <div className="space-y-4">
                            <FormGrid columns={2} className="sm:grid-cols-4">
                                <Field label="Unit">
                                    <TextInput value={draft.quantityUnit} onChange={(e) => set({ quantityUnit: e.target.value })} placeholder="hours, pieces" />
                                </Field>
                                <Field label="Minimum">
                                    <TextInput type="number" min={0} value={draft.minQuantity} onChange={(e) => set({ minQuantity: e.target.value })} placeholder="1" />
                                </Field>
                                <Field label="Maximum">
                                    <TextInput type="number" min={0} value={draft.maxQuantity} onChange={(e) => set({ maxQuantity: e.target.value })} placeholder="10" />
                                </Field>
                                <Field label="Step">
                                    <TextInput type="number" min={1} value={draft.quantityStep} onChange={(e) => set({ quantityStep: e.target.value })} placeholder="1" />
                                </Field>
                            </FormGrid>
                            <Field label="How long it takes" as="div">
                                <div className="flex max-w-xs items-center gap-2">
                                    <TextInput
                                        aria-label="Duration"
                                        type="number"
                                        min={0}
                                        value={draft.duration}
                                        onChange={(e) => set({ duration: e.target.value, durationUnit: draft.durationUnit || 'hours' })}
                                        placeholder="Optional"
                                    />
                                    <Select aria-label="Duration unit" value={draft.durationUnit || 'hours'} onChange={(e) => set({ durationUnit: e.target.value as ServiceDraft['durationUnit'] })} className="w-28">
                                        <option value="minutes">minutes</option>
                                        <option value="hours">hours</option>
                                        <option value="days">days</option>
                                    </Select>
                                </div>
                            </Field>
                        </div>
                    </Panel>
                </div>

                <div className="space-y-6">
                    <Panel title="Status">
                        <div className="space-y-4">
                            <Switch label="Visible on your store" description="Off keeps it as a draft." checked={draft.isActive} onChange={(isActive) => set({ isActive })} />
                            <Field label="Availability" as="div">
                                <Segmented label="Availability" value={draft.availability} options={AVAILABILITY} onChange={(availability) => set({ availability })} />
                            </Field>
                            <Field label="Booking" as="div" hint={BOOKING.find((b) => b.value === draft.booking)?.hint}>
                                <Select aria-label="Booking" value={draft.booking} onChange={(e) => set({ booking: e.target.value as Booking })}>
                                    {BOOKING.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                                </Select>
                            </Field>
                        </div>
                    </Panel>

                    <Panel title="Images and video" description="The first image is the thumbnail.">
                        <div className="space-y-3">
                            {draft.media.length > 0 && (
                                <ul className="space-y-2">
                                    {draft.media.map((item, i) => (
                                        <li key={item.id} className="flex items-center gap-2 rounded-md border border-border p-1.5">
                                            {item.type === 'image' ? <Thumb src={item.url} /> : <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted"><Icon name="movie" size={16} className="text-muted-foreground" /></span>}
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-mono text-[11px] text-muted-foreground">{item.url}</span>
                                                <span className="text-[11px] text-muted-foreground">{item.type === 'video' ? 'Video' : i === 0 ? 'Image · thumbnail' : 'Image'}</span>
                                            </span>
                                            <Button size="sm" variant="ghost" aria-label="Remove" onClick={() => set({ media: draft.media.filter((m) => m.id !== item.id) })}>
                                                <Icon name="close" size={15} />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <ImageUpload
                                label="Add image"
                                value=""
                                pathInDb=""
                                onChange={(url) => setDraft((d) => ({ ...d, media: [...d.media, { id: newId('img'), url, type: 'image' }] }))}
                                bucket="store-assets"
                                pathPrefix={`${storeId}/services`}
                                aspectRatio="square"
                            />
                            <div className="flex gap-2">
                                <TextInput aria-label="Video URL" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Video link (mp4, YouTube)" className="h-8" spellCheck={false} />
                                <Button
                                    size="sm"
                                    disabled={!/^https?:\/\//.test(videoUrl.trim())}
                                    onClick={() => {
                                        set({ media: [...draft.media, { id: newId('video'), url: videoUrl.trim(), type: 'video' }] })
                                        setVideoUrl('')
                                    }}
                                >
                                    Add
                                </Button>
                            </div>
                        </div>
                    </Panel>

                    <Panel title="Rating" description="Shown to customers next to the service.">
                        <FormGrid>
                            <Field label="Rating (0–5)">
                                <TextInput type="number" min={0} max={5} step="0.1" value={draft.rating} onChange={(e) => set({ rating: e.target.value })} placeholder="None" />
                            </Field>
                            <Field label="Reviews">
                                <TextInput type="number" min={0} value={draft.reviews} onChange={(e) => set({ reviews: e.target.value })} placeholder="None" />
                            </Field>
                        </FormGrid>
                    </Panel>
                </div>
            </div>
        </div>
    )
}

// ─── List ─────────────────────────────────────────────────────────────────────

export default function ServiceSettings({ storeId, currency }: { storeId: string; currency: string }) {
    const [services, setServices] = useState<ServiceItem[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [view, setView] = useState<'list' | 'new' | 'edit'>('list')
    const [editService, setEditService] = useState<ServiceItem | undefined>()
    const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null)
    const [deleting, setDeleting] = useState(false)

    const load = useCallback(async () => {
        const res = await listServices(storeId)
        setServices(res.ok ? (res.services as unknown as ServiceItem[]) : [])
        setLoadError(res.ok ? null : res.error)
        setLoading(false)
    }, [storeId])

    useEffect(() => {
        let cancelled = false
        listServices(storeId).then((res) => {
            if (cancelled) return
            setServices(res.ok ? (res.services as unknown as ServiceItem[]) : [])
            setLoadError(res.ok ? null : res.error)
            setLoading(false)
        })
        return () => {
            cancelled = true
        }
    }, [storeId])

    const reload = () => {
        setLoading(true)
        void load()
    }

    const confirmDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        const res = await deleteService(storeId, deleteTarget.id)
        setDeleting(false)
        setDeleteTarget(null)
        setActionError(res.ok ? null : res.error)
        reload()
    }

    const toggleActive = async (svc: ServiceItem) => {
        const res = await setServiceActive(storeId, svc.id, !svc.is_active)
        setActionError(res.ok ? null : res.error)
        reload()
    }

    if (view !== 'list') {
        const done = () => {
            setView('list')
            setEditService(undefined)
        }
        return (
            <ServiceForm
                key={editService?.id ?? 'new'}
                storeId={storeId}
                currency={currency}
                service={view === 'edit' ? editService : undefined}
                onSaved={() => { done(); reload() }}
                onCancel={done}
            />
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Services"
                description={loading ? 'Loading…' : `${services.length} service${services.length === 1 ? '' : 's'} in your store`}
                actions={
                    <Button variant="primary" onClick={() => setView('new')}>
                        <Icon name="add" size={16} />
                        Add service
                    </Button>
                }
            />

            {actionError && <Notice tone="error">{actionError}</Notice>}

            <Panel flush>
                {loadError && !loading ? (
                    <LoadError message={loadError} onRetry={reload} />
                ) : !loading && services.length === 0 ? (
                    <EmptyState
                        icon="home_repair_service"
                        title="No services yet"
                        description="Add something customers can book, like a consultation or a design package."
                        action={<Button variant="primary" size="sm" onClick={() => setView('new')}>Add your first service</Button>}
                    />
                ) : (
                    <Table busy={loading}>
                        <thead>
                            <tr>
                                <Th>Service</Th>
                                <Th align="right">Price</Th>
                                <Th>Availability</Th>
                                <Th>Status</Th>
                                <Th align="right"><span className="sr-only">Actions</span></Th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <SkeletonRows columns={5} rows={3} />
                            ) : (
                                services.map((svc) => {
                                    const draft = draftFromService(svc)
                                    const thumb = draft.media.find((m) => m.type === 'image')?.url
                                    const prices = draft.packages.map((p) => parseFloat(p.price)).filter((n) => Number.isFinite(n))
                                    const price = prices.length >= 2
                                        ? `${currency} ${Math.min(...prices).toLocaleString()} – ${Math.max(...prices).toLocaleString()}`
                                        : `${currency} ${Number(svc.price).toLocaleString()}`
                                    const avail = AVAILABILITY.find((a) => a.value === draft.availability) ?? AVAILABILITY[0]
                                    return (
                                        <Tr key={svc.id}>
                                            <Td>
                                                <div className="flex items-center gap-3">
                                                    <Thumb src={thumb} />
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">{svc.name}</p>
                                                        <p className="truncate text-[12px] text-muted-foreground">
                                                            {[draft.serviceType, draft.packages.length ? `${draft.packages.length} package${draft.packages.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ') || svc.slug}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Td>
                                            <Td label="Price" align="right">{price}</Td>
                                            <Td label="Availability"><Status tone={avail.tone}>{avail.label}</Status></Td>
                                            <Td label="Status">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleActive(svc)}
                                                    title={svc.is_active ? 'Make draft' : 'Make active'}
                                                    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                                >
                                                    <Status tone={svc.is_active ? 'success' : 'neutral'}>{svc.is_active ? 'Active' : 'Draft'}</Status>
                                                </button>
                                            </Td>
                                            <Td label="Actions" align="right">
                                                <div className="inline-flex items-center gap-1">
                                                    <Button size="sm" onClick={() => { setEditService(svc); setView('edit') }}>Edit</Button>
                                                    <Button variant="ghost" size="sm" aria-label={`Delete ${svc.name}`} onClick={() => setDeleteTarget(svc)}>
                                                        <Icon name="delete" size={15} />
                                                    </Button>
                                                </div>
                                            </Td>
                                        </Tr>
                                    )
                                })
                            )}
                        </tbody>
                    </Table>
                )}
            </Panel>

            <ConfirmDialog
                open={deleteTarget !== null}
                title={deleteTarget ? `Delete ${deleteTarget.name}?` : ''}
                description="The service and its packages are removed from your store. This cannot be undone."
                confirmLabel="Delete service"
                busy={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    )
}
