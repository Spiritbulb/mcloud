import { test } from 'node:test'
import assert from 'node:assert/strict'
import { brandPatch, draftFromStore, isBrandDirty, themeSummary } from './brand-logic.ts'

const d = draftFromStore({ logo_url: 'https://x/logo.png', icon_url: null }, { logoPath: 'a/logo/logo.png' })

test('dirty only when a field differs', () => {
    assert.equal(isBrandDirty(d, { ...d }), false)
    assert.equal(isBrandDirty(d, { ...d, iconUrl: 'https://x/i.png' }), true)
})

test('patch maps empty values to null and keeps paths in the settings merge', () => {
    const p = brandPatch(d)
    assert.deepEqual(p.columns, { logo_url: 'https://x/logo.png', icon_url: null })
    assert.deepEqual(p.settings, {
        logoPath: 'a/logo/logo.png', logoDarkUrl: null, logoDarkPath: null, logoSize: 'md', iconPath: null, colorMode: 'auto',
    })
})

test('patch never touches hero or gallery keys', () => {
    for (const k of Object.keys(brandPatch(d).settings)) assert.ok(!/hero|gallery|slides/i.test(k), k)
})

test('theme summary falls back and rejects non-hex colours', () => {
    const s = themeSummary({ primary_color: 'red; background:url(x)', accent_color: '#abc', heading_font: ' Lora ' })
    assert.equal(s.swatches[0].color, '#1c2228')
    assert.equal(s.swatches[2].color, '#abc')
    assert.equal(s.headingFont, 'Lora')
    assert.equal(s.bodyFont, 'Inter')
    assert.equal(themeSummary(null).swatches.length, 4)
})

test('draft reads size and mode safely and flags changes to them', () => {
    const x = draftFromStore({ logo_url: null, icon_url: null }, { logoSize: 'huge', colorMode: 'dark', logoDarkUrl: 'https://x/d.png' })
    assert.equal(x.logoSize, 'md')
    assert.equal(x.colorMode, 'dark')
    assert.equal(x.logoDarkUrl, 'https://x/d.png')
    assert.equal(isBrandDirty(x, { ...x, logoSize: 'lg' }), true)
    assert.equal(isBrandDirty(x, { ...x, colorMode: 'light' }), true)
})
