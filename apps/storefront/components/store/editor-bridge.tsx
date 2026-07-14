'use client'

import { useEffect } from 'react'

/**
 * Two-way link between the Editor's rail and this preview.
 *
 *   out: click a section here  -> the rail opens that section's drawer
 *   in:  select a section there -> this scrolls to it and outlines it
 *
 * Deliberately NOT a writer. It never mutates content, never injects markup, and
 * accepts exactly one inbound message whose worst case is scrolling the page.
 * That keeps click-to-select from widening the storefront's attack surface: the
 * dangerous version of this feature (contentEditable bound to the DOM) is a
 * separate project, gated on its own review.
 *
 * Containment matches PreviewListener:
 *   1. Only mounts inside an iframe. A real visitor is never framed, so this is
 *      inert for them.
 *   2. Validates event.origin against the admin origin, both directions.
 */
export default function EditorBridge({ adminOrigin }: { adminOrigin: string }) {
    useEffect(() => {
        // Not framed => not the Editor => do nothing at all.
        if (typeof window === 'undefined' || window.parent === window) return

        const STYLE_ID = 'mcloud-editor-bridge'
        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style')
            style.id = STYLE_ID
            // Hover shows a section is clickable; [data-mcloud-selected] marks the
            // one the rail is editing. outline (not border) so nothing reflows and
            // the merchant sees their real layout, not a shifted one.
            style.textContent = `
                [data-mcloud-section] { cursor: pointer; }
                [data-mcloud-section]:hover {
                    outline: 2px dashed rgba(99,102,241,.5);
                    outline-offset: -2px;
                }
                [data-mcloud-section][data-mcloud-selected] {
                    outline: 2px solid #6366f1;
                    outline-offset: -2px;
                }
            `
            document.head.appendChild(style)
        }

        function sectionAt(target: EventTarget | null): HTMLElement | null {
            if (!(target instanceof Element)) return null
            return target.closest('[data-mcloud-section]')
        }

        // OUT: a click anywhere inside a section selects it in the rail.
        function onClick(e: MouseEvent) {
            const el = sectionAt(e.target)
            if (!el) return
            const index = Number(el.getAttribute('data-mcloud-section'))
            if (!Number.isInteger(index)) return

            // The preview is for editing, not for shopping: a click that would
            // navigate away (or submit, or open the donate modal) would take the
            // merchant off the page they are editing.
            e.preventDefault()
            e.stopPropagation()

            select(index)
            window.parent.postMessage({ type: 'mcloud:section-click', index }, adminOrigin)
        }

        function select(index: number) {
            document
                .querySelectorAll('[data-mcloud-selected]')
                .forEach((n) => n.removeAttribute('data-mcloud-selected'))
            const el = document.querySelector(`[data-mcloud-section="${index}"]`)
            if (!el) return null
            el.setAttribute('data-mcloud-selected', '')
            return el
        }

        // IN: the rail selected a section, so scroll to it and outline it. The only
        // message this component accepts. Worst case: the page scrolls.
        function onMessage(e: MessageEvent) {
            if (e.origin !== adminOrigin) return
            const data = e.data
            if (!data || data.type !== 'mcloud:select-section') return
            if (!Number.isInteger(data.index)) return

            const el = select(data.index)
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }

        // Capture phase: get the click before a link or button handles it.
        document.addEventListener('click', onClick, true)
        window.addEventListener('message', onMessage)

        // Announce readiness on the same channel PreviewListener uses, so a reload
        // (which a copy edit triggers) restores BOTH the unsaved theme and the
        // selected-section outline.
        window.parent.postMessage({ type: 'mcloud:preview-ready' }, adminOrigin)

        return () => {
            document.removeEventListener('click', onClick, true)
            window.removeEventListener('message', onMessage)
        }
    }, [adminOrigin])

    return null
}
