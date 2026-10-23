// Status options for the webhook log list, shared by the server page (validation) and the view.
export const WEBHOOK_STATUSES = [
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
] as const
