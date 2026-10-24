import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    contentErrors, editorReducer, initEditor, isDocDirty, listFor, remapIndex, settingsPatch, themePatch,
    type EditorDoc,
} from './editor-state'

const doc = (over: Partial<EditorDoc> = {}): EditorDoc => ({
    theme: { primary_color: '#111111' },
    sections: [{ type: 'hero' }, { type: 'featured', settings: { heading: 'Top' } }],
    settings: { mission: 'Wells', other: 'kept' },
    ...over,
})

test('a fresh editor is clean and has nothing to undo', () => {
    const s = initEditor(doc())
    assert.equal(isDocDirty(s), false)
    assert.equal(editorReducer(s, { type: 'undo' }), s)
})

test('typing in one field is one undo step; a different field is another', () => {
    let s = initEditor(doc())
    s = editorReducer(s, { type: 'section-field', index: 1, field: 'heading', value: 'T' })
    s = editorReducer(s, { type: 'section-field', index: 1, field: 'heading', value: 'To' })
    s = editorReducer(s, { type: 'section-field', index: 1, field: 'heading', value: 'Tops' })
    s = editorReducer(s, { type: 'theme', id: 'primary_color', value: '#222222' })
    assert.equal(s.past.length, 2)
    s = editorReducer(s, { type: 'undo' })
    assert.equal(s.present.theme.primary_color, '#111111')
    assert.equal(s.present.sections[1].settings?.heading, 'Tops')
    s = editorReducer(s, { type: 'undo' })
    assert.equal(s.present.sections[1].settings?.heading, 'Top')
    assert.equal(isDocDirty(s), false, 'undoing everything is clean again')
    s = editorReducer(s, { type: 'redo' })
    assert.equal(s.present.sections[1].settings?.heading, 'Tops')
})

test('a new edit clears the redo stack', () => {
    let s = initEditor(doc())
    s = editorReducer(s, { type: 'setting', key: 'mission', value: 'A' })
    s = editorReducer(s, { type: 'undo' })
    s = editorReducer(s, { type: 'setting', key: 'missionHeadline', value: 'B' })
    assert.equal(s.future.length, 0)
})

test('a no-op edit adds no history', () => {
    const s = initEditor(doc())
    assert.equal(editorReducer(s, { type: 'setting', key: 'mission', value: 'Wells' }), s)
    assert.equal(editorReducer(s, { type: 'section-field', index: 9, field: 'x', value: 'y' }), s)
})

test('section add uses the supplied seed, and delete is undoable', () => {
    let s = initEditor(doc())
    s = editorReducer(s, { type: 'section-op', op: { op: 'add', index: 1, sectionType: 'gallery' }, section: { type: 'gallery', settings: { limit: 8 } } })
    assert.deepEqual(s.present.sections.map((x) => x.type), ['hero', 'gallery', 'featured'])
    s = editorReducer(s, { type: 'section-op', op: { op: 'delete', index: 0 } })
    assert.deepEqual(s.present.sections.map((x) => x.type), ['gallery', 'featured'])
    s = editorReducer(s, { type: 'undo' })
    assert.deepEqual(s.present.sections.map((x) => x.type), ['hero', 'gallery', 'featured'])
})

test('two adds of the same seed are independent copies', () => {
    let s = initEditor(doc({ sections: [] }))
    const seed = { type: 'gallery', settings: { limit: 8 } }
    s = editorReducer(s, { type: 'section-op', op: { op: 'add', index: 0, sectionType: 'gallery' }, section: seed })
    s = editorReducer(s, { type: 'section-op', op: { op: 'add', index: 1, sectionType: 'gallery' }, section: seed })
    s = editorReducer(s, { type: 'section-field', index: 0, field: 'limit', value: 3 })
    assert.equal(s.present.sections[1].settings?.limit, 8)
    assert.equal(seed.settings.limit, 8)
})

test('a legacy hero is normalised into a slide on its first edit, keeping the mission copy', () => {
    const legacy = { missionHeadline: 'Clean water', mission: 'We dig wells', heroImage: 'https://x/y.jpg' }
    assert.equal(listFor('heroSlides', legacy).length, 1)
    let s = initEditor(doc({ settings: legacy }))
    s = editorReducer(s, { type: 'item-edit', list: 'heroSlides', index: 0, key: 'accent', value: 'New' })
    const slides = s.present.settings.heroSlides as Record<string, string>[]
    assert.equal(slides[0].title, 'Clean water')
    assert.equal(slides[0].subtitle, 'We dig wells')
    assert.equal(slides[0].image, 'https://x/y.jpg')
    assert.equal(slides[0].accent, 'New')
})

test('an item edit past the end is dropped, not grown into a hole', () => {
    const s = initEditor(doc({ settings: { programs: [{ title: 'A' }] } }))
    assert.equal(editorReducer(s, { type: 'item-edit', list: 'programs', index: 3, key: 'title', value: 'x' }), s)
})

