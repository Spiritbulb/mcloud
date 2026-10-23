// Pure rules for Google Analytics on the web app: which GA property, which pages are measured, what
// a reported URL may contain, and how the consent choice is read. No I/O and no `window`, so it is
// testable under bare `node --test` (see analytics-logic.test.ts). The browser side is
// components/google-analytics.tsx.

/** The production GA4 property. NEXT_PUBLIC_GA_ID overrides it (e.g. for a staging property). */
export const DEFAULT_GA_ID = 'G-P7RJ7JW0BM'

const GA_ID_RE = /^G-[A-Z0-9]{6,}$/

/**
 * The measurement id to use. Unset or blank falls back to the production property, so adding this
 * indirection can never silently switch tracking off. A value that is set but malformed returns
 * null (track nothing) rather than quietly sending data to the wrong place.
 */
export function resolveGaId(env: string | undefined): string | null {
    const v = env?.trim()
    if (!v) return DEFAULT_GA_ID
    return GA_ID_RE.test(v) ? v : null
}

// Pages that are never measured: signed-in tools, auth, and URLs that carry a secret in the path
// (/invite/<token> is a working invitation link; GA stores the full URL it is given).
const UNTRACKED_PREFIXES = ['/admin', '/auth', '/callback', '/invite', '/dev-login', '/api', '/settings']

export function isTrackablePath(pathname: string): boolean {
    return !UNTRACKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

// Query parameters that survive into the reported URL. Everything else (codes, tokens, tickets,
// emails, return paths) is dropped: an allowlist, because a new auth parameter should be private
// by default. Campaign and click ids stay, since GA reads attribution from the page location.
const KEEP_PARAMS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'gclid', 'ref'])

export function reportedLocation(pathname: string, search: string, origin: string): { path: string; location: string } {
    const kept = new URLSearchParams()
    for (const [k, v] of new URLSearchParams(search)) {
        if (KEEP_PARAMS.has(k.toLowerCase())) kept.append(k, v)
    }
    const q = kept.toString()
    const path = q ? `${pathname}?${q}` : pathname
    return { path, location: `${origin}${path}` }
}

export type ConsentChoice = 'granted' | 'denied'

/** localStorage key shared with the cookie banner (it predates this: '1' meant "I understand"). */
export const CONSENT_KEY = 'mng_cookie_ok'

/**
 * Read the stored choice. Measurement stays on until someone declines (the banner has always said
 * continued use is acceptance), so nothing stored, or the legacy '1', means granted. To make it
 * opt-in later, change the final return to 'denied'; nothing else needs to move.
 */
export function parseConsent(stored: string | null | undefined): ConsentChoice {
    if (stored === 'declined') return 'denied'
    return 'granted'
}

/** Hosts GA should treat as one site when a visitor moves between them (cross-domain linker). */
export const LINKER_DOMAINS = ['mcloud.co.ke', 'www.mcloud.co.ke', 'app.mcloud.co.ke', 'spiritb.uk']
