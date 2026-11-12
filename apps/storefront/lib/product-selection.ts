// Which products a section shows, when the merchant has picked them (a `products` field,
// stored as settings.productIds). Pure, so the Editor's picker and the renderer share one
// definition of "valid list" and it can be tested without the module graph.

export const MAX_PICKED_PRODUCTS = 12

/** Whatever was stored, narrowed to a list of distinct non-empty string ids, capped. */
export function pickedIds(raw: unknown, max = MAX_PICKED_PRODUCTS): string[] {
    if (!Array.isArray(raw)) return []
    const out: string[] = []
    for (const v of raw) {
        if (typeof v === 'string' && v && !out.includes(v)) out.push(v)
        if (out.length >= max) break
    }
    return out
}

/**
 * The products to render. Nothing picked: `fallback` (what the section always showed).
 * Something picked: exactly those, in the merchant's order. An id with no matching
 * product (deleted, hidden) is skipped; if every pick is gone the section shows nothing
 * rather than silently swapping in products the merchant did not choose.
 */
export function selectProducts<T extends { id: string }>(raw: unknown, products: readonly T[], fallback: readonly T[]): T[] {
    const ids = pickedIds(raw)
    if (ids.length === 0) return [...fallback]
    const byId = new Map(products.map((p) => [p.id, p]))
    return ids.flatMap((id) => {
        const p = byId.get(id)
        return p ? [p] : []
    })
}

export function addId(ids: readonly string[], id: string, max = MAX_PICKED_PRODUCTS): string[] {
    if (ids.includes(id) || ids.length >= max) return [...ids]
    return [...ids, id]
}

export function removeId(ids: readonly string[], id: string): string[] {
    return ids.filter((x) => x !== id)
}

/** Move the id at `index` one step (-1 up, +1 down). Out of range is a no-op. */
export function moveId(ids: readonly string[], index: number, step: -1 | 1): string[] {
    const to = index + step
    if (index < 0 || index >= ids.length || to < 0 || to >= ids.length) return [...ids]
    const next = [...ids]
    ;[next[index], next[to]] = [next[to], next[index]]
    return next
}
