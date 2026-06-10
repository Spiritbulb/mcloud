// ─── Permissions definition ────────────────────────────────────────────────────

export const PERMISSIONS = [
    { key: 'manage_products', label: 'Manage products', description: 'Create, edit and delete products' },
    { key: 'manage_orders', label: 'Manage orders', description: 'View and update order status' },
    { key: 'manage_customers', label: 'Manage customers', description: 'View and edit customer records' },
    { key: 'manage_discounts', label: 'Manage discounts', description: 'Create and manage discount codes' },
    { key: 'manage_blog', label: 'Manage blog', description: 'Write and publish blog posts' },
    { key: 'view_analytics', label: 'View analytics', description: 'Access sales and traffic reports' },
    { key: 'manage_settings', label: 'Manage settings', description: 'Edit store settings and theme' },
    { key: 'manage_members', label: 'Manage members', description: 'Invite and remove team members' },
]

// ─── Get members ───────────────────────────────────────────────────────────────
export type MemberRow = {
    id: string
    role: string
    permissions: string[]
    created_at: string | null
    users: {
        id: string
        name: string | null
        email: string | null
        avatar_url: string | null
    }
}