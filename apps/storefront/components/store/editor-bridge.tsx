'use client'

import { useEffect } from 'react'

/**
 * Click-to-edit, and the two-way link between the Editor's rail and this preview.
 *
 *   out: click a section here    -> the rail opens that section's drawer
 *   out: edit a heading here     -> the rail's field updates
 *   in:  select a section there  -> this scrolls to it and outlines it
 *
 * Containment (all of it required, and it matches PreviewListener):
 *   1. Only mounts inside an iframe. A real visitor is never framed by the admin,
 *      so for them this component does nothing at all — no editing, no listeners.
 *   2. Validates event.origin against the admin origin, both directions.
 *   3. Edits are PLAIN TEXT only. Paste is intercepted and flattened, and the
 *      value is read with textContent, never innerHTML, so nothing typed or pasted
 *      into the preview can inject markup. Editing here changes only what is sent
 *      to the parent; it never writes to the database on its own.
 */
export default function EditorBridge({ adminOrigin }: { adminOrigin: string }) {
    useEffect(() => {
        // Not framed => not the Editor => do nothing at all.
        if (typeof window === 'undefined' || window.parent === window) return

        const STYLE_ID = 'mcloud-editor-bridge'
        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style')
            style.id = STYLE_ID
            style.textContent = `
                [data-mcloud-section] { cursor: pointer; }
                [data-mcloud-section]:hover {
                    outline: 2px dashed rgba(99,102,241,.35);
                    outline-offset: -2px;
                }
                [data-mcloud-section][data-mcloud-selected] {
                    outline: 2px solid #6366f1;
                    outline-offset: -2px;
                }
                /* An editable field advertises itself on hover, and shows a real
                   text caret rather than the section's pointer. */
                [data-mcloud-field], [data-mcloud-setting], [data-mcloud-key] {
                    cursor: text;
                    border-radius: 2px;
                    transition: background-color .12s, box-shadow .12s;
                }
                [data-mcloud-field]:hover,
                [data-mcloud-setting]:hover,
                [data-mcloud-key]:hover {
                    background-color: rgba(99,102,241,.08);
                    box-shadow: 0 0 0 4px rgba(99,102,241,.08);
                }
                [contenteditable="true"] {
                    background-color: rgba(99,102,241,.10);
                    box-shadow: 0 0 0 4px rgba(99,102,241,.10);
                    outline: none;
                }
                /* An empty field is invisible and therefore unclickable. In the
                   editor it needs a target and a prompt. */
                [data-mcloud-setting]:empty::before,
                [data-mcloud-key]:empty::before,
                [data-mcloud-field]:empty::before {
                    content: 'Click to add';
                    opacity: .45;
                    font-style: italic;
                }
            `
            document.head.appendChild(style)
        }

        function sectionIndexOf(el: Element): number | null {
            const host = el.closest('[data-mcloud-section]')
            if (!host) return null
            const i = Number(host.getAttribute('data-mcloud-section'))
            return Number.isInteger(i) ? i : null
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

        const EDITABLE = '[data-mcloud-field],[data-mcloud-setting],[data-mcloud-key]'

        /**
         * Send an edited value up to the Editor.
         *
         * THREE channels, because copy lives in three shapes and each saves through a
         * different action:
         *
         *   data-mcloud-field    section config     pages.sections[i].settings[field]
         *   data-mcloud-setting  store setting      stores.settings[key]
         *   data-mcloud-list/... repeated record    stores.settings[list][i][key]
         *
         * THE TRAP, common to all three: a value renders through `| default:` or falls
         * back to store.name, so a field with NO stored value still SHOWS text. If we
         * reported textContent, then clicking into a heading and clicking away would
         * "save" the default as though the merchant had typed it — baking it in
         * permanently and killing the fallback, with no way to undo it.
         *
         * So every editable element carries its STORED value (data-mcloud-stored,
         * empty when unset) and we diff against THAT, never against what is displayed.
         * Clearing a field reports '', which the template correctly re-defaults.
         * Merely focusing and leaving reports nothing at all.
         */
        function commit(el: HTMLElement) {
            // Only text the merchant actually TYPED. Without this, contentEditable's
            // own whitespace normalisation fires `input` on focus, and a defaulted
            // field (displays "Programs", stores "") would report the default as a
            // real edit the moment it was clicked. See `typed` above.
            if (!typed.has(el)) return

            const stored = el.getAttribute('data-mcloud-stored') ?? ''
            // textContent, never innerHTML: an edit can never carry markup upward.
            const next = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
            if (next === stored) return          // nothing actually changed

            const list = el.getAttribute('data-mcloud-list')
            const key = el.getAttribute('data-mcloud-key')
            const setting = el.getAttribute('data-mcloud-setting')
            const field = el.getAttribute('data-mcloud-field')

            let msg: Record<string, unknown> | null = null

            if (list && key) {
                const i = Number(el.getAttribute('data-mcloud-index'))
                if (!Number.isInteger(i)) return
                msg = { type: 'mcloud:item-edit', list, index: i, key, value: next }
            } else if (setting) {
                msg = { type: 'mcloud:setting-edit', key: setting, value: next }
            } else if (field) {
                const index = sectionIndexOf(el)
                if (index === null) return
                msg = { type: 'mcloud:field-edit', index, field, value: next }
            }
            if (!msg) return

            el.setAttribute('data-mcloud-stored', next)
            window.parent.postMessage(msg, adminOrigin)
        }

        /**
         * Did the merchant actually TYPE in this field, or did they merely click into
         * it and leave?
         *
         * This is load-bearing, and the reason is subtle enough that it survived the
         * first design: making an element contentEditable causes the browser to
         * normalise its whitespace, which fires `input` on its own. A defaulted
         * heading DISPLAYS "Programs" while storing "", so that phantom input looked
         * like a real change from "" to "Programs" — and reported the default as if
         * the merchant had typed it. One click, and the fallback is gone forever.
         *
         * A commit therefore requires a real keystroke or paste, not just a DOM diff.
         */
        const typed = new WeakSet<HTMLElement>()

        function beginEdit(el: HTMLElement) {
            if (el.getAttribute('contenteditable') === 'true') return
            el.setAttribute('contenteditable', 'true')
            el.setAttribute('spellcheck', 'false')
            el.focus()

            // Put the caret at the end rather than selecting everything, so a click
            // lands where the merchant clicked.
            const range = document.createRange()
            range.selectNodeContents(el)
            range.collapse(false)
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(range)
        }

        function endEdit(el: HTMLElement) {
            el.removeAttribute('contenteditable')
            el.removeAttribute('spellcheck')
            typed.delete(el)
        }

        // ── Click ─────────────────────────────────────────────────────────────────
        function onClick(e: MouseEvent) {
            if (!(e.target instanceof Element)) return

            const field = e.target.closest<HTMLElement>(EDITABLE)
            const index = sectionIndexOf(e.target)
            if (index === null) return

            // The preview is for editing, not for shopping: a click that would
            // navigate away (or submit, or open the donate modal) would take the
            // merchant off the page they are editing.
            e.preventDefault()
            e.stopPropagation()

            select(index)
            window.parent.postMessage({ type: 'mcloud:section-click', index }, adminOrigin)

            if (field) beginEdit(field)
        }

        // ── Editing ───────────────────────────────────────────────────────────────

        // `beforeinput` fires only for a REAL user edit (a keystroke, a paste, a
        // delete) — never for the whitespace normalisation the browser performs when
        // an element becomes contentEditable. That distinction is what stops a
        // defaulted field from reporting its default the instant it is clicked.
        function onBeforeInput(e: Event) {
            const el = (e.target as Element)?.closest<HTMLElement>(EDITABLE)
            if (el?.getAttribute('contenteditable') === 'true') typed.add(el)
        }

        function onInput(e: Event) {
            const el = (e.target as Element)?.closest<HTMLElement>(EDITABLE)
            if (el?.getAttribute('contenteditable') === 'true') commit(el)
        }

        function onBlur(e: FocusEvent) {
            const el = (e.target as Element)?.closest<HTMLElement>(EDITABLE)
            if (!el) return
            commit(el)
            endEdit(el)
        }

        function onKeyDown(e: KeyboardEvent) {
            const el = (e.target as Element)?.closest<HTMLElement>(EDITABLE)
            if (!el || el.getAttribute('contenteditable') !== 'true') return

            // A heading is one line. Enter commits rather than inserting a <br>.
            if (e.key === 'Enter') {
                e.preventDefault()
                el.blur()
            }
            // Escape gives up the edit. The rail still holds the last committed
            // value, so this is "stop typing", not "undo everything".
            if (e.key === 'Escape') {
                e.preventDefault()
                el.blur()
            }
        }

        // Paste as PLAIN TEXT. Without this, pasting from a word processor drops
        // styled markup straight into the merchant's heading.
        function onPaste(e: ClipboardEvent) {
            const el = (e.target as Element)?.closest<HTMLElement>(EDITABLE)
            if (!el || el.getAttribute('contenteditable') !== 'true') return
            e.preventDefault()
            const text = (e.clipboardData?.getData('text/plain') ?? '').replace(/\s+/g, ' ')
            document.execCommand('insertText', false, text)
        }

        // ── IN: the rail selected a section ───────────────────────────────────────
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
        document.addEventListener('beforeinput', onBeforeInput, true)
        document.addEventListener('input', onInput, true)
        document.addEventListener('blur', onBlur, true)
        document.addEventListener('keydown', onKeyDown, true)
        document.addEventListener('paste', onPaste, true)
        window.addEventListener('message', onMessage)

        // Announce readiness on the channel PreviewListener uses, so a reload (which
        // a copy edit triggers) restores the unsaved theme AND the selection.
        window.parent.postMessage({ type: 'mcloud:preview-ready' }, adminOrigin)

        return () => {
            document.removeEventListener('click', onClick, true)
            document.removeEventListener('beforeinput', onBeforeInput, true)
            document.removeEventListener('input', onInput, true)
            document.removeEventListener('blur', onBlur, true)
            document.removeEventListener('keydown', onKeyDown, true)
            document.removeEventListener('paste', onPaste, true)
            window.removeEventListener('message', onMessage)
        }
    }, [adminOrigin])

    return null
}
