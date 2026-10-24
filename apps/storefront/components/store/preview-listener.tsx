'use client'

import { useEffect } from 'react'
import { fontScalePercent, googleFontsHref } from '@/lib/fonts'

/**
 * Applies UNSAVED theme values sent by the Editor, so a merchant sees a colour
 * change as they drag the picker. Theme values are CSS custom properties, so this
 * needs no re-render.
 *
 * They go on `.storefront-root`, not <html>: that element declares every --sf-*
 * variable itself (storefront.css, plus the saved theme inline from the layout), so
 * a value set higher up is always overridden and the preview never changes.
 *
 * A font is only real once its webfont is loaded, so a newly picked family is
 * fetched from Google Fonts the same way the layout fetches the saved ones.
 *
 * Containment, all three of which are required:
 *   1. It only mounts inside an iframe. A visitor is never framed (CSP
 *      frame-ancestors 'self'), so for them this listener never activates at all.
 *   2. It only accepts messages from this app's own origin, where the Editor lives.
 *   3. It only ever sets --sf-* properties, and only values matching a plain
 *      colour/font/length. It can never inject markup or script.
 */
const FONT_FALLBACK: Record<string, string> = { 'font-heading': 'serif', 'font-body': 'sans-serif' }

export default function PreviewListener() {
    useEffect(() => {
        // Not framed => not a preview => do nothing at all.
        if (typeof window === 'undefined' || window.parent === window) return

        const origin = window.location.origin
        const SAFE = /^(#[0-9a-fA-F]{3,8}|[A-Za-z0-9 ]{1,60}|\d{1,3}(px|rem|em|%)?|\d(\.\d+)?)$/

        function onMessage(e: MessageEvent) {
            if (e.origin !== origin) return
            const data = e.data
            if (!data || data.type !== 'mcloud:theme' || typeof data.values !== 'object') return

            const roots = Array.from(document.querySelectorAll<HTMLElement>('.storefront-root'))
            const targets = roots.length ? roots : [document.documentElement]
            const fonts: string[] = []

            for (const [key, value] of Object.entries(data.values as Record<string, unknown>)) {
                if (typeof value !== 'string') continue
                if (value.length > 60 || /[;{}<>()\\"']/.test(value)) continue
                if (!SAFE.test(value)) continue
                // Only ever --sf-*. Nothing else is writable.
                if (!/^[a-z-]+$/.test(key)) continue
                // The layout writes fonts as a quoted family plus a generic fallback.
                const css = FONT_FALLBACK[key] ? `'${value}', ${FONT_FALLBACK[key]}` : value
                if (FONT_FALLBACK[key]) fonts.push(value)
                for (const t of targets) t.style.setProperty(`--sf-${key}`, css)
                // Text is sized in rem, so the scale lives on <html> (as the layout does).
                if (key === 'font-scale') {
                    const pct = fontScalePercent(value)
                    document.documentElement.style.fontSize = `${pct ?? 100}%`
                }
            }

            const href = googleFontsHref(fonts)
            let link = document.getElementById('mcloud-preview-fonts') as HTMLLinkElement | null
            if (href && link?.href !== href) {
                if (!link) {
                    link = document.createElement('link')
                    link.id = 'mcloud-preview-fonts'
                    link.rel = 'stylesheet'
                    document.head.appendChild(link)
                }
                link.href = href
            }
        }

        window.addEventListener('message', onMessage)
        // Tell the parent we are ready for values.
        window.parent.postMessage({ type: 'mcloud:preview-ready' }, origin)
        return () => window.removeEventListener('message', onMessage)
    }, [])

    return null
}
