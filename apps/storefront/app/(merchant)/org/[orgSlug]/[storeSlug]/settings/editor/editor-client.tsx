'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, buttonClass } from '@mcloud/ui/kit/button'
import { ConfirmDialog } from '@mcloud/ui/kit/confirm-dialog'
import { Icon } from '@mcloud/ui/kit/icon'
import { Notice } from '@mcloud/ui/kit/notice'
import { Spinner } from '@mcloud/ui/kit/skeleton'
import { cn } from '@mcloud/ui/utils'
import type { SettingField } from '@mcloud/verticals'
import type { Plan } from '@mcloud/merchant/plans'
import { SECTION_REGISTRY } from '@/lib/sections'
import { THEME_SCHEMA } from '@/lib/theme-schema'
import { patchStoreSettings, updatePageSections, updateStoreTheme } from '../actions'
import {
    contentErrors, editorReducer, initEditor, isDocDirty, listFor,
    remapIndex, sameValue, settingsPatch, themePatch,
    type EditorAction, type EditorDoc, type EditorState, type Section,
} from './editor-state'
import type { SectionOp } from './section-ops'
import type { ItemOp } from './item-ops'
import { seedSection } from './section-seeds-registry'
import { followSlideIndex } from './slide-follow'
import SettingsFields from './settings-fields'
import SectionContent, { IconAction, hasSectionContent } from './section-content'
import ImagePicker from './image-picker'
import AddSectionDialog, { SECTION_ICONS } from './add-section-dialog'
import PreviewFrame, { type Device, type PreviewHandle } from './preview-frame'
import type { PickImage } from './image-field'

type SectionDef = { label: string; description?: string; schema?: readonly SettingField[] }

/**
 * A page's section `type` is whatever is stored in the DB, so it is a plain string.
 * Look it up leniently: an unknown type (a section retired from the registry) must
 * show as an inert entry, never crash the Editor.
 */
function sectionDef(type: string | undefined): SectionDef | undefined {
    if (!type) return undefined
    return (SECTION_REGISTRY as Record<string, SectionDef>)[type]
}

/** What each vertical may add. A shop is not offered programs; an NGO is not offered products. */
const ADDABLE: Record<'shop' | 'ngo', string[]> = {
    shop: ['hero', 'collections', 'featured', 'all-products', 'services', 'gallery'],
    ngo: ['hero', 'mission', 'programs', 'impact', 'campaigns', 'contact', 'gallery'],
}

const THEME_GROUPS: { title: string; hint?: string; match: (id: string) => boolean }[] = [
    { title: 'Colours', match: (id) => id.endsWith('_color') && !id.startsWith('dark_') },
    {
        title: 'Dark mode colours',
        hint: 'Used when a visitor\'s device is set to dark mode, so the preview shows them only if yours is.',
        match: (id) => id.startsWith('dark_'),
    },
    { title: 'Typography', match: (id) => id.endsWith('_font') || id === 'font_scale' },
    { title: 'Layout', match: (id) => id === 'border_radius' },
]

/**
 * useReducer, except the latest state is readable synchronously. Messages from the
 * preview arrive between renders; reading a render's `state` there would act on a
 * stale document (the bug behind "undo restored an old copy").
 */
function useEditorState(initial: EditorDoc) {
    const [state, setState] = useState(() => initEditor(initial))
    const ref = useRef(state)
    const dispatch = useCallback((action: EditorAction) => {
        const next = editorReducer(ref.current, action)
        if (next === ref.current) return
        ref.current = next
        setState(next)
    }, [])
    return [state, dispatch, ref as React.RefObject<EditorState>] as const
}

