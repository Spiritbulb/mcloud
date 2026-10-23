'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SearchField, SelectField, Toolbar } from './fields'
import { listHref } from './list-query'

export type FilterOption = { value: string; label: string }
export type FilterDef = { name: string; label: string; allLabel: string; options: readonly FilterOption[] }

/**
 * Search and filters for a server-paginated list. The URL is the state: a change rewrites the query
 * string (and drops back to page 1), the server page re-renders with the new rows. Typing is
 * debounced; selects apply at once.
 */
export function FilterBar({ searchPlaceholder, filters = [] }: { searchPlaceholder?: string; filters?: readonly FilterDef[] }) {
    const router = useRouter()
    const pathname = usePathname()
    const params = useSearchParams()
    const [, start] = useTransition()
    const [text, setText] = useState(params.get('q') ?? '')
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Follow the URL when it changes underneath us (back button, a "Clear" link).
    const urlQ = params.get('q') ?? ''
    const [seenQ, setSeenQ] = useState(urlQ)
    if (seenQ !== urlQ) {
        setSeenQ(urlQ)
        setText(urlQ)
    }
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

    const push = (patch: Record<string, string | null>) => {
        const next: Record<string, string | null> = {}
        params.forEach((v, k) => { next[k] = v })
        Object.assign(next, patch, { page: null })
        start(() => router.replace(listHref(pathname, next), { scroll: false }))
    }

    return (
        <Toolbar>
            {searchPlaceholder && (
                <SearchField
                    value={text}
                    placeholder={searchPlaceholder}
                    onChange={(v) => {
                        setText(v)
                        if (timer.current) clearTimeout(timer.current)
                        timer.current = setTimeout(() => push({ q: v.trim() || null }), 300)
                    }}
                />
            )}
            {filters.map((f) => (
                <SelectField key={f.name} label={f.label} value={params.get(f.name) ?? ''} onChange={(v) => push({ [f.name]: v || null })}>
                    <option value="">{f.allLabel}</option>
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </SelectField>
            ))}
        </Toolbar>
    )
}
