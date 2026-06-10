'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus, Trash2, ChevronDown, ChevronUp,
    Briefcase, Star, MapPin, Clock, RefreshCw,
    BadgePercent, Tag, Zap, Video, Image as ImageIcon,
} from 'lucide-react'
import ImageUpload from './image-upload'
import { ServiceItem, ServicePackage, ServiceMediaItem } from '@/src/themes/types'

// Local draft type — all fields are strings so HTML inputs bind freely.
// On save, fields are parsed to their ServicePackage types.
type DraftPackage = {
    id: string
    name: string
    price: string
    description: string | null
    deliverables: string
    delivery_days: string
    revisions: string
    is_featured?: boolean
}

function slugify(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const EMPTY_PACKAGE: DraftPackage = {
    id: '',
    name: '',
    price: '',
    description: '',
    deliverables: '',
    delivery_days: '3',
    revisions: '1',
    is_featured: false,
}

const AVAILABILITY_OPTIONS = [
    { value: 'available', label: 'Available', color: 'text-green-600' },
    { value: 'busy', label: 'Currently Busy', color: 'text-yellow-600' },
    { value: 'unavailable', label: 'Unavailable', color: 'text-red-500' },
] as const

const BOOKING_OPTION = [
    { value: 'instant', label: 'Instant', color: 'text-red-500' },
    { value: 'scheduled', label: 'Scheduled', color: 'text-yellow-600' },
    { value: 'quote_only', label: 'Send Quote', color: 'text-red-500' },

] as const

function ServiceForm({
    storeId,
    currency,
    service,
    onSaved,
    onCancel,
}: {
    storeId: string
    currency: string
    service?: ServiceItem
    onSaved: () => void
    onCancel: () => void
}) {
    const isEdit = !!service

    // ── Core fields ────────────────────────────────────────────────────────────
    const [name, setName] = useState(service?.name ?? '')
    const [slug, setSlug] = useState(service?.slug ?? '')
    const [description, setDescription] = useState(service?.description ?? '')
    const [sku, setSku] = useState(service?.sku ?? '')
    const [isActive, setIsActive] = useState(service?.is_active ?? true)
    const [basePrice, setBasePrice] = useState(String(service?.price ?? ''))

    // ── Availability ───────────────────────────────────────────────────────────
    const [availability, setAvailability] = useState<'available' | 'busy' | 'unavailable'>(
        service?.metadata?.availability ?? 'available'
    )

    // ── Quantity & Duration ───────────────────
    const [quantityUnit, setQuantityUnit] = useState(service?.metadata?.quantityUnit ?? '')
    const [minQuantity, setMinQuantity] = useState(String(service?.metadata?.minQuantity ?? ''))
    const [maxQuantity, setMaxQuantity] = useState(String(service?.metadata?.maxQuantity ?? ''))
    const [quantityStep, setQuantityStep] = useState(String(service?.metadata?.quantityStep ?? ''))
    const [durationMinutes, setDurationMinutes] = useState(String(service?.metadata?.durationMinutes ?? ''))
    const [durationHours, setDurationHours] = useState(String(service?.metadata?.durationHours ?? ''))
    const [durationDay, setDurationDay] = useState(String(service?.metadata?.durationDay ?? ''))

    // ── Booking ───────────────────────────────────────────────────────────
    const [booking, setBooking] = useState<'instant' | 'scheduled' | 'quote_only'>(
        service?.metadata?.booking ?? 'instant'
    )

    // ── Metadata ───────────────────────────────────────────────────────────────
    const [serviceType, setServiceType] = useState(service?.metadata?.serviceType ?? '')
    const [location, setLocation] = useState(service?.metadata?.location ?? '')
    const [deliveryDays, setDeliveryDays] = useState(String(service?.metadata?.deliveryDays ?? ''))
    const [tags, setTags] = useState((service?.metadata?.tags ?? []).join(', '))
    const [features, setFeatures] = useState((service?.metadata?.features ?? []).join('\n'))
    const [requiresDeposit, setRequiresDeposit] = useState(service?.metadata?.requiresDeposit ?? false)
    const [depositPercent, setDepositPercent] = useState(String(service?.metadata?.depositPercent ?? '50'))
    const [rating, setRating] = useState(String(service?.metadata?.rating ?? ''))
    const [reviews, setReviews] = useState(String(service?.metadata?.reviews ?? ''))

    // ── Media (images + videos) ────────────────────────────────────────────────
    // Stored as { url, type } so videos are distinguishable from images
    const [media, setMedia] = useState<ServiceMediaItem[]>(
        service?.metadata?.media ??
        (service?.images ?? []).map((url, i) => ({
            id: `img-${i}`,
            url,
            type: 'image' as const
        }))
    )
    const [videoUrl, setVideoUrl] = useState('')

    // ── Packages ───────────────────────────────────────────────────────────────
    const [packages, setPackages] = useState<DraftPackage[]>(
        (service?.metadata?.packages ?? []).map((p: any) => ({
            ...p,
            price: String(p.price ?? ''),
            delivery_days: String(p.delivery_days ?? '3'),
            revisions: p.revisions == null ? '' : String(p.revisions),
            deliverables: Array.isArray(p.deliverables) ? p.deliverables.join('\n') : '',
        }))
    )
    const [showPackages, setShowPackages] = useState(packages.length > 0)

    // ── UI state ───────────────────────────────────────────────────────────────
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Auto-slug from name (new only)
    useEffect(() => {
        if (!isEdit) setSlug(slugify(name))
    }, [name, isEdit])

    const handleSave = async () => {
        console.log('1. handleSave fired')
        if (!name.trim()) { setError('Service name is required.'); return }
        if (packages.length === 0 && !basePrice.trim()) {
            setError('Enter a base price or add at least one package.'); return
        }

        console.log('2. validation passed — isEdit:', isEdit, 'service id:', service?.id)
        setError('')
        setSaving(true)

        try {
            const supabase = createClient()

            const parsedPackages = packages.map((p, i) => ({
                id: p.id ?? `pkg-${Date.now()}-${i}`,
                name: p.name.trim() || `Package ${i + 1}`,
                price: parseFloat(p.price) || 0,
                description: p.description || null,
                deliverables: p.deliverables
                    .split('\n')
                    .map((d: string) => d.trim())
                    .filter(Boolean),
                delivery_days: parseInt(p.delivery_days) || 3,
                revisions: p.revisions ? parseInt(p.revisions) : null,
                is_featured: p.is_featured,
            }))

            const derivedBasePrice = parsedPackages.length > 0
                ? Math.min(...parsedPackages.map((p) => p.price))
                : parseFloat(basePrice) || 0

            const payload = {
                store_id: storeId,
                name: name.trim(),
                slug: slug.trim() || slugify(name),
                description: description || null,
                item_type: 'service',
                price: derivedBasePrice,
                compare_at_price: null,
                sku: sku || null,
                is_active: isActive,
                updated_at: new Date().toISOString(),
                metadata: {
                    serviceType: serviceType || null,
                    quantityUnit: quantityUnit || '',
                    booking,
                    rating: rating ? parseFloat(rating) : null,
                    reviews: reviews ? parseInt(reviews) : null,
                    features: features.split('\n').map((f) => f.trim()).filter(Boolean),
                    descriptionHtml: null,
                    durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
                    durationHours: durationHours ? parseInt(durationHours) : null,
                    durationDay: durationDay ? parseInt(durationDay) : null,
                    minQuantity: minQuantity ? parseInt(minQuantity) : null,
                    maxQuantity: maxQuantity ? parseInt(maxQuantity) : null,
                    quantityStep: quantityStep ? parseInt(quantityStep) : null,
                    deliveryDays: deliveryDays ? parseInt(deliveryDays) : null,
                    location: location || null,
                    requiresDeposit,
                    depositPercent: requiresDeposit ? parseInt(depositPercent) || 50 : null,
                    tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
                    packages: parsedPackages,   // ✅ also store inside metadata
                    media,                      // ✅ also store inside metadata
                    availability,               // ✅ also store inside metadata
                },
            }

            console.log('3. payload built:', JSON.stringify(payload, null, 2))

            const { error: dbError, status } = isEdit
                ? await supabase.from('services').update(payload).eq('id', service!.id)
                : await supabase.from('services').insert(payload)

            console.log('4. db response — status:', status, 'error:', dbError)

            if (dbError) {
                setError(dbError.message || 'Save failed — check console.')
                return
            }

            onSaved()
        } catch (e) {
            console.error('CAUGHT EXCEPTION:', e)
            setError('Unexpected error — check console.')
        } finally {
            setSaving(false)
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold text-foreground">
                        {isEdit ? `Edit: ${service!.name}` : 'New service'}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {isEdit ? 'Update service details' : 'Add a new service to your store'}
                    </p>
                </div>
                <div className="flex gap-2 sm:shrink-0">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-8 text-xs" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button size="sm" className="flex-1 sm:flex-none h-8 text-xs" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : isEdit ? 'Update' : 'Create service'}
                    </Button>
                </div>
            </div>

            {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2 border border-destructive/20">
                    {error}
                </p>
            )}

            {/* ── Section 1: Core info ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* Left */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="service-name">Service name *</Label>
                        <Input
                            id="service-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Brand Identity Design"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="slug">URL slug</Label>
                        <Input
                            id="slug"
                            value={slug}
                            onChange={(e) => setSlug(slugify(e.target.value))}
                            placeholder="brand-identity-design"
                            className="font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground break-all">
                            yourstore.com/services/{slug || '…'}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            placeholder="Describe what this service includes…"
                            className="resize-none"
                        />
                    </div>

                    {/* Service type + location */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5" /> Type
                            </Label>
                            <Input
                                value={serviceType}
                                onChange={(e) => setServiceType(e.target.value)}
                                placeholder="e.g. Design, Consulting"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" /> Location
                            </Label>
                            <Input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="e.g. Nairobi / Remote"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">


                        {/* Quantity Unit */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">Quantity Unit</Label>
                            <Input
                                type="text"
                                value={quantityUnit}
                                onChange={(e) => setQuantityUnit(e.target.value)}
                                placeholder="hours, pieces, kg"
                                className="h-8 text-xs"
                            />
                        </div>

                        {/* Min / Max Quantity */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Min Quantity</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={minQuantity}
                                    onChange={(e) => setMinQuantity(e.target.value)}
                                    placeholder="1"
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Max Quantity</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={maxQuantity}
                                    onChange={(e) => setMaxQuantity(e.target.value)}
                                    placeholder="10"
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>

                        {/* Quantity Step */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">Quantity Step</Label>
                            <Input
                                type="number"
                                min="1"
                                value={quantityStep}
                                onChange={(e) => setQuantityStep(e.target.value)}
                                placeholder="1"
                                className="h-8 text-xs"
                            />
                        </div>

                        {/* Duration Toggle */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">Service Duration</Label>
                            <div className="flex items-center gap-4">
                                {/* Minutes option */}
                                <label className="flex items-center gap-1.5 text-xs">
                                    <input
                                        type="radio"
                                        name="durationUnit"
                                        value="minutes"
                                        checked={!!durationMinutes}
                                        onChange={() => {
                                            setDurationMinutes(durationMinutes || "60") // default to 60
                                            setDurationDay("") // clear days
                                            setDurationHours("")
                                        }}
                                    />
                                    Minutes
                                </label>

                                {/* Days option */}
                                <label className="flex items-center gap-1.5 text-xs">
                                    <input
                                        type="radio"
                                        name="durationUnit"
                                        value="days"
                                        checked={!!durationDay}
                                        onChange={() => {
                                            setDurationDay(durationDay || "1") // default to 1
                                            setDurationMinutes("") // clear minutes
                                            setDurationHours("")
                                        }}
                                    />
                                    Days
                                </label>

                                {/* hrs option */}
                                <label className="flex items-center gap-1.5 text-xs">
                                    <input
                                        type="radio"
                                        name="durationUnit"
                                        value="hours"
                                        checked={!!durationHours}
                                        onChange={() => {
                                            setDurationHours(durationHours || "5") // default to 1
                                            setDurationMinutes("") // clear minutes
                                            setDurationDay("")
                                        }}
                                    />
                                    Hours
                                </label>
                            </div>

                            {/* Conditional input */}
                            {durationMinutes && (
                                <Input
                                    type="number"
                                    min="0"
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(e.target.value)}
                                    placeholder="60"
                                    className="h-8 text-xs mt-2"
                                />
                            )}
                            {durationDay && (
                                <Input
                                    type="number"
                                    min="0"
                                    value={durationDay}
                                    onChange={(e) => setDurationDay(e.target.value)}
                                    placeholder="3"
                                    className="h-8 text-xs mt-2"
                                />
                            )}
                            {durationHours && (
                                <Input
                                    type="number"
                                    min="0"
                                    value={durationHours}
                                    onChange={(e) => setDurationHours(e.target.value)}
                                    placeholder="1"
                                    className="h-8 text-xs mt-2"
                                />
                            )}
                        </div>
                    </div>



                    {/* Base price + delivery days */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>
                                Base price ({currency})
                                <span className="text-muted-foreground font-normal ml-1 text-xs">
                                    {packages.length > 0 ? '(auto from packages)' : '*'}
                                </span>
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={packages.length > 0
                                    ? String(Math.min(...packages.map((p) => parseFloat(p.price) || 0)))
                                    : basePrice
                                }
                                onChange={(e) => setBasePrice(e.target.value)}
                                placeholder="0.00"
                                disabled={packages.length > 0}
                                className={packages.length > 0 ? 'opacity-60' : ''}
                            />
                            <p className="text-xs text-muted-foreground">
                                Shown as "starting from" when no package selected.
                            </p>
                        </div>

                    </div>

                    {/* SKU */}
                    <div className="space-y-1.5">
                        <Label>Reference / SKU</Label>
                        <Input
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            placeholder="SVC-001"
                            className="font-mono text-xs"
                        />
                    </div>

                    {/* Toggles */}
                    <div className="space-y-2">
                        {/* Availability */}
                        <div className="rounded-lg border p-3 space-y-2">
                            <Label className="text-sm font-medium">Availability</Label>
                            <div className="flex gap-2 flex-wrap">
                                {AVAILABILITY_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setAvailability(opt.value)}
                                        className={`px-3 py-1.5 rounded-md text-xs border transition-all ${availability === opt.value
                                            ? 'bg-foreground text-background border-foreground font-medium'
                                            : 'border-border text-muted-foreground hover:border-foreground/40'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bookings */}
                        <div className="rounded-lg border p-3 space-y-2">
                            <Label className="text-sm font-medium">Bookings</Label>
                            <div className="flex gap-2 flex-wrap">
                                {BOOKING_OPTION.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setBooking(opt.value)}
                                        className={`px-3 py-1.5 rounded-md text-xs border transition-all ${booking === opt.value
                                            ? 'bg-foreground text-background border-foreground font-medium'
                                            : 'border-border text-muted-foreground hover:border-foreground/40'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Service active */}
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label className="text-sm font-normal cursor-pointer">Service active (visible on store)</Label>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>

                        {/* Deposit */}
                        <div className="rounded-lg border p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-normal flex items-center gap-1.5 cursor-pointer">
                                    <BadgePercent className="w-3.5 h-3.5" />
                                    Requires deposit
                                </Label>
                                <Switch checked={requiresDeposit} onCheckedChange={setRequiresDeposit} />
                            </div>
                            {requiresDeposit && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Deposit percentage (%)</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={depositPercent}
                                        onChange={(e) => setDepositPercent(e.target.value)}
                                        placeholder="50"
                                        className="h-8 text-xs w-28"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right — media + discovery */}
                <div className="space-y-4">
                    {/* Media upload */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5" /> Media
                            <span className="text-muted-foreground font-normal text-xs ml-1">(images & videos)</span>
                        </Label>

                        {media.length > 0 && (
                            <div className="space-y-2">
                                {media.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 rounded border bg-muted/30 p-2">
                                        {item.type === 'image' ? (
                                            <img src={item.url} alt="" className="w-12 h-12 object-cover rounded shrink-0" />
                                        ) : (
                                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                                                <Video className="w-5 h-5 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-muted-foreground font-mono truncate">{item.url}</p>
                                            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mt-0.5">
                                                {item.type}
                                                {i === 0 && item.type === 'image' && ' · thumbnail'}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => setMedia((prev) => prev.filter((_, j) => j !== i))}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Image upload */}
                        <ImageUpload
                            label="Add image"
                            value=""
                            pathInDb=""
                            onChange={(url) => setMedia((prev) => [...prev, { id: `img-${Date.now()}`, url, type: 'image' }])}
                            bucket="store-assets"
                            pathPrefix={`${storeId}/services`}
                            aspectRatio="square"
                        />

                        {/* Video URL input */}
                        <div className="flex gap-2">
                            <Input
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                placeholder="Paste video URL (mp4, YouTube…)"
                                className="text-xs h-8 flex-1"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs shrink-0"
                                disabled={!videoUrl.trim()}
                                onClick={() => {
                                    setMedia((prev) => [...prev, { id: `video-${Date.now()}`, url: videoUrl.trim(), type: 'video' }])
                                    setVideoUrl('')
                                }}
                            >
                                <Video className="w-3.5 h-3.5 mr-1" />
                                Add video
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">First image is the thumbnail. Videos play inline.</p>
                    </div>

                    {/* Tags */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" /> Tags
                        </Label>
                        <Input
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="branding, logo, design (comma-separated)"
                            className="text-xs"
                        />
                    </div>

                    {/* Features / what's included */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" /> What's included
                        </Label>
                        <Textarea
                            value={features}
                            onChange={(e) => setFeatures(e.target.value)}
                            rows={4}
                            placeholder={"1-on-1 consultation call\nSource files included\nUnlimited email support"}
                            className="resize-none text-xs"
                        />
                        <p className="text-xs text-muted-foreground">One item per line.</p>
                    </div>

                    {/* Rating + reviews (manual override) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1.5 text-xs">
                                <Star className="w-3.5 h-3.5" /> Rating (0–5)
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                max="5"
                                step="0.1"
                                value={rating}
                                onChange={(e) => setRating(e.target.value)}
                                placeholder="4.8"
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Review count</Label>
                            <Input
                                type="number"
                                min="0"
                                value={reviews}
                                onChange={(e) => setReviews(e.target.value)}
                                placeholder="24"
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Section 2: Packages (price tiers) ── */}
            <Separator />
            <div className="space-y-3">
                <button
                    onClick={() => setShowPackages(!showPackages)}
                    className="flex items-center justify-between w-full text-sm font-medium text-foreground hover:text-muted-foreground transition-colors"
                >
                    <span>
                        Packages / pricing tiers ({packages.length})
                        {packages.length === 0 && (
                            <span className="text-xs font-normal text-muted-foreground ml-2">
                                — add tiers like Basic / Standard / Premium
                            </span>
                        )}
                    </span>
                    {showPackages ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <AnimatePresence>
                    {showPackages && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 overflow-hidden"
                        >
                            <p className="text-xs text-muted-foreground">
                                Each package has its own price, delivery time and deliverables.
                                The lowest package price becomes the "starting from" price on the storefront.
                                Mark one as <strong>Featured</strong> to highlight it.
                            </p>

                            {packages.map((pkg, i) => (
                                <Card key={i} className={pkg.is_featured ? 'border-foreground/40' : ''}>
                                    <CardContent className="pt-4 space-y-4">
                                        {/* Package header */}
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                                                Package {i + 1}
                                                {pkg.is_featured && (
                                                    <span className="ml-2 text-[10px] bg-foreground text-background px-1.5 py-0.5 rounded">
                                                        Featured
                                                    </span>
                                                )}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                                    onClick={() => {
                                                        const next = packages.map((p, j) => ({
                                                            ...p,
                                                            is_featured: j === i ? !p.is_featured : false,
                                                        }))
                                                        setPackages(next)
                                                    }}
                                                >
                                                    {pkg.is_featured ? 'Unfeature' : 'Mark as featured'}
                                                </button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setPackages((prev) => prev.filter((_, j) => j !== i))}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Row 1: name + price + delivery + revisions */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Package name *</Label>
                                                <Input
                                                    value={pkg.name}
                                                    onChange={(e) => {
                                                        const next = [...packages]
                                                        next[i] = { ...next[i], name: e.target.value }
                                                        setPackages(next)
                                                    }}
                                                    placeholder="e.g. Basic"
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Price ({currency}) *</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={pkg.price}
                                                    onChange={(e) => {
                                                        const next = [...packages]
                                                        next[i] = { ...next[i], price: e.target.value }
                                                        setPackages(next)
                                                    }}
                                                    placeholder="0.00"
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Delivery (days)
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={pkg.delivery_days}
                                                    onChange={(e) => {
                                                        const next = [...packages]
                                                        next[i] = { ...next[i], delivery_days: e.target.value }
                                                        setPackages(next)
                                                    }}
                                                    placeholder="3"
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs flex items-center gap-1">
                                                    <RefreshCw className="w-3 h-3" /> Revisions
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={pkg.revisions ?? ''}
                                                    onChange={(e) => {
                                                        const next = [...packages]
                                                        next[i] = { ...next[i], revisions: e.target.value }
                                                        setPackages(next)
                                                    }}
                                                    placeholder="Unlimited if blank"
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        </div>

                                        {/* Row 2: short description */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Short description</Label>
                                            <Input
                                                value={pkg.description ?? ''}
                                                onChange={(e) => {
                                                    const next = [...packages]
                                                    next[i] = { ...next[i], description: e.target.value }
                                                    setPackages(next)
                                                }}
                                                placeholder="e.g. Perfect for small businesses just getting started"
                                                className="h-8 text-xs"
                                            />
                                        </div>

                                        {/* Row 3: deliverables */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Deliverables (one per line)</Label>
                                            <Textarea
                                                value={pkg.deliverables}
                                                onChange={(e) => {
                                                    const next = [...packages]
                                                    next[i] = { ...next[i], deliverables: e.target.value }
                                                    setPackages(next)
                                                }}
                                                rows={3}
                                                placeholder={"Logo in PNG/SVG\nBrand colour palette\nFont recommendations"}
                                                className="resize-none text-xs"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => setPackages((prev) => [...prev, { ...EMPTY_PACKAGE }])}
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Add package
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// ServiceSettings — list view
// ─────────────────────────────────────────────────────────────────────────────

export default function ServiceSettings({
    storeId,
    currency,
}: {
    storeId: string
    currency: string
}) {
    const [services, setServices] = useState<ServiceItem[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<'list' | 'new' | 'edit'>('list')
    const [editService, setEditService] = useState<ServiceItem | undefined>()

    const load = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        const { data } = await supabase
            .from('services')
            .select('id, name, slug, description, price, is_active, sku, metadata')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
        setServices((data as ServiceItem[]) ?? [])
        setLoading(false)
    }, [storeId])

    useEffect(() => { load() }, [load])

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this service? This cannot be undone.')) return
        const supabase = createClient()
        await supabase.from('services').delete().eq('id', id)
        load()
    }

    const handleToggleActive = async (svc: ServiceItem) => {
        const supabase = createClient()
        await supabase.from('services').update({ is_active: !svc.is_active }).eq('id', svc.id)
        load()
    }

    if (view === 'new') {
        return (
            <ServiceForm
                storeId={storeId}
                currency={currency}
                onSaved={() => { load(); setView('list') }}
                onCancel={() => setView('list')}
            />
        )
    }

    if (view === 'edit' && editService) {
        return (
            <ServiceForm
                storeId={storeId}
                currency={currency}
                service={editService}
                onSaved={() => { load(); setView('list'); setEditService(undefined) }}
                onCancel={() => { setView('list'); setEditService(undefined) }}
            />
        )
    }

    // ── List ───────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-semibold text-foreground">Services</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {services.length} service{services.length !== 1 ? 's' : ''} in your store
                    </p>
                </div>
                <Button size="sm" className="h-8 text-xs shrink-0" onClick={() => setView('new')}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    <span className="hidden xs:inline">Add service</span>
                    <span className="xs:hidden">Add</span>
                </Button>
            </div>

            {loading && (
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                    ))}
                </div>
            )}

            {!loading && services.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="py-16 text-center space-y-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                            <Briefcase className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">No services yet</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Add your first service to start accepting bookings.
                            </p>
                        </div>
                        <Button size="sm" className="h-8 text-xs" onClick={() => setView('new')}>
                            Add your first service
                        </Button>
                    </CardContent>
                </Card>
            )}

            {!loading && services.length > 0 && (
                <div className="rounded-lg border divide-y">
                    {services.map((svc) => {
                        const thumb = svc.metadata?.media?.find((m: ServiceMediaItem) => m.type === 'image')?.url
                        const pkgs = svc.metadata?.packages ?? []
                        const availability = svc.metadata?.availability ?? 'available'
                        const availColor = {
                            available: 'bg-green-500',
                            busy: 'bg-yellow-500',
                            unavailable: 'bg-red-500',
                        }[availability]


                        // Price display: show range if multiple packages
                        const prices = pkgs.map((p: any) => parseFloat(p.price) || 0).filter(Boolean)
                        const priceDisplay = prices.length >= 2
                            ? `${currency} ${Math.min(...prices).toLocaleString()} – ${Math.max(...prices).toLocaleString()}`
                            : `${currency} ${Number(svc.price).toLocaleString()}`

                        return (
                            <div
                                key={svc.id}
                                className="flex items-center gap-3 px-3 py-3 sm:px-4 bg-background hover:bg-muted/30 transition-colors"
                            >
                                {/* Thumbnail */}
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded border bg-muted shrink-0 overflow-hidden">
                                    {thumb
                                        ? <img src={thumb} alt={svc.name} className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center">
                                            <Briefcase className="w-4 h-4 text-muted-foreground/40" />
                                        </div>
                                    }
                                </div>

                                {/* Name + type */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{svc.name}</p>
                                    <p className="text-xs text-muted-foreground truncate hidden xs:block">
                                        {svc.metadata?.serviceType
                                            ? `${svc.metadata.serviceType} · ${svc.slug}`
                                            : svc.slug}
                                    </p>
                                </div>

                                {/* Price range */}
                                <p className="text-sm font-medium text-foreground shrink-0 hidden sm:block">
                                    {priceDisplay}
                                </p>

                                {/* Packages count */}
                                {pkgs.length > 0 && (
                                    <p className="text-xs text-muted-foreground shrink-0 hidden md:block">
                                        {pkgs.length} package{pkgs.length !== 1 ? 's' : ''}
                                    </p>
                                )}

                                {/* Availabilityflex dot */}
                                <div className=" items-center gap-1.5 shrink-0 hidden sm:flex">
                                    <span className={`w-1.5 h-1.5 rounded-full ${availColor}`} />
                                    <span className="text-xs text-muted-foreground capitalize hidden lg:inline">
                                        {availability}
                                    </span>
                                </div>



                                {/* Active badge */}
                                <button onClick={() => handleToggleActive(svc)} className="shrink-0">
                                    <Badge
                                        variant={svc.is_active ? 'default' : 'secondary'}
                                        className="text-[10px] cursor-pointer"
                                    >
                                        {svc.is_active ? 'Active' : 'Draft'}
                                    </Badge>
                                </button>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-muted-foreground"
                                        onClick={() => { setEditService(svc); setView('edit') }}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDelete(svc.id)}
                                        aria-label="Delete service"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}