// Where onboarding sends someone once their org exists.
//
// `next` comes from redirectToOrgPath (org/_lib/redirect.ts): it is the sub-path they were
// trying to reach under /org (`/servers`, `/stores/new`), not a full path. It is also a query
// parameter, so anything that is not a plain same-origin sub-path is dropped.

export function sanitizeOrgSubpath(next: string | null | undefined): string {
    if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return ''
    if (/[\u0000-\u001f]/.test(next)) return ''
    return next === '/' ? '' : next
}

/** The new org's page, plus the sub-path they were heading for. */
export function afterOnboardingPath(orgSlug: string, next: string | null | undefined): string {
    return `/org/${encodeURIComponent(orgSlug)}${sanitizeOrgSubpath(next)}`
}
