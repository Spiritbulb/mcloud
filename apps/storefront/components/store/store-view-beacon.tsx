'use client'

import { useEffect } from 'react'
import { STORE_API } from '@/lib/api-base'

/**
 * Counts a visit to the store home, once per browser session. The home is served from the
 * CDN, so there is no server render to count; this replaces the old after() counter.
 * Failures are ignored: a missed count must never affect the page.
 */
export default function StoreViewBeacon({ slug }: { slug: string }) {
    useEffect(() => {
        const key = `mc_store_view_${slug}`
        try {
            if (sessionStorage.getItem(key)) return
            sessionStorage.setItem(key, '1')
        } catch {
            // Storage blocked: count this view, we just can't dedupe it.
        }
        const url = `${STORE_API}/store/${slug}/view`
        try {
            if (navigator.sendBeacon?.(url)) return
            void fetch(url, { method: 'POST', keepalive: true }).catch(() => {})
        } catch {
            // ignore
        }
    }, [slug])

    return null
}
