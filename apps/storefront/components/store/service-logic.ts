// Draft <-> saved shape for the Services screen (service-settings.tsx). Every field is a string in
// the draft so inputs bind freely; `servicePayload` parses it into what `saveService` stores, keeping
// the metadata keys the themes read. Pure, tested in service-logic.test.ts.

export type Availability = 'available' | 'busy' | 'unavailable'
export type Booking = 'instant' | 'scheduled' | 'quote_only'
export type DurationUnit = 'minutes' | 'hours' | 'days'

export type DraftPackage = {
    id: string
    name: string
    price: string
    description: string
    deliverables: string // one per line
    delivery_days: string
    revisions: string // blank = unlimited
    is_featured: boolean
}

export type MediaItem = { id: string; url: string; type: 'image' | 'video' }

export type ServiceDraft = {
    name: string
    slug: string
    description: string
    sku: string
    isActive: boolean
    basePrice: string
    availability: Availability
    booking: Booking
    serviceType: string
    location: string
    quantityUnit: string
    minQuantity: string
    maxQuantity: string
    quantityStep: string
    duration: string
    durationUnit: DurationUnit | ''
    deliveryDays: string
    tags: string
    features: string
    requiresDeposit: boolean
    depositPercent: string
    rating: string
    reviews: string
    media: MediaItem[]
    packages: DraftPackage[]
}

type ServiceLike = {
    name: string
    slug: string
    description: string | null
    sku: string | null
    is_active: boolean
    price: number | string | null
    images?: string[] | null
    metadata?: Record<string, unknown> | null
}

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export function slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

let seq = 0
/** A fresh id for something added in the form. */
export function newId(prefix: string): string {
    seq += 1
    return `${prefix}-${Date.now().toString(36)}-${seq}`
}

export function emptyPackage(): DraftPackage {
    return { id: newId('pkg'), name: '', price: '', description: '', deliverables: '', delivery_days: '3', revisions: '1', is_featured: false }
}

export function emptyDraft(): ServiceDraft {
    return {
        name: '', slug: '', description: '', sku: '', isActive: true, basePrice: '',
        availability: 'available', booking: 'instant', serviceType: '', location: '',
        quantityUnit: '', minQuantity: '', maxQuantity: '', quantityStep: '',
        duration: '', durationUnit: '', deliveryDays: '', tags: '', features: '',
        requiresDeposit: false, depositPercent: '50', rating: '', reviews: '',
        media: [], packages: [],
    }
}

/** A saved service as an editable draft. Older rows keep images in `images`, not `metadata.media`. */
export function draftFromService(service: ServiceLike): ServiceDraft {
    const m = service.metadata ?? {}
    const duration = m.durationMinutes ? ['minutes', m.durationMinutes] : m.durationHours ? ['hours', m.durationHours] : m.durationDay ? ['days', m.durationDay] : ['', '']
    const media = Array.isArray(m.media)
        ? (m.media as MediaItem[]).map((x, i) => ({ id: x.id || `media-${i}`, url: x.url, type: x.type === 'video' ? 'video' as const : 'image' as const }))
        : (service.images ?? []).map((url, i) => ({ id: `img-${i}`, url, type: 'image' as const }))
    return {
        name: service.name,
        slug: service.slug,
        description: service.description ?? '',
        sku: service.sku ?? '',
        isActive: service.is_active,
        basePrice: str(service.price),
        availability: (['available', 'busy', 'unavailable'] as const).find((a) => a === m.availability) ?? 'available',
        booking: (['instant', 'scheduled', 'quote_only'] as const).find((b) => b === m.booking) ?? 'instant',
        serviceType: str(m.serviceType),
        location: str(m.location),
        quantityUnit: str(m.quantityUnit),
        minQuantity: str(m.minQuantity),
        maxQuantity: str(m.maxQuantity),
        quantityStep: str(m.quantityStep),
        duration: str(duration[1]),
        durationUnit: duration[0] as DurationUnit | '',
        deliveryDays: str(m.deliveryDays),
        tags: list(m.tags).join(', '),
        features: list(m.features).join('\n'),
        requiresDeposit: m.requiresDeposit === true,
        depositPercent: str(m.depositPercent ?? 50),
        rating: str(m.rating),
        reviews: str(m.reviews),
        media,
        packages: (Array.isArray(m.packages) ? (m.packages as Record<string, unknown>[]) : []).map((p) => ({
            id: typeof p.id === 'string' && p.id ? p.id : newId('pkg'),
            name: str(p.name),
            price: str(p.price),
            description: str(p.description),
            deliverables: list(p.deliverables).join('\n'),
            delivery_days: str(p.delivery_days ?? 3),
            revisions: str(p.revisions),
            is_featured: p.is_featured === true,
        })),
    }
}

