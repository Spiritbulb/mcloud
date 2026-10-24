// The Editor's document and history. Pure: no React, no registry, no network,
// so every rule here is unit-tested (editor-state.test.ts).
//
// One document holds everything the Editor changes:
//   theme    -> store_themes columns
//   sections -> pages.sections for the home page
//   settings -> stores.settings (hero slides, mission, programs, campaigns ...)
//
// The sidebar and the image picker edit it through the same actions, and undo/redo
// covers all of them. The preview only displays it.

import { authoredSlides } from '@/lib/hero'
import { draftFromSettings, settingsFromDraft, validateDraft } from '@/lib/content-draft'
import { applySectionOp, type Section, type SectionOp } from './section-ops'
import { applyItemOp, type ItemOp } from './item-ops'
import { seedRecord } from './section-seeds'

export type { Section }
export type Settings = Record<string, unknown>

export type EditorDoc = {
    theme: Record<string, unknown>
    sections: Section[]
    settings: Settings
}

export type EditorState = {
    /** What the database holds, as far as this tab knows. Dirty = present differs from it. */
    saved: EditorDoc
    present: EditorDoc
    past: EditorDoc[]
    future: EditorDoc[]
    /** Coalescing key of the last edit, so a run of keystrokes in one field is one undo step. */
    lastKey: string | null
    /** Bumped on every change, so a caller can tell whether anything happened since a moment. */
    version: number
}

export type EditorAction =
    | { type: 'theme'; id: string; value: unknown }
    | { type: 'section-field'; index: number; field: string; value: unknown }
    /** `section` is the seeded section for an `add`; the reducer stays registry-free. */
    | { type: 'section-op'; op: SectionOp; section?: Section }
    | { type: 'setting'; key: string; value: unknown }
    | { type: 'item-edit'; list: string; index: number; key: string; value: unknown }
    | { type: 'item-op'; list: string; op: ItemOp }
    | { type: 'undo' }
    | { type: 'redo' }
    | { type: 'discard' }
    /** A save finished. Each part is marked saved only if its write succeeded. */
    | { type: 'saved'; snapshot: EditorDoc; theme: boolean; sections: boolean; settingsPatch: Settings | null }

/** Settings written through content-draft's normaliser (trimmed, blank rows dropped, numbers parsed). */
const CONTENT_KEYS = new Set(['missionHeadline', 'mission', 'programs', 'impactStats', 'contact', 'campaigns'])

const HISTORY_LIMIT = 100

export function initEditor(doc: EditorDoc): EditorState {
    return { saved: doc, present: doc, past: [], future: [], lastKey: null, version: 0 }
}

/**
 * The current value of a repeated list, ready to be edited.
 *
 * heroSlides is the special one: a legacy store has flat hero keys and NO heroSlides,
 * so an edit to heroSlides[0] would land in an empty array and vanish. It is
 * normalised into slides the first time it is touched, by authoredSlides(), the one
 * owner of that fallback chain (lib/hero.ts).
 */
export function listFor(list: string, settings: Settings): unknown[] {
    if (Array.isArray(settings[list])) return [...(settings[list] as unknown[])]
    if (list === 'heroSlides') return authoredSlides(settings)
    return []
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
    switch (action.type) {
        case 'undo': {
            const prev = state.past[state.past.length - 1]
            if (!prev) return state
            return { ...state, present: prev, past: state.past.slice(0, -1), future: [state.present, ...state.future], lastKey: null, version: state.version + 1 }
        }
        case 'redo': {
            const next = state.future[0]
            if (!next) return state
            return { ...state, present: next, past: [...state.past, state.present], future: state.future.slice(1), lastKey: null, version: state.version + 1 }
        }
        case 'discard':
            if (!isDocDirty(state)) return state
            return commit(state, state.saved, null)
        case 'saved':
            return markSaved(state, action)
        default: {
            const next = applyEdit(state.present, action)
            if (next === state.present) return state
            return commit(state, next, keyOf(action))
        }
    }
}

/** Push `next` as the present. A run of edits with the same key replaces the last step instead of adding one. */
function commit(state: EditorState, next: EditorDoc, key: string | null): EditorState {
    if (key !== null && key === state.lastKey && state.past.length > 0) {
        return { ...state, present: next, future: [], version: state.version + 1 }
    }
    const past = [...state.past, state.present].slice(-HISTORY_LIMIT)
    return { ...state, present: next, past, future: [], lastKey: key, version: state.version + 1 }
}

function keyOf(action: EditorAction): string | null {
    switch (action.type) {
        case 'theme': return `theme:${action.id}`
        case 'section-field': return `section:${action.index}:${action.field}`
        case 'setting': return `setting:${action.key}`
        case 'item-edit': return `item:${action.list}:${action.index}:${action.key}`
        // Structural changes are always their own step.
        default: return null
    }
}

