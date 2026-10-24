// Stock rules for the React themes. Must agree with the Liquid templates
// (classic/sections/product-card.liquid): a product that does not track inventory is always
// available, whatever its inventory_quantity says (it is usually 0 because nobody counts it).

/** Quantity cap for products that don't track stock, so the stepper still has a ceiling. */
export const UNTRACKED_MAX_QUANTITY = 99

export interface StockFields {
    track_inventory?: boolean | null
    inventory_quantity?: number | null
}

/** Treat a missing flag as tracked: that was the old behaviour, so nothing becomes oversellable. */
function tracks(item: StockFields): boolean {
    return item.track_inventory !== false
}

export function isInStock(item: StockFields): boolean {
    if (!tracks(item)) return true
    return (item.inventory_quantity ?? 0) > 0
}

/** Most a shopper can put in the cart at once. */
export function maxOrderQuantity(item: StockFields): number {
    if (!tracks(item)) return UNTRACKED_MAX_QUANTITY
    return Math.max(0, item.inventory_quantity ?? 0)
}

/** "N available" only means something when stock is counted. */
export function showsStockCount(item: StockFields): boolean {
    return tracks(item) && isInStock(item)
}
