'use client'

import { useEffect } from 'react'

/**
 * Applies UNSAVED theme values sent by the Editor, so a merchant sees a colour
 * change as they drag the picker. Theme values are CSS custom properties, so this
 * needs no re-render.
 *
 * Containment, all three of which are required:
 *   1. It only mounts inside an iframe. A real visitor is never framed by the
 *      admin, so for them this listener never activates at all.
 *   2. It validates event.origin against the admin origin. Anything else is ignored.
 *   3. It only ever sets --sf-* properties, and only values matching a plain
 *      colour/font/length. It can never inject markup or script.
 */
export default function PreviewListener({ adminOrigin }: { adminOrigin: string }) {
    useEffect(() => {
        // Not framed => not a preview => do nothing at all.
        if (typeof window === 'undefined' || window.parent === window) return

        const SAFE = /^(#[0-9a-fA-F]{3,8}|[A-Za-z0-9 ]{1,60}|\d{1,3}(px|rem|em|%)?|\d(\.\d+)?)$/

        function onMessage(e: MessageEvent) {
            if (e.origin !== adminOrigin) return
            const data = e.data
            if (!data || data.type !== 'mcloud:theme' || typeof data.values !== 'object') return

            for (const [key, value] of Object.entries(data.values as Record<string, unknown>)) {
                if (typeof value !== 'string') continue
                if (value.length > 60 || /[;{}<>()\\"']/.test(value)) continue
                if (!SAFE.test(value)) continue
                // Only ever --sf-*. Nothing else is writable.
                if (!/^[a-z-]+$/.test(key)) continue
                document.documentElement.style.setProperty(`--sf-${key}`, value)
            }
        }

        window.addEventListener('message', onMessage)
        // Tell the parent we are ready for values.
        window.parent.postMessage({ type: 'mcloud:preview-ready' }, adminOrigin)
        return () => window.removeEventListener('message', onMessage)
    }, [adminOrigin])

    return null
}
