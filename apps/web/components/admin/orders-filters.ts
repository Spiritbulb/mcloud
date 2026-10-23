// Filter definitions for the orders list, shared by the server page (validation) and the view (options).
export const ORDER_STATUSES = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
] as const

export const ORDER_FILTERS = { status: ORDER_STATUSES.map((s) => s.value) } as const
