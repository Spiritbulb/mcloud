// Pure helpers for the store settings shell: the nav model as shell sections, and which tab a URL
// is on. No React, so they run under bare `node --test` (see settings-nav-logic.test.ts).
import type { NavSection } from '@mcloud/verticals'
import type { ShellNavSection } from '@mcloud/ui/kit/nav-logic'

export function settingsPath(orgSlug: string, storeSlug: string, tab?: string) {
    const base = `/org/${orgSlug}/${storeSlug}/settings`
    return tab && tab !== 'home' ? `${base}/${tab}` : base
}

/**
 * The vertical's nav as shell sections. Integrations' sub-tabs are not repeated here: its page
 * has its own tabs. Beta tabs say so; Pro tabs say so only to stores not on a paid plan.
 */
export function settingsSections(groups: readonly NavSection[], orgSlug: string, storeSlug: string, isPaid: boolean): ShellNavSection[] {
    return groups.map((g) => ({
        id: g.id,
        label: g.label,
        items: g.tabs.map((t) => ({
            id: t.id,
            label: t.label,
            icon: t.icon,
            href: settingsPath(orgSlug, storeSlug, t.id),
            badge: t.beta ? 'Beta' : t.pro && !isPaid ? 'Pro' : undefined,
        })),
    }))
}

// Pages that manage their own scrolling and bleed to the edges.
export const BARE_TABS = new Set(['editor', 'appearance'])

// Routes that exist but have no nav entry: no item is highlighted, and the breadcrumb says where you are.
export const UNLISTED_LABELS: Record<string, string> = { account: 'Account', appearance: 'Design', content: 'Content' }

/** The settings tab a path is on: "/org/a/s/settings/integrations/payments" -> "integrations". */
export function tabFromPath(pathname: string): string {
    return pathname.split('/settings/')[1]?.split(/[/?#]/)[0] || 'home'
}
