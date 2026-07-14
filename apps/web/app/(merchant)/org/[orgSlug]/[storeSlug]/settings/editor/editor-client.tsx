'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Palette, FileText, Layers } from 'lucide-react'
import { SECTION_REGISTRY } from '../../../../../../../../storefront/lib/sections'
import { THEME_SCHEMA } from '@/lib/theme-schema'
import { updateStoreTheme, updatePageSections, updateStoreSettings } from '../actions'
import SettingsFields from './settings-fields'
import ImagePicker from './image-picker'
import ContentClient from '../content/content-client'
import type { SettingField, SettingValues } from '@mcloud/verticals'

type Section = { type: string; settings?: SettingValues }

/**
 * A page's section `type` is whatever is stored in the DB, so it is a plain
 * string, not a SectionType. Look it up leniently: an unknown type (a section
 * retired from the registry, say) must render as an inert rail entry, never
 * crash the Editor.
 */
function sectionDef(type: string | undefined) {
    if (!type) return undefined
    return (SECTION_REGISTRY as Record<string, { label: string; schema?: readonly SettingField[] }>)[type]
}

// Three kinds of thing a merchant edits:
//   theme   -> store_themes columns (colours, fonts)
//   content -> stores.settings (mission, programs, campaigns). SP5's editor,
//              mounted here rather than living on its own nav tab.
//   section -> that section's own config (heading, eyebrow) in pages.sections
// `null` = drawer closed, preview at full width.
type Selection = { kind: 'theme' } | { kind: 'content' } | { kind: 'section'; index: number } | null

/**
 * What a template may edit in stores.settings from the preview. The message comes
 * from the framed storefront, so it is checked rather than trusted: an unexpected
 * key is dropped instead of being written blindly into the merchant's settings.
 * Must match the keys passed to the `editable-setting` / `editable-item` snippets.
 */
const EDITABLE_SETTINGS = new Set(['missionHeadline', 'mission'])
const EDITABLE_LISTS = new Set(['programs', 'campaigns', 'impactStats', 'heroSlides'])
/** Store settings that hold an IMAGE, so a click opens the picker. */
const EDITABLE_SETTINGS_IMAGE = new Set<string>([])

/** Where a picked image belongs: a store setting, or a field on a repeated record. */
type PickTarget =
    | { kind: 'setting'; key: string }
    | { kind: 'item'; list: string; index: number; key: string }

/**
 * The current value of a repeated list, ready to be edited.
 *
 * heroSlides is the special one, and it is the whole point of this function. The
 * hero used to be stored TWO ways — a heroSlides array, or flat heroTitle /
 * heroSubtitle / heroImage keys — and the template branched between them. A store
 * on the legacy shape has NO heroSlides, so an edit to heroSlides[0] would land in
 * an empty array and be dropped.
 *
 * So a legacy hero is normalised into a one-slide list the first time it is
 * touched. That is the seam where the old shape disappears: the storefront still
 * READS the flat keys (nothing breaks), but the moment a merchant edits, the store
 * is written in the new shape and the flat keys stop mattering.
 */
function listFor(
    list: string,
    draft: Record<string, unknown>,
    saved: Record<string, unknown>,
): unknown[] {
    // Already being edited in this session: that is the truth.
    if (Array.isArray(draft[list])) return [...(draft[list] as unknown[])]
    // Saved in the modern shape.
    if (Array.isArray(saved[list])) return [...(saved[list] as unknown[])]

    // A legacy hero: fold the flat keys into a single slide.
    if (list === 'heroSlides') {
        const s = (k: string) => (typeof saved[k] === 'string' ? (saved[k] as string) : '')
        return [{
            image: s('heroImage'),
            title: s('heroTitle'),
            subtitle: s('heroSubtitle'),
            accent: s('heroAccent'),
            buttonText: s('heroButtonText'),
        }]
    }
    return []
}

