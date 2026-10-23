// Custom-domain rules: the Domain settings screen, /api/store/domain and storefront URLs. Pure, tested in
// custom-domain.test.ts.

/** What the merchant typed, as a bare hostname: no scheme, path, port or trailing dot. */
export function normalizeDomain(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/^[a-z]+:\/\//, '')
        .replace(/[/?#].*$/, '')
        .replace(/:\d+$/, '')
        .replace(/\.$/, '')
}

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/

/** A hostname we can register: at least two labels, a letters-only TLD, no spaces or wildcards. */
export function isValidDomain(domain: string): boolean {
    if (domain.length > 253) return false
    const labels = domain.split('.')
    if (labels.length < 2) return false
    if (!/^[a-z]{2,63}$/.test(labels[labels.length - 1])) return false
    return labels.every((l) => LABEL.test(l))
}

// Second-level suffixes where the registrable name has three labels (shop.co.ke is an apex).
// Not the full public-suffix list: the ones our merchants use, plus common neighbours.
const TWO_LEVEL_SUFFIXES = new Set([
    'co.ke', 'or.ke', 'ac.ke', 'go.ke', 'ne.ke', 'sc.ke', 'me.ke', 'info.ke', 'mobi.ke',
    'co.ug', 'or.ug', 'co.tz', 'or.tz', 'co.rw', 'com.ng', 'org.ng', 'com.gh', 'co.za', 'org.za',
    'co.uk', 'org.uk', 'com.au',
])

/** The part of `domain` before its registrable name ('' for an apex). */
export function subdomainOf(domain: string): string {
    const labels = domain.split('.')
    const suffix = labels.slice(-2).join('.')
    const apexLabels = TWO_LEVEL_SUFFIXES.has(suffix) ? 3 : 2
    return labels.slice(0, Math.max(0, labels.length - apexLabels)).join('.')
}

export type DnsRecord = { type: 'A' | 'CNAME'; name: string; value: string }

/**
 * The record to add at the registrar so the domain points at the storefront on Vercel. An apex
 * cannot hold a CNAME, so it gets Vercel's A record; a subdomain gets a CNAME named after it.
 */
export function dnsRecordFor(domain: string): DnsRecord {
    const sub = subdomainOf(domain)
    return sub
        ? { type: 'CNAME', name: sub, value: 'cname.vercel-dns.com' }
        : { type: 'A', name: '@', value: '76.76.21.21' }
}
