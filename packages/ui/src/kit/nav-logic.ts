// Pure helpers for the shared app shell (app-shell.tsx): the nav model and which item is active.
// No React, so they run under bare `node --test` (see nav-logic.test.ts).

export type ShellNavItem = {
    id: string
    label: string
    /** Material Symbols name. */
    icon: string
    /** Square image shown instead of the icon, for a partner's own mark (e.g. Reach). */
    image?: string
    href: string
    /** Small tag after the label, e.g. "Beta" or "Pro". */
    badge?: string
    /** Opens elsewhere (another origin or a new tab); never the active item. */
    external?: boolean
}

export type ShellNavSection = {
    id: string
    /** Omit for a section that needs no heading (a short, flat nav). */
    label?: string
    items: ShellNavItem[]
}

/** Path without query, hash or trailing slash, so "/a/b/?x=1" and "/a/b" compare equal. */
export function normalizePath(path: string): string {
    const bare = path.split(/[?#]/)[0] || '/'
    return bare.length > 1 ? bare.replace(/\/+$/, '') : bare
}

/**
 * The item whose href is the longest whole-segment prefix of `pathname`. "/org/x/billing" matches
 * an item at "/org/x/billing", and not one at "/org/x/bill"; the overview at "/org/x" only wins when
 * nothing more specific does. Returns `fallback` when no item matches at all.
 */
export function activeNavId(sections: readonly ShellNavSection[], pathname: string, fallback?: string): string | undefined {
    const path = normalizePath(pathname)
    let best: { id: string; length: number } | undefined
    for (const item of sections.flatMap((s) => s.items)) {
        if (item.external) continue
        const href = normalizePath(item.href)
        const hit = path === href || path.startsWith(href === '/' ? '/' : `${href}/`)
        if (hit && (!best || href.length > best.length)) best = { id: item.id, length: href.length }
    }
    return best?.id ?? fallback
}

/** The active item itself, for breadcrumbs and page titles. */
export function findNavItem(sections: readonly ShellNavSection[], id: string | undefined): ShellNavItem | undefined {
    if (!id) return undefined
    return sections.flatMap((s) => s.items).find((i) => i.id === id)
}
