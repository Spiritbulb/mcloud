// Store slugs are generated from the name, so nobody has to choose an address over WhatsApp.
// Pure: uniqueness is decided by the caller against the database (see pickFreeSlug).
import { slugFromName, slugProblem } from '@mcloud/merchant/slug'

const MAX_BASE = 40

function baseFromName(name: string): string {
    let base = slugFromName(name).slice(0, MAX_BASE).replace(/-+$/g, '')
    if (!base) return 'my-store'
    if (base.length < 3) base = `${base}-site`
    if (slugProblem(base)) base = `${base}-store` // reserved words such as "admin" or "orders"
    return base
}

/** Ordered candidates: the plain slug, then -2 .. -9, then random 4 digit suffixes. All pass slugProblem. */
export function slugCandidates(name: string, random: () => number = Math.random): string[] {
    const base = baseFromName(name)
    const out = [base]
    for (let n = 2; n <= 9; n++) out.push(`${base}-${n}`)
    for (let i = 0; i < 3; i++) out.push(`${base}-${1000 + Math.floor(random() * 9000)}`)
    return [...new Set(out)].filter((c) => slugProblem(c) === null)
}

/** The first candidate not in `taken`, or null when every candidate is used. */
export function pickFreeSlug(candidates: string[], taken: ReadonlySet<string>): string | null {
    return candidates.find((c) => !taken.has(c)) ?? null
}