const int = (s: string) => {
    const n = parseInt(s, 10)
    return Number.isFinite(n) ? n : null
}
const num = (s: string) => {
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : null
}
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

/** The lowest package price, else the base price: what the storefront shows as "from". */
export function startingPrice(draft: Pick<ServiceDraft, 'packages' | 'basePrice'>): number {
    const prices = draft.packages.map((p) => num(p.price)).filter((n): n is number => n !== null)
    return prices.length ? Math.min(...prices) : num(draft.basePrice) ?? 0
}

/** The first thing wrong with the draft, or null. */
export function draftProblem(draft: ServiceDraft): string | null {
    if (!draft.name.trim()) return 'Give the service a name.'
    if (draft.packages.length === 0 && num(draft.basePrice) === null) return 'Enter a price, or add at least one package.'
    for (const [i, p] of draft.packages.entries()) {
        const price = num(p.price)
        if (price === null || price < 0) return `Package ${i + 1} needs a price.`
    }
    if (num(draft.basePrice) !== null && num(draft.basePrice)! < 0) return 'The price cannot be negative.'
    const min = int(draft.minQuantity)
    const max = int(draft.maxQuantity)
    if (min !== null && max !== null && min > max) return 'The minimum quantity is larger than the maximum.'
    if (draft.requiresDeposit) {
        const pct = int(draft.depositPercent)
        if (pct === null || pct < 1 || pct > 100) return 'The deposit must be between 1% and 100%.'
    }
    const rating = num(draft.rating)
    if (draft.rating.trim() && (rating === null || rating < 0 || rating > 5)) return 'The rating must be between 0 and 5.'
    return null
}

/** What `saveService` stores. Metadata keys match what the themes read. */
export function servicePayload(draft: ServiceDraft) {
    const packages = draft.packages.map((p, i) => ({
        id: p.id || newId('pkg'),
        name: p.name.trim() || `Package ${i + 1}`,
        price: num(p.price) ?? 0,
        description: p.description.trim() || null,
        deliverables: lines(p.deliverables),
        delivery_days: int(p.delivery_days) ?? 3,
        revisions: int(p.revisions),
        is_featured: p.is_featured,
    }))
    const d = int(draft.duration)
    return {
        name: draft.name.trim(),
        slug: slugify(draft.slug) || slugify(draft.name),
        description: draft.description.trim() || null,
        item_type: 'service' as const,
        price: startingPrice(draft),
        compare_at_price: null,
        sku: draft.sku.trim() || null,
        is_active: draft.isActive,
        metadata: {
            serviceType: draft.serviceType.trim() || null,
            quantityUnit: draft.quantityUnit.trim(),
            booking: draft.booking,
            rating: draft.rating.trim() ? num(draft.rating) : null,
            reviews: draft.reviews.trim() ? int(draft.reviews) : null,
            features: lines(draft.features),
            descriptionHtml: null,
            durationMinutes: draft.durationUnit === 'minutes' ? d : null,
            durationHours: draft.durationUnit === 'hours' ? d : null,
            durationDay: draft.durationUnit === 'days' ? d : null,
            minQuantity: int(draft.minQuantity),
            maxQuantity: int(draft.maxQuantity),
            quantityStep: int(draft.quantityStep),
            deliveryDays: int(draft.deliveryDays),
            location: draft.location.trim() || null,
            requiresDeposit: draft.requiresDeposit,
            depositPercent: draft.requiresDeposit ? int(draft.depositPercent) ?? 50 : null,
            tags: [...new Set(draft.tags.split(',').map((t) => t.trim()).filter(Boolean))],
            packages,
            media: draft.media,
            availability: draft.availability,
        },
    }
}
