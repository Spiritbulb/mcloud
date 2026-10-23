// Filter definitions for the users list, shared by the server page (validation) and the view (options).
export const USER_ROLES = [
    { value: 'admin', label: 'Admin' },
    { value: 'client', label: 'Client' },
    { value: 'customer', label: 'Customer' },
] as const

export const USER_FILTERS = { role: USER_ROLES.map((r) => r.value) } as const