export default function EditorClient({
    slug, storeId, theme, sections: initialSections, previewToken, storefrontOrigin,
    commerce, storeSettings,
}: {
    slug: string
    storeId: string
    theme: Record<string, unknown>
    sections: Section[]
    previewToken: string
    storefrontOrigin: string
    /** From getVertical(store.type).commerce. A shop has no NGO content rail. */
    commerce: boolean
    /** stores.settings, for the Content rail (SP5's editor). */
    storeSettings: Record<string, unknown>
}) {
    const [selection, setSelection] = useState<Selection>(null)
    const [themeValues, setThemeValues] = useState<SettingValues>(() => ({ ...theme }))
    const [sections, setSections] = useState<Section[]>(() => initialSections)
    // stores.settings edited FROM THE PREVIEW (hero title, mission, programme
    // copy). The Content drawer writes the same table through its own action, so
    // this holds only what the preview changed and merges on save.
    const [storeDraft, setStoreDraft] = useState<Record<string, unknown>>({})
    // The image slot the merchant clicked in the preview, if any.
    const [picker, setPicker] = useState<{ target: PickTarget; value: string } | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)

    const iframeRef = useRef<HTMLIFrameElement>(null)

    // The message handler must NOT be torn down and rebuilt on every keystroke: a
    // preview reload landing between teardown and rebuild would miss its handshake,
    // and the merchant's unsaved theme would silently vanish. Refs let one stable
    // handler see current values.
    const themeRef = useRef(themeValues)
    themeRef.current = themeValues
    const selectionRef = useRef(selection)
    selectionRef.current = selection

    const postTheme = useCallback(() => {
        const win = iframeRef.current?.contentWindow
        if (!win) return
        const values: Record<string, string> = {}
        for (const f of THEME_SCHEMA) {
            const v = themeRef.current[f.id]
            if (typeof v === 'string' && v) values[cssVarName(f.id)] = v
            else if (typeof v === 'number') values[cssVarName(f.id)] = String(v)
        }
        // A cross-origin post to a frame that has not loaded yet simply lands
        // nowhere. That is fine: the preview announces itself when it mounts and we
        // replay on that handshake. A preview failure never blocks saving.
        try {
            win.postMessage({ type: 'mcloud:theme', values }, storefrontOrigin)
        } catch {
            // Preview is an aid, not a gate.
        }
    }, [storefrontOrigin])

    /** Tell the preview which section the rail is editing: scroll to it, outline it. */
    const postSelect = useCallback((index: number) => {
        const win = iframeRef.current?.contentWindow
        if (!win) return
        try {
            win.postMessage({ type: 'mcloud:select-section', index }, storefrontOrigin)
        } catch {
            // Preview is an aid, not a gate.
        }
    }, [storefrontOrigin])

    // Theme -> instant. These are CSS custom properties, so the preview needs no
    // re-render: post them and the listener sets them on documentElement.
    useEffect(() => { postTheme() }, [themeValues, postTheme])

    // The preview announces itself on mount (including after a debounced reload).
    // Two things must be replayed there, or a copy edit silently undoes them:
    //   - the unsaved theme (an in-progress colour would revert)
    //   - the selected section (its outline would vanish mid-edit)
    // It also reports clicks, which is the inbound half of the two-way sync.
    useEffect(() => {
        function onMessage(e: MessageEvent) {
            if (e.origin !== storefrontOrigin) return
            const data = e.data
            if (!data) return

            if (data.type === 'mcloud:preview-ready') {
                postTheme()
                const sel = selectionRef.current
                if (sel?.kind === 'section') postSelect(sel.index)
                return
            }

            if (data.type === 'mcloud:section-click' && Number.isInteger(data.index)) {
                // Trust the index only as far as it goes: one the rail does not have
                // is ignored rather than opening an empty drawer.
                if (data.index < 0 || data.index >= sections.length) return
                setSelection({ kind: 'section', index: data.index })
            }

            // ── The merchant typed into the preview itself ────────────────────────
            // Three channels, because copy lives in three places. Each folds into the
            // same state the drawer writes, so the two surfaces always agree.

            // 1. A section's own config -> pages.sections[i].settings
            if (data.type === 'mcloud:field-edit') {
                const { index, field, value } = data
                if (!Number.isInteger(index) || index < 0 || index >= sections.length) return
                if (typeof field !== 'string' || typeof value !== 'string') return

                // The edit came FROM the preview, which is already showing it. Reloading
                // the iframe would destroy the node being typed into and throw the caret
                // away mid-word, so this edit must not re-render the frame it came from.
                skipReloadRef.current = true

                setSections((prev) => {
                    const next = [...prev]
                    next[index] = {
                        ...next[index],
                        settings: { ...next[index].settings, [field]: value },
                    }
                    return next
                })
                setSaved(false)
            }

            // 2. A store setting -> stores.settings[key]  (hero title, mission …)
            if (data.type === 'mcloud:setting-edit') {
                const { key, value } = data
                if (typeof key !== 'string' || typeof value !== 'string') return
                // Only keys a template actually marked editable. An unexpected key is
                // ignored rather than written blindly into the merchant's settings.
                if (!EDITABLE_SETTINGS.has(key)) return

                setStoreDraft((prev) => ({ ...prev, [key]: value }))
                setSaved(false)
            }

            // An image slot was clicked. It has no text to type into, so the admin
            // opens a picker: the storefront never prompts for or receives a file.
            if (data.type === 'mcloud:image-click') {
                const { setting, list, index, key, value } = data
                if (setting && EDITABLE_SETTINGS_IMAGE.has(setting)) {
                    setPicker({ target: { kind: 'setting', key: setting }, value: String(value ?? '') })
                } else if (list && key && EDITABLE_LISTS.has(list)) {
                    const i = Number(index)
                    if (!Number.isInteger(i) || i < 0) return
                    setPicker({
                        target: { kind: 'item', list, index: i, key },
                        value: String(value ?? ''),
                    })
                }
            }

            // 3. A repeated record -> stores.settings[list][i][key]  (programs …)
            if (data.type === 'mcloud:item-edit') {
                const { list, index, key, value } = data
                if (typeof list !== 'string' || typeof key !== 'string') return
                if (typeof value !== 'string' || !Number.isInteger(index) || index < 0) return
                if (!EDITABLE_LISTS.has(list)) return

                setStoreDraft((prev) => {
                    // Reads the draft, else what was SAVED, else (for a legacy hero)
                    // normalises the flat keys into a slide. Reading only the draft would
                    // make the first edit to a list start from an empty array, dropping
                    // every other record in it on save.
                    const arr = listFor(list, prev, storeSettings)
                    // An index past the end means the preview and the draft have drifted
                    // (a record was removed in the drawer). Drop the edit rather than
                    // growing the array with a hole.
                    if (index >= arr.length) return prev
                    const item = arr[index]
                    if (typeof item !== 'object' || item === null) return prev
                    arr[index] = { ...(item as Record<string, unknown>), [key]: value }
                    return { ...prev, [list]: arr }
                })
                setSaved(false)
            }
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
    }, [storefrontOrigin, postTheme, postSelect, sections.length, storeSettings])

    /** Rail -> preview. */
    function selectSection(index: number) {
        setSelection({ kind: 'section', index })
        postSelect(index)
    }

    /**
     * Apply a picked image. It writes through the SAME store-settings draft the text
     * edits use — an image is just a string field whose editor is a picker rather
     * than a caret, so it needs no new save path.
     *
     * Unlike a text edit, this DOES let the iframe reload: the preview is not already
     * showing the new image, and there is no caret to protect.
     */
    function applyImage(url: string) {
        if (!picker) return
        const t = picker.target

        if (t.kind === 'setting') {
            setStoreDraft((prev) => ({ ...prev, [t.key]: url }))
        } else {
            setStoreDraft((prev) => {
                const arr = listFor(t.list, prev, storeSettings)
                if (t.index >= arr.length) return prev
                const item = arr[t.index]
                if (typeof item !== 'object' || item === null) return prev
                arr[t.index] = { ...(item as Record<string, unknown>), [t.key]: url }
                return { ...prev, [t.list]: arr }
            })
        }
        setSaved(false)
        setPicker(null)
    }

    // Is there anything to save? Compared against what the page loaded, so undoing an
    // edit by hand correctly makes the button go away again.
    const dirty =
        Object.keys(storeDraft).length > 0 ||
        JSON.stringify(sections) !== JSON.stringify(initialSections) ||
        THEME_SCHEMA.some((f) => (themeValues[f.id] ?? '') !== (theme[f.id] ?? ''))

    // Copy -> debounced reload. A copy change needs Liquid re-run server-side
    // (~1.6s warm), so reloading per keystroke is unusable. Wait for a pause.
    const previewSrc = useMemo(() => {
        const payload = toBase64Url(JSON.stringify(sections))
        return `${storefrontOrigin}/store/${slug}?preview=${encodeURIComponent(payload)}&token=${encodeURIComponent(previewToken)}`
    }, [sections, slug, previewToken, storefrontOrigin])

    // An edit made IN the preview is already visible there, so it must not reload
    // the frame; an edit made in the DRAWER must. Same state, two origins, and only
    // one of them needs a re-render.
    const skipReloadRef = useRef(false)
    const [debouncedSrc, setDebouncedSrc] = useState(previewSrc)
    useEffect(() => {
        if (skipReloadRef.current) {
            skipReloadRef.current = false
            return
        }
        const t = setTimeout(() => setDebouncedSrc(previewSrc), 400)
        return () => clearTimeout(t)
    }, [previewSrc])

    async function onSave() {
        setSaving(true)
        setError(null)

        const themePatch: Record<string, string> = {}
        for (const f of THEME_SCHEMA) {
            const v = themeValues[f.id]
            if (v !== undefined && v !== '') themePatch[f.id] = String(v)
        }

        const a = await updateStoreTheme(slug, themePatch)
        const b = sections.length ? await updatePageSections(slug, '', sections) : { error: null }

        // Copy edited in the preview that lives in stores.settings. Merged onto the
        // settings this page loaded, so keys the Editor never touched survive.
        const c = Object.keys(storeDraft).length
            ? await updateStoreSettings(slug, { settings: { ...storeSettings, ...storeDraft } as never })
            : { error: null }

        setSaving(false)
        const err = a.error ?? b.error ?? c.error
        // The draft is retained on failure: the merchant never loses typed copy.
        if (err) setError(err)
        else {
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        }
    }

    // `content` renders SP5's ContentClient instead of a schema form, so it needs
    // no schema here.
    const active =
        selection?.kind === 'theme'
            ? { label: 'Theme', schema: THEME_SCHEMA, values: themeValues as SettingValues }
            : selection?.kind === 'section'
                ? {
                    label: sectionDef(sections[selection.index]?.type)?.label ?? 'Section',
                    schema: sectionDef(sections[selection.index]?.type)?.schema ?? ([] as readonly SettingField[]),
                    values: sections[selection.index]?.settings ?? {},
                }
                : { label: 'Content', schema: [] as readonly SettingField[], values: {} as SettingValues }

    return (
        <div className="relative flex h-full min-h-0">

            {/* ── Rail: a list, nothing more. Picking something opens the drawer. ── */}
            <aside className="w-56 shrink-0 border-r border-[var(--md-sys-color-outline-variant)] overflow-y-auto p-3 space-y-4">
                <div className="space-y-1">
                    <RailItem
                        icon={<Palette className="w-4 h-4 shrink-0" />}
                        label="Theme"
                        active={selection?.kind === 'theme'}
                        onClick={() => setSelection({ kind: 'theme' })}
                    />
                    {/* SP5's store-settings content (mission, programs, impact stats,
                        contact, campaigns) lives in stores.settings, not in a section's
                        config, so no section schema covers it. It gets a rail entry
                        rather than its own nav tab. */}
                    {!commerce && (
                        <RailItem
                            icon={<FileText className="w-4 h-4 shrink-0" />}
                            label="Content"
                            active={selection?.kind === 'content'}
                            onClick={() => setSelection({ kind: 'content' })}
                        />
                    )}
                </div>

                <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--md-sys-color-on-surface-variant)] mb-2 px-2">
                        <Layers className="w-3.5 h-3.5" />
                        Sections
                    </p>
                    <div className="space-y-1">
                        {sections.length === 0 && (
                            <p className="px-2 text-[12px] text-[var(--md-sys-color-on-surface-variant)]">
                                This site uses the default layout. Nothing to configure yet.
                            </p>
                        )}
                        {sections.map((s, i) => (
                            <RailItem
                                key={i}
                                label={sectionDef(s.type)?.label ?? s.type}
                                active={selection?.kind === 'section' && selection.index === i}
                                onClick={() => selectSection(i)}
                            />
                        ))}
                    </div>
                </div>

                {sections.length > 0 && (
                    <p className="px-2 pt-1 text-[11px] leading-relaxed text-[var(--md-sys-color-on-surface-variant)]">
                        Click any heading in the preview to edit it directly.
                    </p>
                )}
            </aside>

            {/* Preview. A preview failure must never block saving, so a missing
                token degrades to a message rather than an error state. */}
            <div className="relative flex-1 min-w-0 bg-[var(--md-sys-color-surface-variant)] p-0.5">
                {/* Editing happens IN the preview now, so Save cannot live only in the
                    drawer: a merchant who never opens one would have no way to keep
                    their work. It floats over the preview whenever there is something
                    unsaved. */}
                {dirty && selection?.kind !== 'content' && (
                    <div className="absolute bottom-5 right-5 z-30 flex items-center gap-3">
                        {error && (
                            <span className="rounded-lg bg-[var(--md-sys-color-error-container)] px-3 py-1.5 text-[12px] text-[var(--md-sys-color-on-error-container)] shadow">
                                {error}
                            </span>
                        )}
                        <button
                            onClick={onSave}
                            disabled={saving}
                            className="h-10 rounded-full bg-[var(--md-sys-color-primary)] px-5 text-[13px] font-semibold text-[var(--md-sys-color-on-primary)] shadow-lg disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : saved ? 'Saved' : 'Save changes'}
                        </button>
                    </div>
                )}
                {/* Clicking an image in the preview opens this. URL first, upload
                    second: a merchant migrating a site already has their images
                    hosted somewhere. */}
                <ImagePicker
                    open={!!picker}
                    value={picker?.value ?? ''}
                    storeId={storeId}
                    pathPrefix={`${storeId}/editor`}
                    onPick={applyImage}
                    onClose={() => setPicker(null)}
                />

                {previewToken ? (
                    <iframe
                        ref={iframeRef}
                        src={debouncedSrc}
                        className="w-full h-full border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)]"
                        title="Site preview"
                    />
                ) : (
                    <div className="w-full h-full rounded-xl border border-[var(--md-sys-color-outline-variant)] flex items-center justify-center">
                        <p className="text-[13px] text-[var(--md-sys-color-on-surface-variant)]">
                            The preview is unavailable. Your changes still save normally.
                        </p>
                    </div>
                )}
            </div>

            {/* ── Drawer: slides over the preview. Wide enough for the Content form,
                   which was the thing actually suffering in a narrow rail. ── */}
            {selection && (
                <div
                    className="absolute inset-y-0 left-56 z-20 w-[26rem] flex flex-col
                               bg-[var(--md-sys-color-surface)]
                               border-r border-[var(--md-sys-color-outline-variant)]
                               shadow-xl"
                >
                    <header className="shrink-0 flex items-center justify-between gap-2 px-4 h-14 border-b border-[var(--md-sys-color-outline-variant)]">
                        <h2 className="text-[14px] font-semibold text-[var(--md-sys-color-on-surface)] truncate">
                            {active.label}
                        </h2>
                        <button
                            onClick={() => setSelection(null)}
                            aria-label="Close"
                            className="shrink-0 w-8 h-8 grid place-items-center rounded-full text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container)]"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </header>

                    <div className="flex-1 min-h-0 overflow-y-auto p-4">
                        {selection.kind === 'content' ? (
                            // SP5's editor, reused wholesale. It owns its own save (it
                            // writes stores.settings through updateStoreSettings), so it
                            // is mounted as-is rather than folded into this page's Save.
                            <ContentClient
                                slug={slug}
                                storeId={storeId}
                                initialSettings={storeSettings}
                            />
                        ) : (
                            <SettingsFields
                                schema={active.schema}
                                values={active.values}
                                storeId={storeId}
                                pathPrefix={selection.kind === 'theme' ? 'theme' : `sections/${selection.index}`}
                                onChange={(id, value) => {
                                    if (selection.kind === 'theme') {
                                        setThemeValues((v) => ({ ...v, [id]: value }))
                                    } else if (selection.kind === 'section') {
                                        setSections((prev) => {
                                            const next = [...prev]
                                            next[selection.index] = {
                                                ...next[selection.index],
                                                settings: { ...next[selection.index].settings, [id]: value },
                                            }
                                            return next
                                        })
                                    }
                                    setSaved(false)
                                }}
                            />
                        )}
                    </div>

                    {/* Save floats over the preview instead of living here, so that a
                        merchant editing directly in the page (never opening a drawer)
                        still has one. The Content drawer saves itself. */}
                </div>
            )}
        </div>
    )
}