test('settingsPatch sends only changed keys, normalising content', () => {
    const saved = { mission: 'Wells', campaigns: [], socials: { x: 1 } }
    const current = {
        ...saved,
        mission: '  Clean wells  ',
        campaigns: [{ id: 'c1', title: ' Water ', description: '', image: '', goalAmount: '5000', presets: '500, 1000', allowCustomAmount: true, minAmount: '' }],
    }
    const patch = settingsPatch(saved, current)
    assert.deepEqual(Object.keys(patch).sort(), ['campaigns', 'mission'])
    assert.equal(patch.mission, 'Clean wells')
    assert.deepEqual(patch.campaigns, [{ id: 'c1', title: 'Water', allowCustomAmount: true, goalAmount: 5000, presets: [500, 1000] }])
})

test('settingsPatch leaves non-content keys alone and is empty when nothing changed', () => {
    const saved = { heroSlides: [{ title: 'A' }] }
    assert.deepEqual(settingsPatch(saved, saved), {})
    const patch = settingsPatch(saved, { heroSlides: [{ title: ' B ' }] })
    assert.deepEqual(patch, { heroSlides: [{ title: ' B ' }] })
})

test('content errors only when campaigns changed', () => {
    const bad = [{ id: 'c1', title: '', presets: '', allowCustomAmount: false }]
    assert.deepEqual(contentErrors({ campaigns: bad }, { campaigns: bad, mission: 'x' }), [])
    assert.ok(contentErrors({ campaigns: [] }, { campaigns: bad }).length >= 2)
})

test('a save marks only the parts that succeeded, and adopts normalised settings', () => {
    let s = initEditor(doc())
    s = editorReducer(s, { type: 'theme', id: 'primary_color', value: '#222222' })
    s = editorReducer(s, { type: 'setting', key: 'mission', value: ' Wells and pumps ' })
    const snapshot = s.present
    s = editorReducer(s, { type: 'saved', snapshot, theme: false, sections: true, settingsPatch: { mission: 'Wells and pumps' } })
    assert.equal(s.present.settings.mission, 'Wells and pumps')
    assert.equal(s.saved.settings.other, 'kept')
    assert.equal(isDocDirty(s), true, 'the failed theme write is still unsaved')
    assert.deepEqual(themePatch(s.saved.theme, s.present.theme, [{ id: 'primary_color' }]), { primary_color: '#222222' })
})

test('an edit made while saving is not overwritten by the normalised value', () => {
    let s = initEditor(doc())
    s = editorReducer(s, { type: 'setting', key: 'mission', value: ' A ' })
    const snapshot = s.present
    s = editorReducer(s, { type: 'setting', key: 'mission', value: ' AB ' })
    s = editorReducer(s, { type: 'saved', snapshot, theme: true, sections: true, settingsPatch: { mission: 'A' } })
    assert.equal(s.present.settings.mission, ' AB ')
    assert.equal(isDocDirty(s), true)
})

test('discard returns to the saved document and can itself be undone', () => {
    let s = initEditor(doc())
    s = editorReducer(s, { type: 'section-op', op: { op: 'delete', index: 0 } })
    s = editorReducer(s, { type: 'discard' })
    assert.equal(isDocDirty(s), false)
    s = editorReducer(s, { type: 'undo' })
    assert.equal(s.present.sections.length, 1)
})

test('themePatch skips unchanged values, number or string', () => {
    const fields = [{ id: 'font_scale', default: 1 }, { id: 'heading_font', default: 'Playfair Display' }]
    assert.deepEqual(themePatch({ font_scale: 1 }, { font_scale: '1', heading_font: 'Lora' }, fields), { heading_font: 'Lora' })
})

test('themePatch sends the default for a cleared field, and nothing if it was already blank', () => {
    const fields = [{ id: 'body_font', default: 'Inter' }, { id: 'heading_font', default: 'Playfair Display' }]
    assert.deepEqual(themePatch({ body_font: 'Lora' }, { body_font: '' }, fields), { body_font: 'Inter' })
    assert.deepEqual(themePatch({}, { heading_font: '' }, fields), {})
    assert.deepEqual(themePatch({ body_font: 'Inter' }, { body_font: '' }, fields), {})
})

test('remapIndex follows the open section through moves, deletes and inserts', () => {
    assert.equal(remapIndex(2, { op: 'move', index: 2, to: 0 }), 0)
    assert.equal(remapIndex(1, { op: 'move', index: 0, to: 2 }), 0)
    assert.equal(remapIndex(1, { op: 'move', index: 3, to: 0 }), 2)
    assert.equal(remapIndex(1, { op: 'move', index: 3, to: 2 }), 1)
    assert.equal(remapIndex(1, { op: 'delete', index: 1 }), null)
    assert.equal(remapIndex(3, { op: 'delete', index: 1 }), 2)
    assert.equal(remapIndex(1, { op: 'duplicate', index: 0 }), 2)
    assert.equal(remapIndex(1, { op: 'duplicate', index: 1 }), 1)
    assert.equal(remapIndex(1, { op: 'add', index: 1, sectionType: 'gallery' }), 2)
    assert.equal(remapIndex(1, { op: 'add', index: 2, sectionType: 'gallery' }), 1)
})
