'use client'

import { useEffect } from 'react'

/**
 * The preview's half of the Editor. The preview DISPLAYS; every edit happens in the
 * Editor's sidebar. So this only:
 *
 *   out: a click on a section  -> the Editor opens that section
 *   out: scroll position       -> replayed into the next preview after a change
 *   out: Ctrl+S / Ctrl+Z       -> focus in the frame would otherwise swallow them
 *   in:  select-section        -> outline it (and scroll to it)
 *   in:  scroll-to             -> land where the merchant was
 *   in:  show-slide            -> page the hero carousel to the slide being edited
 *
 * Nothing is layered over the page (no toolbars, no editable regions), so nothing
 * can sit between the merchant's click and the page.
 *
 * Containment, as PreviewListener: it only acts inside a frame (CSP frame-ancestors
 * 'self' means only this app can frame it), and it talks only to this app's own
 * origin, in both directions.
 */
export default function EditorBridge() {
    useEffect(() => {
        if (typeof window === 'undefined' || window.parent === window) return

        const STYLE_ID = 'mcloud-editor-bridge'
        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style')
            style.id = STYLE_ID
            // Outlines draw outside layout and take no clicks.
            style.textContent = `
                [data-mcloud-section] { cursor: pointer; }
                [data-mcloud-section]:hover { outline: 2px dashed rgba(99,102,241,.45); outline-offset: -2px; }
                [data-mcloud-section][data-mcloud-selected] { outline: 2px solid #6366f1; outline-offset: -2px; }
            `
            document.head.appendChild(style)
        }

        const origin = window.location.origin

        function post(msg: Record<string, unknown>) {
            window.parent.postMessage(msg, origin)
        }

        function select(index: number): Element | null {
            document.querySelectorAll('[data-mcloud-selected]').forEach((n) => n.removeAttribute('data-mcloud-selected'))
            const el = document.querySelector(`[data-mcloud-section="${index}"]`)
            el?.setAttribute('data-mcloud-selected', '')
            return el
        }

        // Capture phase, so a link or button never acts first: the preview is for
        // looking, and leaving the page (or opening a donate dialog) mid-edit is the
        // thing to prevent. The hero's dots are the exception: paging the carousel
        // is how the merchant sees each slide.
        function onClick(e: MouseEvent) {
            if (!(e.target instanceof Element)) return
            if (e.target.closest('.sf-hero__dot')) return
            e.preventDefault()
            e.stopPropagation()
            const host = e.target.closest('[data-mcloud-section]')
            const index = Number(host?.getAttribute('data-mcloud-section'))
            if (!host || !Number.isInteger(index)) return
            select(index)
            post({ type: 'mcloud:section-click', index })
        }

        // A form can still be submitted from the keyboard.
        function onSubmit(e: Event) {
            e.preventDefault()
            e.stopPropagation()
        }

        let scrollFrame = 0
        function onScroll() {
            if (scrollFrame) return
            scrollFrame = requestAnimationFrame(() => {
                scrollFrame = 0
                post({ type: 'mcloud:scroll', y: window.scrollY })
            })
        }

        function onShortcut(e: KeyboardEvent) {
            if (!(e.metaKey || e.ctrlKey) || e.altKey) return
            const k = e.key.toLowerCase()
            if (k === 's') post({ type: 'mcloud:shortcut', key: 'save' })
            else if (k === 'z') post({ type: 'mcloud:shortcut', key: e.shiftKey ? 'redo' : 'undo' })
            else if (k === 'y') post({ type: 'mcloud:shortcut', key: 'redo' })
            else return
            e.preventDefault()
        }

        function onMessage(e: MessageEvent) {
            if (e.origin !== origin || !e.data) return
            const data = e.data

            if (data.type === 'mcloud:select-section' && Number.isInteger(data.index)) {
                // -1 clears the outline; `scroll: false` re-applies it in place.
                const el = select(data.index)
                if (data.scroll !== false) el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            } else if (data.type === 'mcloud:scroll-to' && typeof data.y === 'number' && Number.isFinite(data.y)) {
                window.scrollTo({ top: data.y, behavior: 'instant' as ScrollBehavior })
            } else if (data.type === 'mcloud:show-slide' && Number.isInteger(data.index)) {
                document.querySelector<HTMLElement>(`.sf-hero__dot[data-index="${data.index}"]`)?.click()
            }
        }

        document.addEventListener('click', onClick, true)
        document.addEventListener('submit', onSubmit, true)
        document.addEventListener('keydown', onShortcut, true)
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('message', onMessage)

        // `from: 'bridge'` tells the Editor this page can now take scroll and selection.
        post({ type: 'mcloud:preview-ready', from: 'bridge' })

        return () => {
            document.removeEventListener('click', onClick, true)
            document.removeEventListener('submit', onSubmit, true)
            document.removeEventListener('keydown', onShortcut, true)
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('message', onMessage)
            if (scrollFrame) cancelAnimationFrame(scrollFrame)
        }
    }, [])

    return null
}