function applyEdit(doc: EditorDoc, action: EditorAction): EditorDoc {
    switch (action.type) {
        case 'theme':
            if (doc.theme[action.id] === action.value) return doc
            return { ...doc, theme: { ...doc.theme, [action.id]: action.value } }

        case 'section-field': {
            const s = doc.sections[action.index]
            if (!s || s.settings?.[action.field] === action.value) return doc
            const sections = [...doc.sections]
            sections[action.index] = { ...s, settings: { ...s.settings, [action.field]: action.value } }
            return { ...doc, sections }
        }

        case 'section-op': {
            if (action.op.op === 'add' && !action.section) return doc
            const section = action.section
            const sections = applySectionOp(doc.sections, action.op, () => structuredClone(section!))
            return sections === doc.sections ? doc : { ...doc, sections }
        }

        case 'setting':
            if (doc.settings[action.key] === action.value) return doc
            return { ...doc, settings: { ...doc.settings, [action.key]: action.value } }

        case 'item-edit': {
            const arr = listFor(action.list, doc.settings)
            const item = arr[action.index]
            // An index past the end (a stale panel after an undo) is dropped rather
            // than growing a hole.
            if (!item || typeof item !== 'object') return doc
            if ((item as Record<string, unknown>)[action.key] === action.value) return doc
            arr[action.index] = { ...(item as Record<string, unknown>), [action.key]: action.value }
            return { ...doc, settings: { ...doc.settings, [action.list]: arr } }
        }

        case 'item-op': {
            const arr = listFor(action.list, doc.settings)
            const next = applyItemOp(arr, action.op, seedRecord)
            if (next === arr) return doc
            return { ...doc, settings: { ...doc.settings, [action.list]: next } }
        }

        default:
            return doc
    }
}

function markSaved(
    state: EditorState,
    { snapshot, theme, sections, settingsPatch }: Extract<EditorAction, { type: 'saved' }>,
): EditorState {
    const saved: EditorDoc = {
        theme: theme ? snapshot.theme : state.saved.theme,
        sections: sections ? snapshot.sections : state.saved.sections,
        settings: settingsPatch ? { ...state.saved.settings, ...settingsPatch } : state.saved.settings,
    }
    // The server stored the NORMALISED content (trimmed, numbers parsed). Adopt it in
    // the present too, or the editor would stay dirty over "500, 1000" vs [500, 1000].
    // Only for keys the merchant has not touched again since the save began.
    let present = state.present
    if (settingsPatch) {
        const settings = { ...present.settings }
        for (const [k, v] of Object.entries(settingsPatch)) {
            if (sameValue(present.settings[k], snapshot.settings[k])) settings[k] = v
        }
        present = { ...present, settings }
    }
    return { ...state, saved, present, lastKey: null, version: state.version + 1 }
}

/**
 * The stores.settings keys to write: those that differ from what was saved, with
 * content keys normalised the way the Content editor always saved them. The server
 * merges this onto the CURRENT row, so keys this tab never touched are never sent,
 * and a change saved from another screen meanwhile is not overwritten.
 */
export function settingsPatch(saved: Settings, current: Settings): Settings {
    const touched = [...new Set([...Object.keys(saved), ...Object.keys(current)])]
        .filter((k) => !sameValue(saved[k], current[k]))
    if (touched.length === 0) return {}

    const out = touched.some((k) => CONTENT_KEYS.has(k))
        ? settingsFromDraft(draftFromSettings(current), current)
        : current

    const patch: Settings = {}
    for (const k of touched) {
        if (!sameValue(saved[k], out[k])) patch[k] = out[k] ?? null
    }
    return patch
}

/**
 * Problems that would make saved content silently fail on the live site (a campaign
 * with no title vanishes; one with no amounts can never take money). Only checked
 * when campaigns changed, so an untouched legacy campaign never blocks a theme save.
 */
export function contentErrors(saved: Settings, current: Settings): string[] {
    if (sameValue(saved.campaigns, current.campaigns)) return []
    return validateDraft(draftFromSettings(current))
}

export function isDocDirty(state: EditorState): boolean {
    return !sameValue(state.saved, state.present)
}

/**
 * Theme columns that changed. The columns cannot be empty, so a cleared field means
 * "back to the default" and sends the schema default.
 */
export function themePatch(
    saved: Record<string, unknown>,
    current: Record<string, unknown>,
    fields: readonly { id: string; default?: unknown }[],
): Record<string, string> {
    const patch: Record<string, string> = {}
    for (const f of fields) {
        const v = current[f.id]
        const blank = v === undefined || v === null || v === ''
        // Blank and never set: the column keeps its own default, nothing to send.
        if (blank && (saved[f.id] === undefined || saved[f.id] === null || saved[f.id] === '')) continue
        const value = blank ? f.default : v
        if (value === undefined) continue
        if (String(saved[f.id] ?? '') !== String(value)) patch[f.id] = String(value)
    }
    return patch
}

/**
 * Where the section at `index` is after `op`, or null if it was deleted. Keeps the
 * open section panel on the same section when the page is rearranged under it.
 */
export function remapIndex(index: number, op: SectionOp): number | null {
    switch (op.op) {
        case 'move':
            if (index === op.index) return op.to
            if (op.index < index && op.to >= index) return index - 1
            if (op.index > index && op.to <= index) return index + 1
            return index
        case 'delete':
            if (index === op.index) return null
            return op.index < index ? index - 1 : index
        case 'duplicate':
            return op.index < index ? index + 1 : index
        case 'add':
            return op.index <= index ? index + 1 : index
        default:
            return index
    }
}

/** Deep equality over plain JSON-ish data. Key order does not matter; undefined equals a missing key. */
export function sameValue(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (a == null && b == null) return true
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
    if (Array.isArray(a) !== Array.isArray(b)) return false
    if (Array.isArray(a)) {
        const bb = b as unknown[]
        return a.length === bb.length && a.every((v, i) => sameValue(v, bb[i]))
    }
    const ra = a as Record<string, unknown>
    const rb = b as Record<string, unknown>
    const keys = new Set([...Object.keys(ra), ...Object.keys(rb)])
    for (const k of keys) if (!sameValue(ra[k], rb[k])) return false
    return true
}
