// Pure helpers for server-paginated admin lists: the URL is the state. Untrusted search params in,
// a safe query out; links and PostgREST filters out of that. No React, no I/O (see list-query.test.ts).

export const PAGE_SIZE = 50
const MAX_PAGE = 10_000
const MAX_SEARCH = 100

type Raw = Record<string, string | string[] | undefined>

/** Allowed values per filter name. Anything else in the URL is dropped, never sent to the database. */
export type FilterSpec = Record<string, readonly string[]>

export type ListQuery<F extends string = string> = {
    page: number
    q: string | null
    filters: Record<F, string | null>
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export function parseListQuery<S extends FilterSpec>(raw: Raw, spec: S): ListQuery<keyof S & string> {
    const page = Number.parseInt(first(raw.page) ?? '', 10)
    const q = first(raw.q)?.trim().slice(0, MAX_SEARCH)
    const filters = {} as Record<keyof S & string, string | null>
    for (const name of Object.keys(spec) as (keyof S & string)[]) {
        const v = first(raw[name])
        // includes() on an array of literals, so 'toString' and friends cannot slip through.
        filters[name] = v && spec[name].includes(v) ? v : null
    }
    return {
        page: Number.isFinite(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1,
        q: q || null,
        filters,
    }
}

/** True when anything narrows the list, so the empty state can say "no matches" rather than "nothing yet". */
export function isFiltered(q: ListQuery): boolean {
    return Boolean(q.q) || Object.values(q.filters).some(Boolean)
}

/** Inclusive row range for PostgREST `.range(from, to)`. */
export function pageRange(page: number): { from: number; to: number } {
    const from = (page - 1) * PAGE_SIZE
    return { from, to: from + PAGE_SIZE - 1 }
}

export function totalPages(total: number): number {
    return Math.max(1, Math.ceil(total / PAGE_SIZE))
}

/** Link to a list with these params. Defaults are omitted so URLs stay short. */
export function listHref(basePath: string, params: Record<string, string | number | null | undefined>): string {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
        if (v === null || v === undefined || v === '') continue
        if (k === 'page' && Number(v) <= 1) continue
        p.set(k, String(v))
    }
    const s = p.toString()
    return s ? `${basePath}?${s}` : basePath
}

/** The `q` plus filters as link params, for building page links that keep the current view. */
export function queryParams(q: ListQuery): Record<string, string | number | null> {
    return { q: q.q, ...q.filters, page: q.page }
}

/**
 * A user's search text made safe to splice into a PostgREST `.or()` / `ilike` value. The characters
 * that structure an or-filter (comma, parens), the LIKE wildcards and escapes are removed. Returns
 * null when nothing searchable is left.
 */
export function likeTerm(search: string | null): string | null {
    const t = (search ?? '').replace(/[,()%*\\"']/g, ' ').replace(/\s+/g, ' ').trim()
    return t ? t : null
}

/** `col1.ilike.%term%,col2.ilike.%term%` for `.or()`, or null when there is nothing to search for. */
export function orIlike(columns: readonly string[], search: string | null): string | null {
    const t = likeTerm(search)
    return t ? columns.map((c) => `${c}.ilike.%${t}%`).join(',') : null
}
