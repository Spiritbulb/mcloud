// Seat availability for products that track inventory (events, limited runs, any capped item).
// Checkout does not decrement inventory_quantity, so availability is computed as
// capacity minus bookings that still hold a seat.

/** Orders in these states no longer hold a seat. Everything else (pending, paid, fulfilled) does. */
export const UNCOUNTED_ORDER_STATUSES: readonly string[] = ['cancelled', 'refunded']

export interface SeatInput {
    trackInventory: boolean | null | undefined
    capacity: number | null | undefined
    taken: number
}

export interface Seats {
    trackInventory: boolean
    capacity: number | null
    taken: number
    seatsLeft: number | null
}

export function computeSeats(input: SeatInput): Seats {
    // A missing flag means tracked, matching packages/themes/src/stock-logic.ts.
    const trackInventory = input.trackInventory !== false
    if (!trackInventory) {
        return { trackInventory: false, capacity: null, taken: input.taken, seatsLeft: null }
    }
    const capacity = Math.max(0, input.capacity ?? 0)
    return {
        trackInventory: true,
        capacity,
        taken: input.taken,
        seatsLeft: Math.max(0, capacity - input.taken),
    }
}