export default function EditorClient({
    slug, storeId, theme, sections: initialSections, previewToken, storefrontOrigin,
    commerce, storeSettings, plan, liveUrl,
}: {
    slug: string
    storeId: string
    theme: Record<string, unknown>
    sections: Section[]
    previewToken: string
    storefrontOrigin: string
    /** From getVertical(store.type).commerce: decides which sections can be added. */
    commerce: boolean
    /** stores.settings: hero slides, mission, programs, campaigns ... */
    storeSettings: Record<string, unknown>
    /** NGO content editing is Hobby+. */
    plan: Plan
    liveUrl: string
}) {
    const [state, dispatch, stateRef] = useEditorState({ theme, sections: initialSections, settings: storeSettings })
    const doc = state.present
    const dirty = isDocDirty(state)

    const [tab, setTab] = useState<'sections' | 'theme'>('sections')
    const [openSection, setOpenSection] = useState<number | null>(null)
    const [device, setDevice] = useState<Device>('desktop')
    const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit')
    const [saving, setSaving] = useState(false)
    const [justSaved, setJustSaved] = useState(false)
    const [errors, setErrors] = useState<string[]>([])
    /** `undoAt`: the state version right after the removal; Undo is offered only until anything else changes. */
    const [toast, setToast] = useState<{ label: string; undoAt: number | null } | null>(null)
    const [addAt, setAddAt] = useState<number | null>(null)
    const [confirmDiscard, setConfirmDiscard] = useState(false)
    const [picker, setPicker] = useState<{ value: string; apply: (url: string) => void } | null>(null)

    const preview = useRef<PreviewHandle>(null)
    /** Last scroll position the visible preview reported, replayed into the next one. */
    const scrollY = useRef(0)
    /** The hero slide being edited, so the preview shows it (and keeps showing it after a reload). */
    const activeSlide = useRef<number | null>(null)
    /** A section just added: the next preview scrolls to it instead of restoring the old position. */
    const revealSection = useRef<number | null>(null)

    // An index can go stale under undo/redo; treat it as closed rather than crash.
    const open = openSection !== null && openSection < doc.sections.length ? openSection : null

    const pickImage: PickImage = useCallback((value, apply) => setPicker({ value, apply }), [])

    // ── Preview addressing ──────────────────────────────────────────────────────

    const buildSrc = useCallback((st: EditorState) => {
        const params = new URLSearchParams({ token: previewToken })
        if (!sameValue(st.saved.sections, st.present.sections)) params.set('preview', toBase64Url(JSON.stringify(st.present.sections)))
        const patch = settingsPatch(st.saved.settings, st.present.settings)
        if (Object.keys(patch).length) params.set('settings', toBase64Url(JSON.stringify(patch)))
        return `${storefrontOrigin}/store/${slug}/-preview?${params.toString()}`
    }, [previewToken, storefrontOrigin, slug])

    const src = useMemo(() => buildSrc(state), [buildSrc, state])
    const [load, setLoad] = useState({ src, version: 0 })
    /** The draft the preview was last asked to show. */
    const requested = useRef(src)

    // Copy and structure need the page re-rendered server-side, so reload after a
    // short pause. The swap is invisible (PreviewFrame double-buffers).
    useEffect(() => {
        if (src === requested.current) return
        const t = setTimeout(() => {
            requested.current = src
            setLoad((l) => ({ src, version: l.version + 1 }))
        }, 300)
        return () => clearTimeout(t)
    }, [src])

    // Theme values are CSS custom properties: post them, no reload.
    const themeMessage = useCallback(() => {
        const values: Record<string, string> = {}
        for (const f of THEME_SCHEMA) {
            const v = stateRef.current.present.theme[f.id]
            const value = v === undefined || v === null || v === '' ? ('default' in f ? f.default : undefined) : v
            if (value !== undefined) values[cssVarName(f.id)] = String(value)
        }
        return { type: 'mcloud:theme', values }
    }, [stateRef])

    useEffect(() => { preview.current?.post(themeMessage()) }, [doc.theme, themeMessage])

    // The preview outlines the open section, and scrolls to it when it is opened.
    const postSelect = useCallback((index: number | null, scroll: boolean) => {
        preview.current?.post({ type: 'mcloud:select-section', index: index ?? -1, scroll })
    }, [])

    function openSectionPanel(index: number) {
        setTab('sections')
        setOpenSection(index)
        postSelect(index, true)
    }

    function closeSectionPanel() {
        setOpenSection(null)
        postSelect(null, false)
    }

    /** Page the preview's carousel to a slide; remembered so the next preview opens on it. */
    const showSlide = useCallback((index: number) => {
        activeSlide.current = index
        preview.current?.post({ type: 'mcloud:show-slide', index })
    }, [])

    // ── Edits that touch structure ──────────────────────────────────────────────

    const sectionOp = useCallback((op: SectionOp) => {
        const before = stateRef.current.present.sections
        if (op.op === 'delete' && before.length <= 1) {
            setToast({ label: 'A page needs at least one section.', undoAt: null })
            return
        }
        const action: EditorAction = op.op === 'add'
            ? { type: 'section-op', op, section: seedSection(op.sectionType) }
            : { type: 'section-op', op }
        dispatch(action)
        setOpenSection((i) => (i === null ? null : remapIndex(i, op)))
        if (op.op === 'delete') {
            const label = sectionDef(before[op.index]?.type)?.label ?? 'Section'
            setToast({ label: `${label} removed.`, undoAt: stateRef.current.version })
        }
    }, [dispatch, stateRef])

    const itemOp = useCallback((list: string, op: ItemOp) => {
        const before = listFor(list, stateRef.current.present.settings).length
        dispatch({ type: 'item-op', list, op })
        const after = listFor(list, stateRef.current.present.settings).length
        if (list === 'heroSlides') showSlide(followSlideIndex(op, after))
        if (op.op === 'delete' && after < before) {
            setToast({ label: list === 'heroSlides' ? 'Slide removed.' : 'Item removed.', undoAt: stateRef.current.version })
        }
    }, [dispatch, stateRef, showSlide])

    // Sidebar list edits go through itemOp too, so slide-follow and the undo toast apply.
    const sidebarDispatch = useCallback((action: EditorAction) => {
        if (action.type === 'item-op') itemOp(action.list, action.op)
        else dispatch(action)
    }, [dispatch, itemOp])

    // ── Saving ──────────────────────────────────────────────────────────────────

    // A ref, not the `saving` state: two quick Ctrl+S presses land before a re-render.
    const inFlight = useRef(false)
    const save = useCallback(async () => {
        const st = stateRef.current
        if (inFlight.current || !isDocDirty(st)) return
        const snapshot = st.present
        const base = st.saved

        // A campaign that would silently vanish or never take money is caught here,
        // because the live site will not complain.
        const problems = contentErrors(base.settings, snapshot.settings)
        if (problems.length) {
            setErrors(problems)
            return
        }

        inFlight.current = true
        setSaving(true)
        setErrors([])
        const ok = { error: null as string | null }
        const theme = themePatch(base.theme, snapshot.theme, THEME_SCHEMA)
        const settings = settingsPatch(base.settings, snapshot.settings)
        const sectionsChanged = !sameValue(base.sections, snapshot.sections)

        const [a, b, c] = await Promise.all([
            Object.keys(theme).length ? updateStoreTheme(slug, theme) : ok,
            sectionsChanged ? updatePageSections(slug, '', snapshot.sections) : ok,
            Object.keys(settings).length ? patchStoreSettings(slug, settings) : ok,
        ]).catch((e: unknown) => {
            const failed = { error: e instanceof Error ? e.message : 'Could not reach the server.' }
            return [failed, failed, failed]
        })

        // Each part is marked saved only if its write succeeded; the draft is kept
        // on failure, so the merchant never loses what they typed.
        dispatch({ type: 'saved', snapshot, theme: !a.error, sections: !b.error, settingsPatch: c.error ? null : settings })
        inFlight.current = false
        setSaving(false)
        const failed = [...new Set([a.error, b.error, c.error].filter((e): e is string => !!e))]
        if (failed.length) setErrors(failed)
        else {
            setJustSaved(true)
            setTimeout(() => setJustSaved(false), 2500)
        }
    }, [slug, dispatch, stateRef])

    const undo = useCallback(() => dispatch({ type: 'undo' }), [dispatch])
    const redo = useCallback(() => dispatch({ type: 'redo' }), [dispatch])

    // ── Messages from the preview ───────────────────────────────────────────────
    // The preview only displays, so it reports clicks, scroll and shortcuts. Every
    // value is checked, not trusted: the message comes from the framed storefront.

    function onPreviewMessage(data: Record<string, unknown>) {
        switch (data.type) {
            case 'mcloud:scroll':
                if (typeof data.y === 'number') scrollY.current = data.y
                return
            case 'mcloud:shortcut':
                if (data.key === 'save') void save()
                else if (data.key === 'undo') undo()
                else if (data.key === 'redo') redo()
                return
            case 'mcloud:section-click': {
                const index = data.index
                if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= stateRef.current.present.sections.length) return
                setTab('sections')
                setOpenSection(index as number)
                setMobilePane('edit')
                return
            }
        }
    }

    // A fresh preview page: replay what it cannot know (unsaved theme, scroll, outline).
    function onPreviewReady(post: (msg: Record<string, unknown>) => void, data: Record<string, unknown>) {
        post(themeMessage())
        // Scroll and outline belong to the bridge; the theme listener's announcement
        // may arrive before the bridge is listening.
        if (data.from !== 'bridge') return
        if (revealSection.current !== null) {
            post({ type: 'mcloud:select-section', index: revealSection.current, scroll: true })
            revealSection.current = null
            return
        }
        post({ type: 'mcloud:scroll-to', y: scrollY.current })
        // PreviewFrame always calls the latest render's handler, so `open` is current.
        if (open !== null) post({ type: 'mcloud:select-section', index: open, scroll: false })
        if (activeSlide.current !== null) post({ type: 'mcloud:show-slide', index: activeSlide.current })
    }

    // ── Keyboard, leaving with unsaved work, toast ──────────────────────────────

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (!(e.metaKey || e.ctrlKey) || e.altKey) return
            const k = e.key.toLowerCase()
            if (k === 's') {
                e.preventDefault()
                void save()
                return
            }
            // Inside a text box, undo belongs to the box.
            const t = e.target as HTMLElement | null
            if (t && (t.closest('input, textarea, select') || t.isContentEditable)) return
            if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
            else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo() }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [save, undo, redo])

    useEffect(() => {
        if (!dirty) return
        const warn = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', warn)
        return () => window.removeEventListener('beforeunload', warn)
    }, [dirty])

    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 6000)
        return () => clearTimeout(t)
    }, [toast])

    // ── Render ──────────────────────────────────────────────────────────────────

    const addable = (commerce ? ADDABLE.shop : ADDABLE.ngo).map((type) => ({
        type,
        label: sectionDef(type)?.label ?? type,
        description: sectionDef(type)?.description,
    }))
    const canUndoToast = toast?.undoAt != null && toast.undoAt === state.version

    return (
        <div className="flex h-full min-h-0 flex-col bg-background">
            {/* ── Toolbar ── */}
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Icon name="home" size={16} className="text-muted-foreground" />
                    <span className="truncate text-[13px] font-medium">Home page</span>
                </div>

                <div className="mx-auto hidden items-center rounded-md border border-border bg-muted/40 p-0.5 md:flex" role="group" aria-label="Preview size">
                    {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
                        <button
                            key={d}
                            type="button"
                            aria-pressed={device === d}
                            title={d === 'desktop' ? 'Desktop' : d === 'tablet' ? 'Tablet' : 'Mobile'}
                            onClick={() => setDevice(d)}
                            className={cn(
                                'grid h-7 w-8 place-items-center rounded transition-colors',
                                device === d ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Icon name={d === 'desktop' ? 'desktop_windows' : d === 'tablet' ? 'tablet' : 'smartphone'} size={16} />
                        </button>
                    ))}
                </div>

                <div className="ml-auto flex items-center gap-1 md:ml-0">
                    <div className="mr-1 flex rounded-md border border-border bg-muted/40 p-0.5 md:hidden" role="group" aria-label="Show">
                        {(['edit', 'preview'] as const).map((p) => (
                            <button
                                key={p}
                                type="button"
                                aria-pressed={mobilePane === p}
                                onClick={() => setMobilePane(p)}
                                className={cn('h-7 rounded px-2.5 text-[12px] font-medium', mobilePane === p ? 'bg-card shadow-sm' : 'text-muted-foreground')}
                            >
                                {p === 'edit' ? 'Edit' : 'Preview'}
                            </button>
                        ))}
                    </div>
                    <IconAction icon="undo" label="Undo (Ctrl+Z)" onClick={undo} disabled={state.past.length === 0} className="h-8 w-8" />
                    <IconAction icon="redo" label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={state.future.length === 0} className="h-8 w-8" />
                    <span className="mx-2 hidden text-[12px] text-muted-foreground lg:inline" role="status">
                        {saving ? 'Saving…' : justSaved ? 'All changes saved' : dirty ? 'Unsaved changes' : ''}
                    </span>
                    <a href={liveUrl} target="_blank" rel="noreferrer" className={cn(buttonClass('ghost'), 'hidden sm:inline-flex')}>
                        <Icon name="open_in_new" size={15} />
                        View site
                    </a>
                    {dirty && !saving && (
                        <Button variant="ghost" onClick={() => setConfirmDiscard(true)}>Discard</Button>
                    )}
                    <Button variant="primary" onClick={() => void save()} disabled={!dirty || saving} title="Save (Ctrl+S)">
                        {saving ? <Spinner size={13} /> : justSaved && !dirty ? <Icon name="check" size={15} /> : null}
                        {saving ? 'Saving…' : justSaved && !dirty ? 'Saved' : 'Save'}
                    </Button>
                </div>
            </header>

            {errors.length > 0 && (
                <div className="shrink-0 border-b border-border px-3 py-2">
                    <Notice tone="error">
                        <span className="font-medium">Not saved. </span>
                        {errors.length === 1 ? errors[0] : (
                            <span className="mt-1 block">
                                {errors.map((e) => <span key={e} className="block">{e}</span>)}
                            </span>
                        )}
                    </Notice>
                </div>
            )}

            <div className="flex min-h-0 flex-1">
                {/* ── Sidebar ── */}
                <aside
                    className={cn(
                        // On the right: the settings shell's own nav already sits on the left.
                        'flex min-h-0 w-full shrink-0 flex-col border-l border-border bg-card md:order-last md:w-80',
                        mobilePane === 'preview' && 'hidden md:flex',
                    )}
                >
                    {open === null ? (
                        <>
                            <div role="tablist" className="flex shrink-0 gap-1 border-b border-border px-3">
                                {(['sections', 'theme'] as const).map((t) => (
                                    <button
                                        key={t}
                                        role="tab"
                                        type="button"
                                        aria-selected={tab === t}
                                        onClick={() => setTab(t)}
                                        className={cn(
                                            '-mb-px border-b-2 px-2 py-2.5 text-[13px] font-medium transition-colors',
                                            tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {t === 'sections' ? 'Sections' : 'Theme'}
                                    </button>
                                ))}
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                                {tab === 'sections' ? (
                                    <SectionList
                                        sections={doc.sections}
                                        onOpen={openSectionPanel}
                                        onOp={(op) => sectionOp(op)}
                                        onAdd={() => setAddAt(doc.sections.length)}
                                    />
                                ) : (
                                    <div className="space-y-6">
                                        {THEME_GROUPS.map((g) => (
                                            <section key={g.title}>
                                                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</h3>
                                                {g.hint && <p className="-mt-1.5 mb-3 text-[12px] text-muted-foreground">{g.hint}</p>}
                                                <SettingsFields
                                                    schema={THEME_SCHEMA.filter((f) => g.match(f.id))}
                                                    values={doc.theme}
                                                    pickImage={pickImage}
                                                    onChange={(id, value) => dispatch({ type: 'theme', id, value })}
                                                />
                                            </section>
                                        ))}
                                        <p className="text-[12px] text-muted-foreground">Clear a field to go back to the theme default.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <SectionPanel
                            key={open}
                            index={open}
                            section={doc.sections[open]}
                            count={doc.sections.length}
                            settings={doc.settings}
                            plan={plan}
                            pickImage={pickImage}
                            dispatch={sidebarDispatch}
                            onShowRecord={(list, i) => { if (list === 'heroSlides') showSlide(i) }}
                            onBack={closeSectionPanel}
                            onOp={(op) => {
                                sectionOp(op)
                                if (op.op === 'move') postSelect(op.to, true)
                            }}
                        />
                    )}
                </aside>

                {/* ── Preview ── */}
                <main className={cn('relative min-w-0 flex-1 bg-muted/50 p-2 md:p-3', mobilePane === 'edit' && 'hidden md:block')}>
                    {previewToken ? (
                        <PreviewFrame
                            ref={preview}
                            src={load.src}
                            version={load.version}
                            origin={storefrontOrigin}
                            device={device}
                            onMessage={onPreviewMessage}
                            onReady={onPreviewReady}
                        />
                    ) : (
                        <div className="grid h-full place-items-center rounded-md border border-dashed border-border">
                            <p className="max-w-xs text-center text-[13px] text-muted-foreground">
                                The preview is unavailable right now. Your changes still save normally.
                            </p>
                        </div>
                    )}

                    {toast && (
                        <div role="status" className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-md bg-foreground py-1.5 pl-3.5 pr-1.5 text-[13px] text-background shadow-lg">
                            <span>{toast.label}</span>
                            {canUndoToast ? (
                                <button type="button" onClick={() => { undo(); setToast(null) }} className="h-7 rounded px-2.5 font-semibold hover:bg-background/15">
                                    Undo
                                </button>
                            ) : (
                                <button type="button" aria-label="Dismiss" onClick={() => setToast(null)} className="grid h-7 w-7 place-items-center rounded hover:bg-background/15">
                                    <Icon name="close" size={14} />
                                </button>
                            )}
                        </div>
                    )}
                </main>
            </div>

            <AddSectionDialog
                open={addAt !== null}
                choices={addable}
                onClose={() => setAddAt(null)}
                onPick={(type) => {
                    const at = addAt ?? doc.sections.length
                    setAddAt(null)
                    sectionOp({ op: 'add', index: at, sectionType: type })
                    setTab('sections')
                    setOpenSection(at)
                    revealSection.current = at
                }}
            />

            {/* Mounted per pick, so it always opens on THAT slot's image. */}
            {picker && (
                <ImagePicker
                    value={picker.value}
                    storeId={storeId}
                    onPick={(url) => { picker.apply(url); setPicker(null) }}
                    onClose={() => setPicker(null)}
                />
            )}

            <ConfirmDialog
                open={confirmDiscard}
                title="Discard unsaved changes?"
                description="Everything since your last save goes back to how it was. You can still undo this."
                confirmLabel="Discard changes"
                onCancel={() => setConfirmDiscard(false)}
                onConfirm={() => {
                    dispatch({ type: 'discard' })
                    setErrors([])
                    setConfirmDiscard(false)
                }}
            />
        </div>
    )
}

// ── Sidebar: the section list ───────────────────────────────────────────────────

function SectionList({
    sections, onOpen, onOp, onAdd,
}: {
    sections: Section[]
    onOpen: (index: number) => void
    onOp: (op: SectionOp) => void
    onAdd: () => void
}) {
    const [drag, setDrag] = useState<{ from: number; over: number | null } | null>(null)

    return (
        <div>
            <ol className="space-y-1">
                {sections.map((s, i) => {
                    const def = sectionDef(s.type)
                    const heading = typeof s.settings?.heading === 'string' ? s.settings.heading : ''
                    const dropHere = drag && drag.over === i && drag.from !== i
                    return (
                        <li
                            key={i}
                            draggable
                            onDragStart={(e) => { setDrag({ from: i, over: null }); e.dataTransfer.effectAllowed = 'move' }}
                            onDragOver={(e) => { if (drag) { e.preventDefault(); if (drag.over !== i) setDrag({ ...drag, over: i }) } }}
                            onDrop={(e) => {
                                e.preventDefault()
                                if (drag && drag.from !== i) onOp({ op: 'move', index: drag.from, to: i })
                                setDrag(null)
                            }}
                            onDragEnd={() => setDrag(null)}
                            className={cn(
                                'group relative flex items-center gap-1 rounded-md border border-transparent bg-card pr-1 transition-colors hover:border-border hover:bg-muted/40',
                                drag?.from === i && 'opacity-40',
                                dropHere && (drag!.from < i ? 'shadow-[0_2px_0_0_var(--color-primary)]' : 'shadow-[0_-2px_0_0_var(--color-primary)]'),
                            )}
                        >
                            <span className="grid h-9 w-5 cursor-grab place-items-center text-muted-foreground/60 active:cursor-grabbing" aria-hidden>
                                <Icon name="drag_indicator" size={16} />
                            </span>
                            <button
                                type="button"
                                onClick={() => onOpen(i)}
                                onKeyDown={(e) => {
                                    // Keyboard reordering, since dragging needs a mouse.
                                    if (e.altKey && e.key === 'ArrowUp' && i > 0) { e.preventDefault(); onOp({ op: 'move', index: i, to: i - 1 }) }
                                    if (e.altKey && e.key === 'ArrowDown' && i < sections.length - 1) { e.preventDefault(); onOp({ op: 'move', index: i, to: i + 1 }) }
                                }}
                                title="Alt+↑ / Alt+↓ to reorder"
                                className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
                            >
                                <Icon name={SECTION_ICONS[s.type] ?? 'view_agenda'} size={16} className="text-muted-foreground" />
                                <span className="min-w-0">
                                    <span className="block truncate text-[13px] font-medium">{def?.label ?? s.type}</span>
                                    {heading && <span className="block truncate text-[11px] text-muted-foreground">{heading}</span>}
                                </span>
                            </button>
                            <span className="flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                                <IconAction icon="content_copy" label="Duplicate section" onClick={() => onOp({ op: 'duplicate', index: i })} />
                                <IconAction icon="delete" label="Remove section" disabled={sections.length <= 1} onClick={() => onOp({ op: 'delete', index: i })} />
                            </span>
                        </li>
                    )
                })}
            </ol>
            <Button className="mt-3 w-full" onClick={onAdd}>
                <Icon name="add" size={16} />
                Add section
            </Button>
            <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
                Click a section in the preview to edit it. Drag sections here to reorder them.
            </p>
        </div>
    )
}

// ── Sidebar: one section's settings ─────────────────────────────────────────────

function SectionPanel({
    index, section, count, settings, plan, pickImage, dispatch, onShowRecord, onBack, onOp,
}: {
    index: number
    section: Section
    count: number
    settings: Record<string, unknown>
    plan: Plan
    pickImage: PickImage
    dispatch: (a: EditorAction) => void
    onShowRecord: (list: string, index: number) => void
    onBack: () => void
    onOp: (op: SectionOp) => void
}) {
    const def = sectionDef(section.type)
    const schema = def?.schema ?? []
    const content = hasSectionContent(section.type)

    return (
        <>
            <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-1.5">
                <IconAction icon="arrow_back" label="Back to sections" onClick={onBack} className="h-8 w-8" />
                <Icon name={SECTION_ICONS[section.type] ?? 'view_agenda'} size={16} className="ml-1 text-muted-foreground" />
                <h2 className="min-w-0 flex-1 truncate pl-1 text-[13px] font-semibold">{def?.label ?? section.type}</h2>
                <IconAction icon="arrow_upward" label="Move up" disabled={index === 0} onClick={() => onOp({ op: 'move', index, to: index - 1 })} />
                <IconAction icon="arrow_downward" label="Move down" disabled={index === count - 1} onClick={() => onOp({ op: 'move', index, to: index + 1 })} />
                <IconAction icon="content_copy" label="Duplicate section" onClick={() => onOp({ op: 'duplicate', index })} />
            </div>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
                {!def && (
                    <Notice tone="warning">This section type is no longer available. It still shows on your site; you can remove it.</Notice>
                )}
                {schema.length > 0 && (
                    <SettingsFields
                        schema={schema}
                        values={section.settings ?? {}}
                        pickImage={pickImage}
                        onChange={(field, value) => dispatch({ type: 'section-field', index, field, value })}
                    />
                )}
                {content && (
                    <div className={cn(schema.length > 0 && 'border-t border-border pt-5')}>
                        <SectionContent type={section.type} settings={settings} dispatch={dispatch} pickImage={pickImage} plan={plan} onShowRecord={onShowRecord} />
                    </div>
                )}
                {def && schema.length === 0 && !content && (
                    <p className="text-[13px] text-muted-foreground">{def.description ?? 'This section has nothing to configure.'}</p>
                )}
                {(def?.description && (schema.length > 0 || content)) && (
                    <p className="text-[12px] text-muted-foreground">{def.description}</p>
                )}
            </div>
            <div className="shrink-0 border-t border-border p-3">
                <Button variant="danger" className="w-full" disabled={count <= 1} onClick={() => { onOp({ op: 'delete', index }); onBack() }}>
                    <Icon name="delete" size={15} />
                    Remove section
                </Button>
            </div>
        </>
    )
}

/**
 * The storefront decodes the preview payload with Buffer.from(x, 'base64url'), so
 * this must produce base64URL. It must also survive non-Latin1 copy: bare btoa()
 * throws on a single accented character, so UTF-8 encode first.
 */
function toBase64Url(input: string): string {
    const bytes = new TextEncoder().encode(input)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * store_themes column -> the --sf-* var the storefront reads. The regex alone is
 * wrong for four of them (the storefront reads --sf-font-heading, not
 * --sf-heading-font), so those are listed.
 */
const CSS_VAR_NAMES: Record<string, string> = {
    heading_font: 'font-heading',
    body_font: 'font-body',
    font_scale: 'font-scale',
    border_radius: 'border-radius',
}

function cssVarName(columnId: string): string {
    return CSS_VAR_NAMES[columnId] ?? columnId.replace(/_color$/, '').replace(/^dark_/, 'dark-').replace(/_/g, '-')
}
