import type { ShellNavSection } from '@mcloud/ui/kit/nav-logic'

// The admin's nav model. The frame itself (sidebar, drawer, header) is the shared AppShell.

export type AdminUser = {
    name: string
    email: string
    avatarUrl?: string
}

export const ADMIN_SECTIONS: ShellNavSection[] = [
    {
        id: 'overview',
        label: 'Overview',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/admin' },
        ],
    },
    {
        id: 'platform',
        label: 'Platform',
        items: [
            { id: 'users', label: 'Users', icon: 'people', href: '/admin/users' },
            { id: 'stores', label: 'Stores', icon: 'storefront', href: '/admin/stores' },
        ],
    },
    {
        id: 'commerce',
        label: 'Commerce',
        items: [
            { id: 'subs', label: 'Subscriptions', icon: 'subscriptions', href: '/admin/subs' },
            { id: 'orders', label: 'Orders', icon: 'receipt_long', href: '/admin/orders' },
        ],
    },
    {
        id: 'content',
        label: 'Content',
        items: [
            { id: 'docs', label: 'Documentation', icon: 'article', href: '/admin/docs-editor' },
        ],
    },
    {
        id: 'system',
        label: 'System',
        items: [
            { id: 'audit', label: 'Audit log', icon: 'history', href: '/admin/audit' },
            { id: 'webhooks', label: 'Webhook Logs', icon: 'webhook', href: '/admin/webhooks' },
            { id: 'handoff-recovery', label: 'Handoff recovery', icon: 'mark_email_unread', href: '/admin/handoff-recovery' },
        ],
    },
]
