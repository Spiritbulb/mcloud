// Pure rules for delivery zones, shared by the cart, checkout and the merchant's logistics form.
// Kept free of imports so the theme package (which reaches into this app by relative path)
// and the tests can use it as-is.

export type ZoneLike = { id: string; available?: boolean | null }

/**
 * The zone to preselect at checkout: only when there is exactly one available zone, so there is
 * nothing to choose between. With several, the shopper must pick. Defaulting to the first one
 * (alphabetical) quietly charged people for an area they never selected.
 */
export function initialZoneId(zones: readonly ZoneLike[]): string | null {
    const available = zones.filter((z) => z.available)
    return available.length === 1 ? available[0].id : null
}

/**
 * What the cart's shipping row says. The cart cannot know the cost (the zone is chosen at
 * checkout), so for a store with zones it must not claim "Free". With no zones nothing is
 * charged, which is the one case where "Free" is true.
 */
export function cartShippingLabel(hasDeliveryZones: boolean | undefined): string {
    return hasDeliveryZones ? 'Calculated at checkout' : 'Free'
}

/** A merchant's zone as submitted: untrusted, so every field is `unknown`. */
export type ZoneInput = { location_name?: unknown; rate?: unknown; available?: unknown }

/**
 * The first problem with a set of zones, or null. A blank rate used to be stored as null and
 * priced as 0, so a zone saved without a rate silently became free delivery. Free must be
 * chosen on purpose, by entering 0.
 */
export function zoneProblem(zones: readonly ZoneInput[]): string | null {
    for (const z of zones) {
        const name = typeof z.location_name === 'string' ? z.location_name.trim() : ''
        if (!name) return 'Every delivery zone needs a location name.'
        if (z.available === false) continue // a zone that is switched off is never priced
        const rate = z.rate
        const blank = rate === null || rate === undefined || (typeof rate === 'string' && rate.trim() === '')
        const n = typeof rate === 'number' ? rate : Number(rate)
        if (blank || !Number.isFinite(n) || n < 0) {
            return `Set a rate for ${name}. Enter 0 if delivery there is free.`
        }
    }
    return null
}