function RailItem({
    label, active, onClick, icon,
}: {
    label: string
    active: boolean
    onClick: () => void
    icon?: React.ReactNode
}) {
    return (
        <button
            onClick={onClick}
            className={[
                'w-full flex items-center gap-2 text-left px-3 h-9 rounded-lg text-[13px] transition-colors',
                active
                    ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] font-medium'
                    : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container)]',
            ].join(' ')}
        >
            {icon}
            <span className="truncate">{label}</span>
        </button>
    )
}

/**
 * The storefront decodes the preview payload with Buffer.from(x, 'base64url'), so
 * this must produce base64URL, not base64.
 *
 * It must also survive non-Latin1 copy: bare btoa() THROWS on a single accented
 * character, which would break the preview for any merchant not writing in ASCII.
 * So UTF-8 encode first.
 */
function toBase64Url(input: string): string {
    const bytes = new TextEncoder().encode(input)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * store_themes column -> the --sf-* var the storefront reads.
 *
 * The regex alone is WRONG for four of them: the storefront reads --sf-font-heading
 * and --sf-font-body (not --sf-heading-font), so those flip. Verified against the
 * cssVars block in apps/storefront/app/store/[slug]/layout.tsx.
 */
const CSS_VAR_NAMES: Record<string, string> = {
    heading_font: 'font-heading',
    body_font: 'font-body',
    font_scale: 'font-scale',
    border_radius: 'border-radius',
}

function cssVarName(columnId: string): string {
    const explicit = CSS_VAR_NAMES[columnId]
    if (explicit) return explicit
    return columnId
        .replace(/_color$/, '')
        .replace(/^dark_/, 'dark-')
        .replace(/_/g, '-')
}
