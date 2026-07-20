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

                /* THE HERO PROBLEM: its content layer is absolutely positioned across
                   the whole section, so it ate every click before one could reach the
                   background image behind it. The image was correctly marked, and
                   completely unclickable — markup alone does not make a feature.

                   So in the editor the overlay stops taking pointer events and hands
                   them through to the image, while the things a merchant ACTUALLY
                   clicks (the text, the button) take them back. Clicking empty space
                   in the hero now reaches the background. */
                /* Everything layered over the hero's background stops intercepting
                   clicks... */
                .sf-hero > div,
                .sf-hero__content,
                .sf-hero__slide > div:not([data-mcloud-image]) {
                    pointer-events: none;
                }
                /* ...the background itself takes them... */
                .sf-hero [data-mcloud-image] {
                    pointer-events: auto;
                }
                /* ...and so does the whole text CARD. This is the fix for "clicking
                   the heading opens image settings": making only the text glyphs
                   clickable meant a click in the card's padding, or in the gaps
                   between/around the text, fell THROUGH the content layer to the
                   image behind it (the real e.target became the <img>). Making the
                   card itself an island of pointer-events restores clicks anywhere on
                   it to the text/card, while genuinely empty hero space (outside the
                   card) still reaches the background image to change it. */
                .sf-hero .sf-hero-card {
                    pointer-events: auto;
                }
                /* ...and so do the individual things a merchant clicks. */
                .sf-hero [data-mcloud-field],
                .sf-hero [data-mcloud-setting],
                .sf-hero [data-mcloud-key],
                .sf-hero button,
                .sf-hero a,
                .sf-hero .sf-hero__dot {
                    pointer-events: auto;
                }
                /* THE CAROUSEL TRAP: a multi-slide hero stacks every slide
                   absolute inset-0; inactive slides are hidden with
                   `opacity-0 pointer-events-none`, and the LAST slide paints on top.
                   But the editable/image rules above re-enable pointer-events on the
                   marked elements INSIDE those hidden slides, so a click on the
                   visible slide's heading actually lands on a hidden slide's <img>
                   stacked over it (e.target === that IMG → "image settings", and the
                   real heading never edits). A single-slide hero (e.g. an NGO's) has
                   nothing stacked, so it worked — which is why one hero edited and an
                   otherwise-identical one did not. Force every descendant of an
                   inactive slide back to inert so only the ACTIVE slide is clickable. */
                .sf-hero .sf-hero__slide.pointer-events-none,
                .sf-hero .sf-hero__slide.pointer-events-none * {
                    pointer-events: none !important;
                }

                /* An image gets a picker, not a caret, so it must not look typeable. */
                [data-mcloud-image] {
                    cursor: pointer;
                    position: relative;
                }
                [data-mcloud-image]:hover {
                    outline: 2px solid #6366f1;
                    outline-offset: -2px;
                }
                [data-mcloud-image]:hover::after {
                    content: 'Change image';
                    position: absolute;
                    inset: auto 0 0 0;
                    padding: 6px 10px;
                    font: 500 12px/1.2 system-ui, sans-serif;
                    color: #fff;
                    background: rgba(17,17,27,.75);
                    text-align: center;
                }
                /* An empty image slot has nothing to show, so it must announce itself
                   or the merchant cannot tell there is anything there to click. */
                [data-mcloud-image][data-mcloud-stored=""]::before {
                    content: 'Add an image';
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font: 500 13px/1.2 system-ui, sans-serif;
                    opacity: .5;
                }

                #mcloud-op-toolbar {
                    position: fixed;
                    z-index: 2147483647;
                    display: none;
                    gap: 4px;
                    padding: 4px;
                    background: #11111b;
                    border-radius: 8px;
                    box-shadow: 0 4px 14px rgba(0,0,0,.35);
                    /* the BAR ignores clicks; only its buttons take them, so it
                       can never eat a click meant for the content beneath. */
                    pointer-events: none;
                }
                #mcloud-op-toolbar button {
                    pointer-events: auto;
                    width: 28px; height: 28px;
                    display: grid; place-items: center;
                    border: 0; border-radius: 6px;
                    background: transparent; color: #fff;
                    font: 600 14px/1 system-ui, sans-serif; cursor: pointer;
                }
                #mcloud-op-toolbar button:hover { background: rgba(255,255,255,.14); }
            `
            document.head.appendChild(style)
        }

        function sectionIndexOf(el: Element): number | null {
            const host = el.closest('[data-mcloud-section]')
            if (!host) return null
            const i = Number(host.getAttribute('data-mcloud-section'))
            return Number.isInteger(i) ? i : null
        }

        // ── Hover overlay toolbar ────────────────────────────────────────────────
        //
        // Hovering a section or a record shows a small floating bar with structural
        // ops (move / duplicate / delete / add). The bar itself never intercepts a
        // click — see the hero lesson above: the same failure mode (an overlay
        // eating clicks meant for what's beneath it) applies here, just one layer
        // up, over the whole section instead of one image. Only the buttons take
        // pointer events; the bar between them is a pass-through.
        function post(msg: Record<string, unknown>) {
            window.parent.postMessage(msg, adminOrigin)
        }

        const toolbar = document.createElement('div')
        toolbar.id = 'mcloud-op-toolbar'
        toolbar.innerHTML =
            '<button data-op="up" title="Move up">↑</button>' +
            '<button data-op="down" title="Move down">↓</button>' +
            '<button data-op="dup" title="Duplicate">⧉</button>' +
            '<button data-op="del" title="Delete">🗑</button>' +
            '<button data-op="add" title="Add below">＋</button>'
        document.body.appendChild(toolbar)

        // The element the toolbar currently acts on: either a section or a record.
        let hovered: HTMLElement | null = null

        function targetOf(el: Element): HTMLElement | null {
            // A record wins over its section: the more specific handle.
            return el.closest<HTMLElement>('[data-mcloud-record]')
                ?? el.closest<HTMLElement>('[data-mcloud-section]')
        }

        function showToolbarFor(el: HTMLElement) {
            hovered = el
            const r = el.getBoundingClientRect()
            toolbar.style.display = 'flex'
            // top-right of the element, clamped into the viewport.
            toolbar.style.top = `${Math.max(4, r.top + 4)}px`
            toolbar.style.left = `${Math.min(window.innerWidth - 160, r.right - 160)}px`
        }

        function onOver(e: Event) {
            if (!(e.target instanceof Element)) return
            const t = targetOf(e.target)
            if (t) showToolbarFor(t)
        }
        function onOut(e: Event) {
            // Hide only when leaving to something that is neither the toolbar nor a target.
            const to = (e as MouseEvent).relatedTarget
            if (to instanceof Element && (to.closest('#mcloud-op-toolbar') || targetOf(to))) return
            toolbar.style.display = 'none'
            hovered = null
        }

        function toolbarIndexOf(el: HTMLElement): number {
            return Number(el.getAttribute('data-mcloud-index') ?? el.getAttribute('data-mcloud-section'))
        }

        function onToolbarClick(e: MouseEvent) {
            const btn = (e.target as Element)?.closest<HTMLButtonElement>('button[data-op]')
            if (!btn || !hovered) return
            e.preventDefault(); e.stopPropagation()

            const isRecord = hovered.hasAttribute('data-mcloud-record')
            const index = toolbarIndexOf(hovered)
            if (!Number.isInteger(index)) return
            const op = btn.getAttribute('data-op')

            if (isRecord) {
                const list = hovered.getAttribute('data-mcloud-list')
                if (!list) return
                if (op === 'up') post({ type: 'mcloud:item-op', op: 'move', list, index, to: index - 1 })
                else if (op === 'down') post({ type: 'mcloud:item-op', op: 'move', list, index, to: index + 1 })
                else if (op === 'dup') post({ type: 'mcloud:item-op', op: 'duplicate', list, index })
                else if (op === 'del') post({ type: 'mcloud:item-op', op: 'delete', list, index })
                else if (op === 'add') post({ type: 'mcloud:item-op', op: 'add', list, index: index + 1 })
            } else {
                if (op === 'up') post({ type: 'mcloud:section-op', op: 'move', index, to: index - 1 })
                else if (op === 'down') post({ type: 'mcloud:section-op', op: 'move', index, to: index + 1 })
                else if (op === 'dup') post({ type: 'mcloud:section-op', op: 'duplicate', index })
                else if (op === 'del') post({ type: 'mcloud:section-op', op: 'delete', index })
                else if (op === 'add') post({ type: 'mcloud:section-add-requested', index: index + 1 })
            }
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

        function beginEdit(el: HTMLElement, placeCaret: boolean) {
            if (el.getAttribute('contenteditable') === 'true') return
            el.setAttribute('contenteditable', 'true')
            el.setAttribute('spellcheck', 'false')
            el.focus()

            // When we begin on mousedown, the browser's OWN mouseup places the caret
            // exactly where the merchant pressed — forcing a range here would fight it.
            // We only place a caret ourselves when there is no native click to do it
            // (i.e. a programmatic begin), collapsing to the end.
            if (!placeCaret) return
            const range = document.createRange()
            range.selectNodeContents(el)
            range.collapse(false)
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(range)
        }

        // ── Mousedown: begin editing a text field BEFORE the browser's native focus
        // and caret logic runs on this press. If we waited for `click`, the element
        // was still non-editable at mousedown, so the browser never started a text
        // selection in it — the field would flip to contenteditable but show no caret
        // and refuse typing (works when triggered synthetically, fails on real mouse
        // clicks). Making it editable on mousedown lets the SAME press's mouseup drop
        // the caret where the merchant clicked. Images/sections are still handled on
        // `click` (they need no caret).
        function onMouseDown(e: MouseEvent) {
            if (!(e.target instanceof Element)) return
            if (e.button !== 0) return
            const targetField = e.target.closest<HTMLElement>(EDITABLE)
            if (!targetField) return
            // An image slot is not a text field; it opens the picker on click.
            if (e.target.closest('[data-mcloud-image]')) return
            if (sectionIndexOf(e.target) === null) return
            beginEdit(targetField, false)
        }

        function endEdit(el: HTMLElement) {
            el.removeAttribute('contenteditable')
            el.removeAttribute('spellcheck')
            typed.delete(el)
        }

        // ── Click ─────────────────────────────────────────────────────────────────
        function onClick(e: MouseEvent) {
            if (!(e.target instanceof Element)) return

            // Resolve what the merchant clicked from the event target itself. This
            // is coordinate-free, so it works for every click (mouse, keyboard,
            // synthetic) — unlike elementsFromPoint, which needs real clientX/Y.
            //
            // An editable field wins over the background image: the hero's image is
            // a full-bleed layer BEHIND the text, so when the target sits inside BOTH
            // an editable field and the image markup, the merchant meant the text.
            // Only a click whose target is the image (and NOT an editable field) opens
            // the picker — that is a click on the bare hero background.
            const targetField = e.target.closest<HTMLElement>(EDITABLE)
            const targetImage = e.target.closest<HTMLElement>('[data-mcloud-image]')
            const field = targetField
            const image = targetField ? null : targetImage

            const index = sectionIndexOf(e.target)
            if (index === null) return

            // The preview is for editing, not for shopping: a click that would
            // navigate away (or submit, or open the donate modal) would take the
            // merchant off the page they are editing.
            e.preventDefault()
            e.stopPropagation()

            select(index)
            window.parent.postMessage({ type: 'mcloud:section-click', index }, adminOrigin)

            // An image has no text to type into, so it gets a picker rather than a
            // caret. The ADMIN owns that UI: it holds the merchant's session and the
            // upload credentials, and the public storefront must never be the thing
            // prompting for or uploading a file. So this only REPORTS the click, and
            // the admin decides what to ask for.
            if (image) {
                window.parent.postMessage(
                    {
                        type: 'mcloud:image-click',
                        // Whichever addressing the snippet emitted; the admin routes on it.
                        setting: image.getAttribute('data-mcloud-setting'),
                        list: image.getAttribute('data-mcloud-list'),
                        index: image.getAttribute('data-mcloud-index'),
                        key: image.getAttribute('data-mcloud-key'),
                        value: image.getAttribute('data-mcloud-stored') ?? '',
                    },
                    adminOrigin,
                )
                return
            }

            // Usually mousedown already began the edit (so the caret landed where the
            // merchant clicked); this covers any click with no matching mousedown
            // (keyboard activation, synthetic). Place a caret ourselves in that case.
            if (field) beginEdit(field, true)
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
            if (!data) return

            if (data.type === 'mcloud:select-section' && Number.isInteger(data.index)) {
                const el = select(data.index)
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                return
            }

            // ── IN: the rail reordered a section ─────────────────────────────────
            //
            // Shuffle the existing DOM nodes in place instead of waiting for an
            // iframe reload, so a drag/move in the rail feels instant here too.
            if (data.type === 'mcloud:reorder-preview' && Number.isInteger(data.from) && Number.isInteger(data.to)) {
                const nodes = Array.from(document.querySelectorAll('[data-mcloud-section]'))
                const from = nodes[data.from]
                const parent = from?.parentNode
                if (!from || !parent) return
                const ref = data.to >= nodes.length ? null : nodes[data.to]
                parent.insertBefore(from, data.to > data.from ? (ref?.nextSibling ?? null) : ref)
                // Re-index so later clicks address the right section.
                Array.from(parent.querySelectorAll('[data-mcloud-section]'))
                    .forEach((n, i) => n.setAttribute('data-mcloud-section', String(i)))
            }

            // ── IN: a repeated record was reordered ──────────────────────────────
            //
            // Same idea as a section move, scoped to one list: shuffle that list's
            // record nodes in place so a record reorder feels instant too, instead
            // of waiting for the full reload. `list` picks the record set; from/to
            // are indices within it.
            if (
                data.type === 'mcloud:reorder-preview-item' &&
                typeof data.list === 'string' &&
                Number.isInteger(data.from) &&
                Number.isInteger(data.to)
            ) {
                const listEsc = CSS.escape(data.list)
                const recordSel = `[data-mcloud-record][data-mcloud-list="${listEsc}"]`
                const nodes = Array.from(document.querySelectorAll<HTMLElement>(recordSel))
                const from = nodes[data.from]
                const parent = from?.parentNode
                if (!from || !parent) return
                const ref = data.to >= nodes.length ? null : nodes[data.to]
                parent.insertBefore(from, data.to > data.from ? (ref?.nextSibling ?? null) : ref)
                // Re-index in DOM order. Both the record container AND the editable
                // fields inside it carry their own data-mcloud-index (commit() reads
                // the field's own attribute, not the container's via closest()), so
                // BOTH must be renumbered or a later text/image edit on this list
                // would address the wrong record.
                Array.from(document.querySelectorAll<HTMLElement>(recordSel)).forEach((rec, i) => {
                    rec.setAttribute('data-mcloud-index', String(i))
                    rec
                        .querySelectorAll<HTMLElement>(`[data-mcloud-list="${listEsc}"][data-mcloud-index]`)
                        .forEach((f) => f.setAttribute('data-mcloud-index', String(i)))
                })
            }
        }

        // Capture phase: get the click before a link or button handles it.
        document.addEventListener('mousedown', onMouseDown, true)
        document.addEventListener('click', onClick, true)
        document.addEventListener('beforeinput', onBeforeInput, true)
        document.addEventListener('input', onInput, true)
        document.addEventListener('blur', onBlur, true)
        document.addEventListener('keydown', onKeyDown, true)
        document.addEventListener('paste', onPaste, true)
        window.addEventListener('message', onMessage)
        document.addEventListener('mouseover', onOver, true)
        document.addEventListener('mouseout', onOut, true)
        toolbar.addEventListener('click', onToolbarClick, true)

        // Announce readiness on the channel PreviewListener uses, so a reload (which
        // a copy edit triggers) restores the unsaved theme AND the selection.
        window.parent.postMessage({ type: 'mcloud:preview-ready' }, adminOrigin)

        return () => {
            document.removeEventListener('mousedown', onMouseDown, true)
            document.removeEventListener('click', onClick, true)
            document.removeEventListener('beforeinput', onBeforeInput, true)
            document.removeEventListener('input', onInput, true)
            document.removeEventListener('blur', onBlur, true)
            document.removeEventListener('keydown', onKeyDown, true)
            document.removeEventListener('paste', onPaste, true)
            window.removeEventListener('message', onMessage)
            document.removeEventListener('mouseover', onOver, true)
            document.removeEventListener('mouseout', onOut, true)
            toolbar.removeEventListener('click', onToolbarClick, true)
            toolbar.remove()
        }
    }, [adminOrigin])

    return null
}
